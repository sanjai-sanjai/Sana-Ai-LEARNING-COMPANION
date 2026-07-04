import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Phase 3 — Document pipeline.
 *
 * 1. discoverClassroomDocuments: walks synced coursework/materials/announcements
 *    for the given courses, collects every Drive/Docs/Slides attachment, and
 *    upserts a `classroom_documents` row (status='pending') per file.
 * 2. indexNextClassroomDocuments: processes a small batch of pending documents —
 *    fetches text via Drive export / Docs / Slides APIs, chunks, embeds via the
 *    Lovable AI Gateway, and stores chunks in `classroom_chunks`.
 * 3. getClassroomIndexStats: quick counts for the UI.
 *
 * The UI calls (1) once, then repeatedly calls (2) until `remaining` hits 0,
 * driving an animated progress bar.
 */

type ConnRow = { access_token: string; refresh_token: string | null; token_expires_at: string | null };

async function loadConn(supabase: any, userId: string): Promise<ConnRow> {
  const { data, error } = await supabase
    .from("classroom_connections")
    .select("access_token, refresh_token, token_expires_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Not connected to Google Classroom");
  return data as ConnRow;
}

async function refreshAccessToken(refreshToken: string) {
  const clientId = process.env.GOOGLE_CLASSROOM_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLASSROOM_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Google OAuth env missing");
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`Token refresh failed: ${await res.text()}`);
  return res.json() as Promise<{ access_token: string; expires_in: number }>;
}

async function getValidAccessToken(supabase: any, userId: string): Promise<string> {
  const conn = await loadConn(supabase, userId);
  const exp = conn.token_expires_at ? new Date(conn.token_expires_at).getTime() : 0;
  if (exp && exp - Date.now() > 60_000) return conn.access_token;
  if (!conn.refresh_token) throw new Error("Google session expired. Please reconnect.");
  const r = await refreshAccessToken(conn.refresh_token);
  const newExp = new Date(Date.now() + r.expires_in * 1000).toISOString();
  await supabase
    .from("classroom_connections")
    .update({ access_token: r.access_token, token_expires_at: newExp })
    .eq("user_id", userId);
  return r.access_token;
}

// ─────────────────────────── Discovery ───────────────────────────

type MaterialAttachment = {
  driveFile?: { driveFile?: { id: string; title?: string; alternateLink?: string } };
};

function extractDriveFiles(
  materials: unknown,
): Array<{ id: string; title: string; alternateLink?: string }> {
  if (!Array.isArray(materials)) return [];
  const out: Array<{ id: string; title: string; alternateLink?: string }> = [];
  for (const m of materials as MaterialAttachment[]) {
    const df = m?.driveFile?.driveFile;
    if (df?.id) {
      out.push({
        id: df.id,
        title: df.title || "Untitled",
        alternateLink: df.alternateLink,
      });
    }
  }
  return out;
}

export const discoverClassroomDocuments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { courseIds: string[] }) => data)
  .handler(async ({ data, context }) => {
    if (!data.courseIds.length) return { discovered: 0 };

    const { supabase, userId } = context;

    // Pull everything that could carry an attachment for these courses.
    const [cwRes, matRes, anRes] = await Promise.all([
      supabase
        .from("classroom_coursework")
        .select("google_course_id, google_coursework_id, materials")
        .eq("user_id", userId)
        .in("google_course_id", data.courseIds),
      supabase
        .from("classroom_materials")
        .select("google_course_id, google_material_id, materials")
        .eq("user_id", userId)
        .in("google_course_id", data.courseIds),
      supabase
        .from("classroom_announcements")
        .select("google_course_id, google_announcement_id, materials")
        .eq("user_id", userId)
        .in("google_course_id", data.courseIds),
    ]);

    type DocRow = {
      user_id: string;
      google_course_id: string;
      source_type: string;
      source_id: string;
      drive_file_id: string;
      title: string;
      alternate_link: string | null;
    };
    const rows: DocRow[] = [];
    const seen = new Set<string>();
    const push = (
      courseId: string,
      sourceType: string,
      sourceId: string,
      files: ReturnType<typeof extractDriveFiles>,
    ) => {
      for (const f of files) {
        if (seen.has(f.id)) continue;
        seen.add(f.id);
        rows.push({
          user_id: userId,
          google_course_id: courseId,
          source_type: sourceType,
          source_id: sourceId,
          drive_file_id: f.id,
          title: f.title,
          alternate_link: f.alternateLink ?? null,
        });
      }
    };

    for (const r of cwRes.data ?? []) {
      push(r.google_course_id, "coursework", r.google_coursework_id, extractDriveFiles(r.materials));
    }
    for (const r of matRes.data ?? []) {
      push(r.google_course_id, "material", r.google_material_id, extractDriveFiles(r.materials));
    }
    for (const r of anRes.data ?? []) {
      push(r.google_course_id, "announcement", r.google_announcement_id, extractDriveFiles(r.materials));
    }

    if (!rows.length) return { discovered: 0 };

    // Insert only new rows; leave existing (indexed) documents untouched.
    const { error } = await supabase
      .from("classroom_documents")
      .upsert(rows, { onConflict: "user_id,drive_file_id", ignoreDuplicates: true });
    if (error) throw error;

    return { discovered: rows.length };
  });

