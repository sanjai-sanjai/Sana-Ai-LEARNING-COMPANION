import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Phase 4 — RAG search over indexed classroom content.
 *
 * Embeds the query with the same model used at indexing time
 * (google/gemini-embedding-001, 3072-d) and calls the `match_classroom_chunks`
 * RPC to fetch the top-k most similar chunks for this user.
 */

export type ClassroomMatch = {
  chunkId: string;
  documentId: string;
  courseId: string;
  chunkIndex: number;
  content: string;
  similarity: number;
  documentTitle: string;
  alternateLink: string | null;
  courseName: string | null;
};

export type ClassroomSearchResult = {
  matches: ClassroomMatch[];
  timings: { embedMs: number; queryMs: number; totalMs: number };
  requested: { matchCount: number; courseIds: string[] | null; query: string };
};

async function embedQuery(query: string): Promise<number[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY missing");
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "text-embedding-3-small", input: query }),
  });
  if (!res.ok) {
    throw new Error(`Embed ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const json = (await res.json()) as { data: Array<{ embedding: number[] }> };
  const vec = json.data?.[0]?.embedding;
  if (!vec) throw new Error("Empty embedding response");
  return vec;
}

export const searchClassroomChunks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: { query: string; courseIds?: string[]; matchCount?: number }) => data,
  )
  .handler(async ({ data, context }): Promise<ClassroomSearchResult> => {
    const q = (data.query ?? "").trim();
    const matchCount = data.matchCount ?? 8;
    const courseIds = data.courseIds?.length ? data.courseIds : null;
    const empty: ClassroomSearchResult = {
      matches: [],
      timings: { embedMs: 0, queryMs: 0, totalMs: 0 },
      requested: { matchCount, courseIds, query: q },
    };
    if (!q) return empty;

    const { count } = await context.supabase
      .from("classroom_chunks")
      .select("id", { count: "exact", head: true })
      .eq("user_id", context.userId);
    if (!count) return empty;

    const t0 = performance.now();
    const embedding = await embedQuery(q);
    const t1 = performance.now();

    const { data: rows, error } = await context.supabase.rpc("match_classroom_chunks", {
      query_embedding: embedding as unknown as string,
      target_user_id: context.userId,
      target_course_ids: courseIds ?? undefined,
      match_count: matchCount,
    });
    const t2 = performance.now();
    if (error) throw error;

    const matches = (rows ?? []) as Array<{
      chunk_id: string;
      document_id: string;
      google_course_id: string;
      chunk_index: number;
      content: string;
      similarity: number;
      document_title: string;
      alternate_link: string | null;
    }>;

    const uniqCourseIds = Array.from(new Set(matches.map((m) => m.google_course_id).filter(Boolean)));
    let courseMap = new Map<string, string>();
    if (uniqCourseIds.length) {
      const { data: courses } = await context.supabase
        .from("classroom_courses")
        .select("google_course_id, name")
        .eq("user_id", context.userId)
        .in("google_course_id", uniqCourseIds);
      courseMap = new Map((courses ?? []).map((c: any) => [c.google_course_id, c.name]));
    }

    return {
      matches: matches.map((m) => ({
        chunkId: m.chunk_id,
        documentId: m.document_id,
        courseId: m.google_course_id,
        chunkIndex: m.chunk_index,
        content: m.content,
        similarity: m.similarity,
        documentTitle: m.document_title,
        alternateLink: m.alternate_link,
        courseName: courseMap.get(m.google_course_id) ?? null,
      })),
      timings: {
        embedMs: Math.round(t1 - t0),
        queryMs: Math.round(t2 - t1),
        totalMs: Math.round(t2 - t0),
      },
      requested: { matchCount, courseIds, query: q },
    };
  });
