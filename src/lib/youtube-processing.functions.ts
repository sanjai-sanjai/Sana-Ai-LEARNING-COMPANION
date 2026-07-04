import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { extractVideoId } from "@/lib/youtube.functions";

/* ============ Types ============ */
export type ChunkRow = {
  chunk_index: number;
  start_seconds: number;
  end_seconds: number;
  content: string;
};

/* ============ Transcript fetch (free, watch-page + timedtext) ============ */

type TranscriptSegment = { start: number; dur: number; text: string };

async function fetchWatchHtml(videoId: string): Promise<string> {
  const res = await fetch(`https://www.youtube.com/watch?v=${videoId}&hl=en&bpctr=9999999999`, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });
  if (!res.ok) throw new Error(`watch page http ${res.status}`);
  return res.text();
}

function pickCaptionTrackUrl(html: string): { url: string; lang: string } | null {
  // Look for captionTracks array
  const m = html.match(/"captionTracks":(\[.+?\])/);
  if (!m) return null;
  let tracks: any[] = [];
  try {
    tracks = JSON.parse(m[1]);
  } catch {
    return null;
  }
  if (!tracks.length) return null;
  // Prefer English, then any non-ASR, else first
  const en = tracks.find((t) => t.languageCode === "en" && t.kind !== "asr");
  const enAny = tracks.find((t) => t.languageCode === "en");
  const nonAsr = tracks.find((t) => t.kind !== "asr");
  const chosen = en ?? enAny ?? nonAsr ?? tracks[0];
  if (!chosen?.baseUrl) return null;
  return { url: chosen.baseUrl, lang: chosen.languageCode ?? "en" };
}

async function fetchTimedTextJson(baseUrl: string): Promise<TranscriptSegment[]> {
  const url = baseUrl.includes("fmt=") ? baseUrl : `${baseUrl}&fmt=json3`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0", "Accept-Language": "en-US,en;q=0.9" },
  });
  if (!res.ok) throw new Error(`timedtext http ${res.status}`);
  const body = await res.text();
  // json3
  try {
    const json = JSON.parse(body);
    const events = Array.isArray(json?.events) ? json.events : [];
    const out: TranscriptSegment[] = [];
    for (const ev of events) {
      const segs = ev?.segs;
      if (!Array.isArray(segs)) continue;
      const text = segs.map((s: any) => s?.utf8 ?? "").join("").replace(/\s+/g, " ").trim();
      if (!text) continue;
      out.push({
        start: Math.round((ev.tStartMs ?? 0) / 1000),
        dur: Math.round((ev.dDurationMs ?? 0) / 1000),
        text,
      });
    }
    if (out.length) return out;
  } catch {
    // fall through to XML parse
  }
  // XML fallback
  const xmlSegs: TranscriptSegment[] = [];
  const re = /<text[^>]*start="([^"]+)"[^>]*dur="([^"]+)"[^>]*>([\s\S]*?)<\/text>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) {
    const text = decodeHtml(m[3]).replace(/\s+/g, " ").trim();
    if (!text) continue;
    xmlSegs.push({ start: Math.round(Number(m[1])), dur: Math.round(Number(m[2])), text });
  }
  return xmlSegs;
}

function decodeHtml(s: string) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/<[^>]+>/g, "");
}

/* ============ Chunking ============ */

function buildChunks(segs: TranscriptSegment[], targetChars = 1200): ChunkRow[] {
  const chunks: ChunkRow[] = [];
  let buf: string[] = [];
  let bufStart = segs[0]?.start ?? 0;
  let bufEnd = bufStart;
  let bufLen = 0;

  const flush = () => {
    if (!buf.length) return;
    chunks.push({
      chunk_index: chunks.length,
      start_seconds: bufStart,
      end_seconds: bufEnd,
      content: buf.join(" ").trim(),
    });
    buf = [];
    bufLen = 0;
  };

  for (const s of segs) {
    if (!buf.length) bufStart = s.start;
    buf.push(s.text);
    bufLen += s.text.length + 1;
    bufEnd = s.start + s.dur;
    if (bufLen >= targetChars) flush();
  }
  flush();
  return chunks;
}

/* ============ Embeddings via OpenAI ============ */

