import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const Input = z.object({ url: z.string().min(5) });

export type YouTubeVideoMeta = {
  id: string;
  video_id: string;
  url: string;
  title: string;
  description: string | null;
  thumbnail_url: string;
  channel_title: string;
  channel_id: string | null;
  duration_seconds: number | null;
  published_at: string | null;
  view_count: number | null;
  language: string | null;
  cached: boolean;
};

export function extractVideoId(raw: string): string | null {
  const url = raw.trim();
  // youtu.be/<id>
  const shortMatch = url.match(/youtu\.be\/([A-Za-z0-9_-]{6,})/);
  if (shortMatch) return shortMatch[1];
  // youtube.com/watch?v=<id>
  const vMatch = url.match(/[?&]v=([A-Za-z0-9_-]{6,})/);
  if (vMatch) return vMatch[1];
  // shorts / embed / live
  const pathMatch = url.match(/youtube\.com\/(?:shorts|embed|live|v)\/([A-Za-z0-9_-]{6,})/);
  if (pathMatch) return pathMatch[1];
  // bare id
  if (/^[A-Za-z0-9_-]{11}$/.test(url)) return url;
  return null;
}

function parseIsoDuration(d: string): number {
  const m = d.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  const [, h, mi, s] = m;
  return (Number(h ?? 0) * 3600) + (Number(mi ?? 0) * 60) + Number(s ?? 0);
}

export const fetchYouTubeMetadata = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => Input.parse(v))
  .handler(async ({ data, context }): Promise<YouTubeVideoMeta> => {
    const videoId = extractVideoId(data.url);
    if (!videoId) throw new Error("Invalid YouTube URL");

    const { supabase, userId } = context;

    // Cache check
    const { data: existing } = await supabase
      .from("youtube_videos")
      .select("*")
      .eq("user_id", userId)
      .eq("video_id", videoId)
      .maybeSingle();

    if (existing && existing.status === "ready" && existing.title) {
      await supabase
        .from("youtube_videos")
        .update({ last_opened_at: new Date().toISOString() })
        .eq("id", existing.id);
      return { ...(existing as any), cached: true };
    }

    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) throw new Error("YOUTUBE_API_KEY not configured");

    const url =
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${videoId}&key=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`YouTube API failed (${res.status}): ${txt.slice(0, 200)}`);
    }
    const json = (await res.json()) as any;
    const item = json?.items?.[0];
    if (!item) throw new Error("Video not found or is private");

    const snippet = item.snippet ?? {};
    const cd = item.contentDetails ?? {};
    const stats = item.statistics ?? {};
    const thumb =
      snippet.thumbnails?.maxres?.url ||
      snippet.thumbnails?.high?.url ||
      snippet.thumbnails?.medium?.url ||
      `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

    const row = {
      user_id: userId,
      video_id: videoId,
      url: `https://youtu.be/${videoId}`,
      title: snippet.title ?? "Untitled",
      description: snippet.description ?? null,
      thumbnail_url: thumb,
      channel_title: snippet.channelTitle ?? "Unknown",
      channel_id: snippet.channelId ?? null,
      duration_seconds: cd.duration ? parseIsoDuration(cd.duration) : null,
      published_at: snippet.publishedAt ?? null,
      view_count: stats.viewCount ? Number(stats.viewCount) : null,
      language: snippet.defaultAudioLanguage ?? snippet.defaultLanguage ?? null,
      status: "ready" as const,
      error: null as string | null,
      last_opened_at: new Date().toISOString(),
    };

    const { data: saved, error } = await supabase
      .from("youtube_videos")
      .upsert(row, { onConflict: "user_id,video_id" })
      .select("*")
      .single();
    if (error) throw error;

    return { ...(saved as any), cached: false };
  });

export const listRecentYouTubeVideos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("youtube_videos")
      .select("id,video_id,url,title,thumbnail_url,duration_seconds,last_opened_at")
      .eq("user_id", context.userId)
      .eq("status", "ready")
      .order("last_opened_at", { ascending: false })
      .limit(5);
    if (error) throw error;
    return data ?? [];
  });