// ─────────────────────────── Fetch + extract ───────────────────────────

async function driveMeta(token: string, fileId: string) {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) throw new Error(`Drive meta ${res.status}`);
  return res.json() as Promise<{ id: string; name: string; mimeType: string }>;
}

async function fetchDocsText(token: string, fileId: string): Promise<string> {
  // Google Docs → structured export as plain text.
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/plain`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) throw new Error(`Docs export ${res.status}`);
  return res.text();
}

async function fetchSlidesText(token: string, fileId: string): Promise<string> {
  const res = await fetch(`https://slides.googleapis.com/v1/presentations/${fileId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Slides ${res.status}`);
  const json = (await res.json()) as {
    slides?: Array<{
      pageElements?: Array<{
        shape?: { text?: { textElements?: Array<{ textRun?: { content?: string } }> } };
      }>;
    }>;
  };
  const parts: string[] = [];
  (json.slides ?? []).forEach((slide, i) => {
    parts.push(`--- Slide ${i + 1} ---`);
    for (const el of slide.pageElements ?? []) {
      for (const te of el.shape?.text?.textElements ?? []) {
        const t = te.textRun?.content;
        if (t) parts.push(t);
      }
    }
  });
  return parts.join("\n").replace(/\n{3,}/g, "\n\n");
}

async function fetchSheetsText(token: string, fileId: string): Promise<string> {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/csv`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) throw new Error(`Sheets export ${res.status}`);
  return res.text();
}

async function fetchPlainDrive(token: string, fileId: string): Promise<string> {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) throw new Error(`Drive media ${res.status}`);
  return res.text();
}

const SUPPORTED_PLAIN_MIMES = new Set([
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
  "text/html",
]);

async function fetchDocumentText(
  token: string,
  fileId: string,
): Promise<{ text: string; mimeType: string; title: string } | { skipped: true; mimeType: string; title: string }> {
  const meta = await driveMeta(token, fileId);
  const mt = meta.mimeType;
  if (mt === "application/vnd.google-apps.document") {
    return { text: await fetchDocsText(token, fileId), mimeType: mt, title: meta.name };
  }
  if (mt === "application/vnd.google-apps.presentation") {
    return { text: await fetchSlidesText(token, fileId), mimeType: mt, title: meta.name };
  }
  if (mt === "application/vnd.google-apps.spreadsheet") {
    return { text: await fetchSheetsText(token, fileId), mimeType: mt, title: meta.name };
  }
  if (SUPPORTED_PLAIN_MIMES.has(mt)) {
    return { text: await fetchPlainDrive(token, fileId), mimeType: mt, title: meta.name };
  }
  // PDFs, images, Office docs, videos: skip in Phase 3.
  return { skipped: true, mimeType: mt, title: meta.name };
}

// ─────────────────────────── Chunking ───────────────────────────

const CHUNK_SIZE = 1200;
const CHUNK_OVERLAP = 150;

function chunkText(text: string): string[] {
  const cleaned = text.replace(/\r\n/g, "\n").replace(/[ \t]+\n/g, "\n").trim();
  if (!cleaned) return [];
  if (cleaned.length <= CHUNK_SIZE) return [cleaned];

  const chunks: string[] = [];
  const paragraphs = cleaned.split(/\n{2,}/);
  let current = "";
  for (const p of paragraphs) {
    if ((current + "\n\n" + p).length > CHUNK_SIZE && current) {
      chunks.push(current.trim());
      const tail = current.slice(Math.max(0, current.length - CHUNK_OVERLAP));
      current = tail + "\n\n" + p;
    } else {
      current = current ? current + "\n\n" + p : p;
    }
  }
  if (current.trim()) chunks.push(current.trim());

  // Hard-split any oversized chunk (e.g. dense CSVs).
  const out: string[] = [];
  for (const c of chunks) {
    if (c.length <= CHUNK_SIZE) {
      out.push(c);
    } else {
      for (let i = 0; i < c.length; i += CHUNK_SIZE - CHUNK_OVERLAP) {
        out.push(c.slice(i, i + CHUNK_SIZE));
      }
    }
  }
  return out;
}

// ─────────────────────────── Embedding ───────────────────────────

async function embedBatch(inputs: string[]): Promise<number[][]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY missing");
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "text-embedding-3-small", input: inputs }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Embed ${res.status}: ${body.slice(0, 200)}`);
  }
  const json = (await res.json()) as { data: Array<{ index: number; embedding: number[] }> };
  const ordered = new Array<number[]>(inputs.length);
  for (const d of json.data) ordered[d.index] = d.embedding;
  return ordered;
}