async function embedBatch(texts: string[]): Promise<number[][]> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY missing");
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "openai/text-embedding-3-small",
      input: texts,
    }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`embeddings http ${res.status}: ${t.slice(0, 200)}`);
  }
  const json = (await res.json()) as { data: { embedding: number[]; index: number }[] };
  const out: number[][] = new Array(texts.length);
  for (const d of json.data) out[d.index] = d.embedding;
  return out;
}

/* ============ Process a YouTube video (transcript → chunks → embeddings) ============ */

const ProcessInput = z.object({ url: z.string().min(5) });

export const processYouTubeVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => ProcessInput.parse(v))
  .handler(async ({ data, context }) => {
    const videoId = extractVideoId(data.url);
    if (!videoId) throw new Error("Invalid YouTube URL");
    const { supabase, userId } = context;

    const { data: video, error: vErr } = await supabase
      .from("youtube_videos")
      .select("*")
      .eq("user_id", userId)
      .eq("video_id", videoId)
      .maybeSingle();
    if (vErr) throw vErr;
    if (!video) throw new Error("Video metadata missing — fetch metadata first");

    if (video.transcript_status === "ready" && (video.chunk_count ?? 0) > 0) {
      return {
        status: "ready" as const,
        chunk_count: video.chunk_count ?? 0,
        source: video.transcript_source ?? "captions",
        cached: true,
      };
    }

    // 1. Transcript
    let segs: TranscriptSegment[] = [];
    let source: string = "captions";
    try {
      const html = await fetchWatchHtml(videoId);
      const track = pickCaptionTrackUrl(html);
      if (track) {
        segs = await fetchTimedTextJson(track.url);
        source = track.lang === "en" ? "captions-en" : `captions-${track.lang}`;
      }
    } catch (e) {
      console.warn("[yt] transcript fetch failed", e);
    }

    if (!segs.length) {
      await supabase
        .from("youtube_videos")
        .update({
          transcript_status: "no_transcript",
          transcript_error:
            "No public captions found. Audio-transcription fallback is not yet available in this environment.",
        })
        .eq("id", video.id);
      return { status: "no_transcript" as const, chunk_count: 0, source: "none", cached: false };
    }

    // 2. Chunk
    const chunks = buildChunks(segs, 1200);
    if (!chunks.length) {
      await supabase
        .from("youtube_videos")
        .update({ transcript_status: "no_transcript", transcript_error: "Empty transcript" })
        .eq("id", video.id);
      return { status: "no_transcript" as const, chunk_count: 0, source, cached: false };
    }

    // 3. Embeddings (batch of up to 96 per request)
    try {
      // Wipe any prior partial chunks
      await supabase.from("youtube_chunks").delete().eq("video_row_id", video.id);

      const batchSize = 96;
      for (let i = 0; i < chunks.length; i += batchSize) {
        const slice = chunks.slice(i, i + batchSize);
        const vectors = await embedBatch(slice.map((c) => c.content));
        const rows = slice.map((c, idx) => ({
          user_id: userId,
          video_id: videoId,
          video_row_id: video.id,
          chunk_index: c.chunk_index,
          start_seconds: c.start_seconds,
          end_seconds: c.end_seconds,
          content: c.content,
          embedding: vectors[idx] as any,
        }));
        const { error: insErr } = await supabase.from("youtube_chunks").insert(rows);
        if (insErr) throw insErr;
      }

      await supabase
        .from("youtube_videos")
        .update({
          transcript_status: "ready",
          transcript_source: source,
          chunk_count: chunks.length,
          transcript_error: null,
        })
        .eq("id", video.id);

      return { status: "ready" as const, chunk_count: chunks.length, source, cached: false };
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      await supabase
        .from("youtube_videos")
        .update({ transcript_status: "failed", transcript_error: msg })
        .eq("id", video.id);
      throw e;
    }
  });

/* ============ Semantic search against user's video chunks ============ */

const SearchInput = z.object({
  query: z.string().min(1),
  videoIds: z.array(z.string()).min(1).max(6),
  matchCount: z.number().int().min(1).max(12).optional(),
  minStartSeconds: z.number().int().min(0).optional(),
  maxEndSeconds: z.number().int().min(0).optional(),
});