// ─────────────────────────── Indexer step ───────────────────────────

const BATCH_DOCS = 3;      // process at most 3 documents per call
const EMBED_BATCH = 32;    // ≤ 100 for Gemini; keep well under limits

export const getClassroomIndexStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [pendingRes, indexedRes, skippedRes, errorRes, chunkRes] = await Promise.all([
      context.supabase.from("classroom_documents").select("id", { count: "exact", head: true }).eq("user_id", context.userId).eq("status", "pending"),
      context.supabase.from("classroom_documents").select("id", { count: "exact", head: true }).eq("user_id", context.userId).eq("status", "indexed"),
      context.supabase.from("classroom_documents").select("id", { count: "exact", head: true }).eq("user_id", context.userId).eq("status", "skipped"),
      context.supabase.from("classroom_documents").select("id", { count: "exact", head: true }).eq("user_id", context.userId).eq("status", "error"),
      context.supabase.from("classroom_chunks").select("id", { count: "exact", head: true }).eq("user_id", context.userId),
    ]);
    return {
      pending: pendingRes.count ?? 0,
      indexed: indexedRes.count ?? 0,
      skipped: skippedRes.count ?? 0,
      errored: errorRes.count ?? 0,
      chunks: chunkRes.count ?? 0,
    };
  });

export const indexNextClassroomDocuments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: pending, error } = await supabase
      .from("classroom_documents")
      .select("id, drive_file_id, title")
      .eq("user_id", userId)
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(BATCH_DOCS);
    if (error) throw error;
    if (!pending?.length) {
      return { processed: 0, remaining: 0 };
    }

    const token = await getValidAccessToken(supabase, userId);

    let processed = 0;
    for (const doc of pending) {
      try {
        const fetched = await fetchDocumentText(token, doc.drive_file_id);
        if ("skipped" in fetched) {
          await supabase
            .from("classroom_documents")
            .update({
              status: "skipped",
              mime_type: fetched.mimeType,
              title: fetched.title,
              error: `Unsupported MIME type: ${fetched.mimeType}`,
              indexed_at: new Date().toISOString(),
            })
            .eq("id", doc.id);
          processed += 1;
          continue;
        }

        const chunks = chunkText(fetched.text);
        if (!chunks.length) {
          await supabase
            .from("classroom_documents")
            .update({
              status: "skipped",
              mime_type: fetched.mimeType,
              title: fetched.title,
              content_length: 0,
              error: "Empty document",
              indexed_at: new Date().toISOString(),
            })
            .eq("id", doc.id);
          processed += 1;
          continue;
        }

        // Embed in sub-batches.
        const embeddings: number[][] = [];
        for (let i = 0; i < chunks.length; i += EMBED_BATCH) {
          const batch = chunks.slice(i, i + EMBED_BATCH);
          const vecs = await embedBatch(batch);
          embeddings.push(...vecs);
        }

        // Replace any old chunks then insert the new ones.
        await supabase.from("classroom_chunks").delete().eq("document_id", doc.id);

        const chunkRows = chunks.map((content, idx) => ({
          user_id: userId,
          document_id: doc.id,
          google_course_id: (pending.find((p) => p.id === doc.id) as any)?.google_course_id ?? null,
          chunk_index: idx,
          content,
          embedding: embeddings[idx] as unknown as string,
          token_estimate: Math.ceil(content.length / 4),
        }));

        // We need google_course_id — fetch once for this doc.
        const { data: docRow } = await supabase
          .from("classroom_documents")
          .select("google_course_id")
          .eq("id", doc.id)
          .maybeSingle();
        const courseId = docRow?.google_course_id ?? "";
        for (const r of chunkRows) (r as any).google_course_id = courseId;

        const { error: insErr } = await supabase.from("classroom_chunks").insert(chunkRows as any);
        if (insErr) throw insErr;

        await supabase
          .from("classroom_documents")
          .update({
            status: "indexed",
            mime_type: fetched.mimeType,
            title: fetched.title,
            content_length: fetched.text.length,
            chunk_count: chunks.length,
            error: null,
            indexed_at: new Date().toISOString(),
          })
          .eq("id", doc.id);

        processed += 1;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Indexing failed";
        await supabase
          .from("classroom_documents")
          .update({ status: "error", error: msg.slice(0, 500), indexed_at: new Date().toISOString() })
          .eq("id", doc.id);
        processed += 1;
      }
    }

    const { count: remaining } = await supabase
      .from("classroom_documents")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "pending");

    return { processed, remaining: remaining ?? 0 };
  });