export type MatchedChunk = {
  video_id: string;
  chunk_index: number;
  start_seconds: number;
  end_seconds: number;
  content: string;
  similarity: number;
};

export const searchYouTubeChunks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => SearchInput.parse(v))
  .handler(async ({ data, context }): Promise<MatchedChunk[]> => {
    const [embedding] = await embedBatch([data.query]);
    if (!embedding) return [];
    const { data: rows, error } = await context.supabase.rpc("match_youtube_chunks", {
      query_embedding: embedding as any,
      target_user_id: context.userId,
      target_video_ids: data.videoIds,
      match_count: data.matchCount ?? 6,
      min_start_seconds: data.minStartSeconds ?? null,
      max_end_seconds: data.maxEndSeconds ?? null,
    });
    if (error) throw error;
    return (rows ?? []) as MatchedChunk[];
  });

/* ============ Sections / chapters ============ */

const SectionsInput = z.object({ videoId: z.string().min(3) });

export type VideoSection = {
  index: number;
  title: string;
  start_seconds: number;
  end_seconds: number;
  source: "chapters" | "auto";
};

// Parse "0:00 Intro" / "01:23 Chapter Two" / "1:02:33 Deep dive" lines from a description
function parseChapterLines(description: string, duration: number | null): VideoSection[] {
  const out: { title: string; start: number }[] = [];
  const re = /(?:^|\n)\s*(?:[-•]\s*)?(\d{1,2}):(\d{2})(?::(\d{2}))?\s+([^\n]+?)\s*$/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(description))) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    const c = m[3] ? Number(m[3]) : null;
    const start = c !== null ? a * 3600 + b * 60 + c : a * 60 + b;
    const title = m[4].replace(/[-–—•|]+\s*$/, "").trim();
    if (title.length < 2) continue;
    out.push({ title, start });
  }
  // A real chapter list starts at 0 and is sequential
  if (out.length < 2) return [];
  out.sort((a, b) => a.start - b.start);
  if (out[0].start > 5) return [];
  return out.map((s, i) => ({
    index: i,
    title: s.title.slice(0, 90),
    start_seconds: s.start,
    end_seconds: out[i + 1]?.start ?? duration ?? s.start + 300,
    source: "chapters" as const,
  }));
}

export const listYouTubeSections = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => SectionsInput.parse(v))
  .handler(async ({ data, context }): Promise<VideoSection[]> => {
    const { supabase, userId } = context;
    const { data: video, error: vErr } = await supabase
      .from("youtube_videos")
      .select("id,description,duration_seconds")
      .eq("user_id", userId)
      .eq("video_id", data.videoId)
      .maybeSingle();
    if (vErr) throw vErr;
    if (!video) return [];

    // 1. Prefer official chapters from the description
    if (video.description) {
      const chapters = parseChapterLines(video.description, video.duration_seconds ?? null);
      if (chapters.length >= 2) return chapters;
    }

    // 2. Fallback: derive sections from transcript chunks (~5 min buckets)
    const { data: chunks } = await supabase
      .from("youtube_chunks")
      .select("chunk_index,start_seconds,end_seconds,content")
      .eq("user_id", userId)
      .eq("video_id", data.videoId)
      .order("chunk_index");

    if (!chunks || chunks.length === 0) return [];

    const bucketSize = 300; // 5 minutes
    const buckets: Record<number, { start: number; end: number; snippet: string }> = {};
    for (const c of chunks) {
      const b = Math.floor(c.start_seconds / bucketSize);
      if (!buckets[b]) {
        buckets[b] = {
          start: c.start_seconds,
          end: c.end_seconds,
          snippet: c.content,
        };
      } else {
        buckets[b].end = Math.max(buckets[b].end, c.end_seconds);
      }
    }
    const keys = Object.keys(buckets).map(Number).sort((a, b) => a - b);
    return keys.map((k, i) => {
      const b = buckets[k];
      // Derive a short human title from the first sentence in the bucket
      const first = b.snippet.split(/(?<=[.!?])\s+/)[0] ?? b.snippet;
      const title = first.replace(/\s+/g, " ").trim().slice(0, 70) || `Section ${i + 1}`;
      return {
        index: i,
        title,
        start_seconds: b.start,
        end_seconds: b.end,
        source: "auto" as const,
      };
    });
  });

