import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Youtube, X, Sparkles, Clock, Play, Loader2, ExternalLink, CheckCircle2,
  ListOrdered, MapPin, Pin, Target,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  extractVideoId,
  fetchYouTubeMetadata,
  listRecentYouTubeVideos,
  type YouTubeVideoMeta,
} from "@/lib/youtube.functions";
import {
  processYouTubeVideo,
  listYouTubeSections,
  type VideoSection,
} from "@/lib/youtube-processing.functions";
import { toast } from "sonner";

export function fmtDuration(sec?: number | null) {
  if (!sec && sec !== 0) return "";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Consistent screen-reader label for a timeline section.
 * Format: "Section {i} of {n}: {title}, {start} to {end}[, official chapter][, currently focused]. Press Enter to focus, O to open in YouTube."
 * Exported for accessibility tests.
 */
export function timelineSectionAriaLabel(opts: {
  index: number; // 0-based
  total: number;
  title: string;
  start_seconds: number;
  end_seconds: number;
  source?: string | null;
  isPinned?: boolean;
}) {
  const { index, total, title, start_seconds, end_seconds, source, isPinned } = opts;
  const parts = [
    `Section ${index + 1} of ${total}: ${title}`,
    `${fmtDuration(start_seconds)} to ${fmtDuration(end_seconds)}`,
  ];
  if (source === "chapters") parts.push("official chapter");
  if (isPinned) parts.push("currently focused");
  return `${parts.join(", ")}. Press Enter to focus chat on this section, press O to open in YouTube.`;
}

function fmtRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

/* ============ YouTube Bottom Sheet ============ */
export function YouTubeConnectorSheet({
  open,
  onClose,
  onReady,
}: {
  open: boolean;
  onClose: () => void;
  onReady: (video: YouTubeVideoMeta) => void;
}) {
  const [url, setUrl] = useState("");
  const [shake, setShake] = useState(false);
  const [processing, setProcessing] = useState<{ url: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRecent = useServerFn(listRecentYouTubeVideos);
  const qc = useQueryClient();

  const { data: recent = [] } = useQuery({
    queryKey: ["yt-recent"],
    queryFn: () => listRecent(),
    enabled: open,
  });

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 250);
    if (!open) { setUrl(""); setProcessing(null); }
  }, [open]);

  function analyze(candidate?: string) {
    const value = (candidate ?? url).trim();
    const id = extractVideoId(value);
    if (!id) {
      setShake(true);
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        try { navigator.vibrate?.(80); } catch { /* ignore */ }
      }
      setTimeout(() => setShake(false), 500);
      toast.error("That doesn't look like a YouTube URL");
      return;
    }
    setProcessing({ url: value });
  }

  function handleProcessingDone(video: YouTubeVideoMeta) {
    setProcessing(null);
    onClose();
    qc.invalidateQueries({ queryKey: ["yt-recent"] });
    onReady(video);
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-md"
          />
          {/* Sheet */}
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            className="fixed inset-x-0 bottom-0 z-50 max-h-[86svh] rounded-t-[28px] border-t border-primary/10 bg-background shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Grabber */}
            <div className="pt-2 pb-1 flex justify-center">
              <div className="h-1.5 w-11 rounded-full bg-muted-foreground/30" />
            </div>

            <div className="flex items-center justify-between px-6 pt-1 pb-3">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-destructive/15 to-primary/15 shadow-card">
                  <Youtube className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <div className="text-lg font-black leading-tight flex items-center gap-1.5">
                    YouTube Learning <Sparkles className="h-4 w-4 text-warning" />
                  </div>
                  <div className="text-[11px] text-muted-foreground">Paste any lecture, tutorial or educational video.</div>
                </div>
              </div>
              <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full bg-muted hover:bg-muted/70">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-4 space-y-5">
              {/* Illustration */}
              <div className="relative overflow-hidden rounded-3xl border border-primary/15 bg-gradient-to-br from-destructive/10 via-primary/10 to-blue/10 p-6">
                <div className="relative flex items-center justify-center">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="absolute h-40 w-40 rounded-full bg-primary/20 blur-3xl animate-pulse" />
                  </div>
                  <div className="relative grid h-24 w-24 place-items-center rounded-3xl bg-destructive shadow-2xl">
                    <Play className="h-10 w-10 text-white fill-white" />
                  </div>
                  <Sparkles className="absolute -right-2 top-2 h-5 w-5 text-warning animate-pulse" />
                  <Sparkles className="absolute -left-3 bottom-3 h-4 w-4 text-primary animate-pulse" />
                </div>
                <div className="mt-4 text-center text-xs text-muted-foreground">
                  Sana will watch, understand, and become an expert on it.
                </div>
              </div>

              {/* Input */}
              <motion.div
                animate={shake ? { x: [0, -8, 8, -6, 6, -3, 3, 0] } : { x: 0 }}
                transition={{ duration: 0.45 }}
              >
                <div className={cn(
                  "flex items-center gap-2 rounded-2xl border-2 bg-card px-4 py-3 shadow-card transition-colors",
                  shake ? "border-destructive" : "border-primary/25 focus-within:border-primary/60",
                )}>
                  <Youtube className="h-4 w-4 text-destructive shrink-0" />
                  <input
                    ref={inputRef}
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") analyze(); }}
                    placeholder="Paste YouTube URL..."
                    inputMode="url"
                    autoCapitalize="none"
                    autoCorrect="off"
                    className="min-w-0 flex-1 bg-transparent text-sm focus:outline-none"
                  />
                  {url && (
                    <button onClick={() => setUrl("")} className="grid h-6 w-6 place-items-center rounded-full bg-muted hover:bg-muted/70">
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <div className="mt-1.5 pl-1 text-[10px] text-muted-foreground">
                  Works with youtube.com, youtu.be, Shorts, and live videos.
                </div>
              </motion.div>

              {/* Recent */}
              {recent.length > 0 && (
                <div>
                  <div className="mb-2 flex items-center justify-between pl-1">
                    <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Recent Videos</div>
                    <div className="text-[10px] text-muted-foreground">Tap to reopen</div>
                  </div>
                  <div className="space-y-2">
                    {recent.map((v) => (
                      <button
                        key={v.id}
                        onClick={() => analyze(v.url)}
                        className="group flex w-full items-center gap-3 rounded-2xl border border-border/60 bg-card p-2.5 text-left shadow-card active:scale-[0.98] transition"
                      >
                        <div className="relative h-14 w-24 shrink-0 overflow-hidden rounded-xl bg-muted">
                          {v.thumbnail_url && (
                            <img src={v.thumbnail_url} alt="" className="h-full w-full object-cover" />
                          )}
                          <div className="absolute inset-0 grid place-items-center bg-black/25 opacity-0 group-hover:opacity-100 transition">
                            <Play className="h-5 w-5 text-white fill-white" />
                          </div>
                          {v.duration_seconds ? (
                            <div className="absolute bottom-1 right-1 rounded bg-black/80 px-1 text-[9px] font-bold text-white">
                              {fmtDuration(v.duration_seconds)}
                            </div>
                          ) : null}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="line-clamp-2 text-[13px] font-semibold leading-snug">{v.title ?? "Untitled"}</div>
                          <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Clock className="h-3 w-3" /> {fmtRelative(v.last_opened_at)}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Analyze button */}
            <div className="border-t border-border/60 bg-background/95 px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-xl">
              <button
                onClick={() => analyze()}
                disabled={!url.trim()}
                className={cn(
                  "gradient-primary flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-black text-white shadow-soft transition",
                  "disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]",
                )}
              >
                <Sparkles className="h-4 w-4" />
                Analyze Video
              </button>
            </div>
          </motion.div>

          {/* Processing overlay */}
          {processing && (
            <YouTubeProcessing
              url={processing.url}
              onDone={handleProcessingDone}
              onError={(msg) => {
                setProcessing(null);
                toast.error("Couldn't analyze video", { description: msg });
              }}
            />
          )}
        </>
      )}
    </AnimatePresence>
  );
}

/* ============ Processing Screen ============ */

const STAGES = [
  "Fetching video metadata",
  "Reading captions",
  "Cleaning transcript",
  "Detecting chapters",
  "Extracting key concepts",
  "Finding important topics",
  "Building knowledge graph",
  "Generating timeline",
  "Preparing flashcards",
  "Loading AI memory",
  "Ready!",
];

const ROTATING_MESSAGES = [
  "Watching the video...",
  "Understanding the concepts...",
  "Learning like a student...",
  "Finding important examples...",
  "Building AI memory...",
  "Preparing explanations...",
  "Almost ready...",
];

function YouTubeProcessing({
  url,
  onDone,
  onError,
}: {
  url: string;
  onDone: (v: YouTubeVideoMeta) => void;
  onError: (msg: string) => void;
}) {
  const [stageIdx, setStageIdx] = useState(0);
  const [msgIdx, setMsgIdx] = useState(0);
  const [result, setResult] = useState<YouTubeVideoMeta | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const fetchMeta = useServerFn(fetchYouTubeMetadata);
  const processVideo = useServerFn(processYouTubeVideo);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    (async () => {
      try {
        const meta = await fetchMeta({ data: { url } });
        // Transcript + embeddings — don't block on failure, video is still usable
        try {
          const proc = await processVideo({ data: { url } });
          if (proc.status === "no_transcript") {
            toast.message("No public captions on this video", {
              description: "Sana will answer using the video's title and description.",
            });
          }
        } catch (e) {
          console.warn("[yt] processing failed", e);
        }
        setResult(meta);
      } catch (e: any) {
        setFailed(e?.message ?? "Something went wrong.");
      }
    })();
  }, [url, fetchMeta, processVideo]);

  // Rotating status messages
  useEffect(() => {
    const t = setInterval(() => setMsgIdx((i) => (i + 1) % ROTATING_MESSAGES.length), 2200);
    return () => clearInterval(t);
  }, []);

  // Natural stage progression
  useEffect(() => {
    if (failed) return;
    // Advance until second-to-last stage even before the fetch resolves,
    // then jump to "Ready!" when the result lands.
    const cap = result ? STAGES.length - 1 : STAGES.length - 2;
    if (stageIdx >= cap) {
      if (result && stageIdx < STAGES.length - 1) {
        const t = setTimeout(() => setStageIdx(STAGES.length - 1), 350);
        return () => clearTimeout(t);
      }
      if (result && stageIdx === STAGES.length - 1) {
        const t = setTimeout(() => onDone(result), 700);
        return () => clearTimeout(t);
      }
      return;
    }
    const delay = 260 + Math.random() * 320;
    const t = setTimeout(() => setStageIdx((i) => i + 1), delay);
    return () => clearTimeout(t);
  }, [stageIdx, result, failed, onDone]);

  useEffect(() => { if (failed) onError(failed); }, [failed, onError]);

  const progress = Math.round(((stageIdx + 1) / STAGES.length) * 100);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] grid place-items-center overflow-hidden bg-background"
    >
      {/* Animated background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 -left-20 h-80 w-80 rounded-full bg-primary/20 blur-3xl animate-pulse" />
        <div className="absolute -bottom-20 -right-20 h-96 w-96 rounded-full bg-destructive/15 blur-3xl animate-pulse" />
        <div className="absolute top-1/2 left-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue/10 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md px-6">
        {/* Center illustration */}
        <div className="relative mx-auto mb-6 grid h-40 w-40 place-items-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 rounded-full border-2 border-dashed border-primary/40"
          />
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
            className="absolute inset-3 rounded-full border-2 border-dashed border-destructive/30"
          />
          <div className="gradient-primary relative grid h-24 w-24 place-items-center rounded-3xl shadow-2xl">
            <Youtube className="h-11 w-11 text-white" />
          </div>
          <Sparkles className="absolute right-0 top-2 h-5 w-5 text-warning animate-pulse" />
          <Sparkles className="absolute left-1 bottom-3 h-4 w-4 text-primary animate-pulse" />
        </div>

        {/* Rotating message */}
        <div className="h-6 text-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={msgIdx}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.35 }}
              className="text-sm font-semibold text-foreground"
            >
              {ROTATING_MESSAGES[msgIdx]}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Progress bar */}
        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted">
          <motion.div
            className="h-full gradient-primary"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ type: "spring", stiffness: 120, damping: 22 }}
          />
        </div>
        <div className="mt-1.5 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          <span>Processing</span>
          <span>{progress}%</span>
        </div>

        {/* Stage timeline */}
        <div className="mt-5 rounded-3xl border border-primary/15 bg-card/70 p-4 shadow-card backdrop-blur-xl max-h-[38vh] overflow-y-auto no-scrollbar">
          <ul className="space-y-2.5">
            {STAGES.map((s, i) => {
              const done = i < stageIdx;
              const active = i === stageIdx;
              return (
                <li key={s} className="flex items-center gap-3">
                  <div className={cn(
                    "grid h-6 w-6 shrink-0 place-items-center rounded-full transition-colors",
                    done && "bg-success/15 text-success",
                    active && "bg-primary/15 text-primary",
                    !done && !active && "bg-muted text-muted-foreground",
                  )}>
                    {done ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : active ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <div className="h-1.5 w-1.5 rounded-full bg-current" />
                    )}
                  </div>
                  <span className={cn(
                    "text-[13px] transition-colors",
                    done && "text-muted-foreground line-through",
                    active && "font-semibold text-foreground",
                    !done && !active && "text-muted-foreground",
                  )}>
                    {s}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </motion.div>
  );
}

/* ============ Rich Video Card (used inside chat messages) ============ */

export function YouTubeRichCard({
  video,
  onOpenTimeline,
}: {
  video: YouTubeVideoMeta;
  onOpenTimeline?: (videoId: string) => void;
}) {
  const watch = `https://youtu.be/${video.video_id}`;
  return (
    <div className="my-2 overflow-hidden rounded-3xl border border-primary/15 bg-card shadow-card">
      <a href={watch} target="_blank" rel="noreferrer" className="relative block">
        <div className="relative aspect-video w-full overflow-hidden bg-muted">
          {video.thumbnail_url && (
            <img src={video.thumbnail_url} alt={video.title} className="h-full w-full object-cover" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <div className="absolute inset-0 grid place-items-center">
            <div className="grid h-14 w-14 place-items-center rounded-full bg-destructive/95 shadow-2xl transition-transform group-active:scale-95">
              <Play className="h-6 w-6 text-white fill-white" />
            </div>
          </div>
          {video.duration_seconds ? (
            <div className="absolute bottom-2 right-2 rounded-md bg-black/80 px-1.5 py-0.5 text-[10px] font-bold text-white">
              {fmtDuration(video.duration_seconds)}
            </div>
          ) : null}
        </div>
      </a>
      <div className="space-y-2 p-4">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-destructive">
          <Youtube className="h-3 w-3" /> YouTube {video.cached ? "· cached" : "· learned"}
        </div>
        <div className="line-clamp-2 text-sm font-black leading-snug">{video.title}</div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          <span className="font-semibold text-foreground/80">{video.channel_title}</span>
          {video.view_count ? <span>· {Intl.NumberFormat("en", { notation: "compact" }).format(video.view_count)} views</span> : null}
          {video.language ? <span>· {video.language.toUpperCase()}</span> : null}
        </div>
        <div className="mt-1 flex flex-wrap gap-2">
          {onOpenTimeline && (
            <button
              type="button"
              onClick={() => onOpenTimeline(video.video_id)}
              className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-[11px] font-bold text-primary hover:bg-primary/15 active:scale-[0.98] transition"
            >
              <ListOrdered className="h-3 w-3" /> Timeline
            </button>
          )}
          <a
            href={watch} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card px-3 py-1.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground"
          >
            <ExternalLink className="h-3 w-3" /> Watch on YouTube
          </a>
        </div>
      </div>
    </div>
  );
}

/* ============ Timeline Sheet — clickable sections ============ */

export type PinnedSection = {
  videoId: string;
  index: number;
  title: string;
  start_seconds: number;
  end_seconds: number;
};

export function YouTubeTimelineSheet({
  videoId,
  open,
  onClose,
  onPick,
  pinned,
}: {
  videoId: string | null;
  open: boolean;
  onClose: () => void;
  onPick: (section: PinnedSection | null) => void;
  pinned: PinnedSection | null;
}) {
  const list = useServerFn(listYouTubeSections);
  const { data: sections = [], isLoading, isError } = useQuery({
    queryKey: ["yt-sections", videoId],
    queryFn: () => list({ data: { videoId: videoId! } }),
    enabled: open && !!videoId,
    staleTime: 60_000,
  });

  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const headingId = "yt-timeline-heading";
  const descId = "yt-timeline-desc";
  const hintId = "yt-timeline-hint";

  // Reset active index when opened / sections change
  useEffect(() => {
    if (!open) return;
    const pinnedIdx =
      pinned && pinned.videoId === videoId
        ? sections.findIndex((s) => s.index === pinned.index)
        : -1;
    setActiveIndex(pinnedIdx >= 0 ? pinnedIdx : 0);
  }, [open, videoId, sections, pinned]);

  // Focus the active item when it changes / when list becomes available
  useEffect(() => {
    if (!open) return;
    const el = itemRefs.current[activeIndex];
    if (el) {
      el.focus();
    } else if (sections.length === 0) {
      closeBtnRef.current?.focus();
    }
  }, [open, activeIndex, sections.length]);

  const move = (delta: number) => {
    if (!sections.length) return;
    setActiveIndex((i) => {
      const next = i + delta;
      if (next < 0) return sections.length - 1;
      if (next >= sections.length) return 0;
      return next;
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      return;
    }
    if (!sections.length) return;
    switch (e.key) {
      case "ArrowDown":
      case "j":
        e.preventDefault();
        move(1);
        break;
      case "ArrowUp":
      case "k":
        e.preventDefault();
        move(-1);
        break;
      case "Home":
        e.preventDefault();
        setActiveIndex(0);
        break;
      case "End":
        e.preventDefault();
        setActiveIndex(sections.length - 1);
        break;
      case "PageDown":
        e.preventDefault();
        setActiveIndex((i) => Math.min(sections.length - 1, i + 5));
        break;
      case "PageUp":
        e.preventDefault();
        setActiveIndex((i) => Math.max(0, i - 5));
        break;
      case "o":
      case "O": {
        const s = sections[activeIndex];
        if (s && videoId) {
          window.open(`https://youtu.be/${videoId}?t=${s.start_seconds}`, "_blank", "noopener,noreferrer");
        }
        break;
      }
      case "c":
      case "C":
        if (pinned && pinned.videoId === videoId) {
          e.preventDefault();
          onPick(null);
          onClose();
        }
        break;
    }
  };

  const pickSection = (s: VideoSection) => {
    if (!videoId) return;
    onPick({
      videoId,
      index: s.index,
      title: s.title,
      start_seconds: s.start_seconds,
      end_seconds: s.end_seconds,
    });
    onClose();
  };

  return (
    <AnimatePresence>
      {open && videoId && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[55] bg-background/70 backdrop-blur-sm" onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="fixed inset-x-0 bottom-0 z-[56] flex max-h-[85vh] flex-col rounded-t-3xl border-t border-primary/20 bg-background shadow-2xl focus:outline-none"
            role="dialog"
            aria-modal="true"
            aria-labelledby={headingId}
            aria-describedby={descId}
            tabIndex={-1}
            onKeyDown={handleKeyDown}
          >
            <div className="flex items-center justify-between px-6 pt-5 pb-3">
              <div className="flex items-center gap-2">
                <div className="grid h-9 w-9 place-items-center rounded-2xl bg-primary/10 text-primary" aria-hidden="true">
                  <ListOrdered className="h-4 w-4" />
                </div>
                <div>
                  <div id={headingId} className="text-sm font-black">Video Timeline</div>
                  <div id={descId} className="text-[11px] text-muted-foreground">
                    {sections.length ? `${sections.length} sections · tap to focus chat` : "Loading sections…"}
                  </div>
                </div>
              </div>
              <button
                ref={closeBtnRef}
                onClick={onClose}
                aria-label="Close timeline"
                className="grid h-9 w-9 place-items-center rounded-full bg-muted text-muted-foreground hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="mx-6 mb-3 h-px bg-border/60" />

            <div className="min-h-0 flex-1 overflow-y-auto no-scrollbar px-4 pb-2">
              {isLoading && (
                <div className="py-14 text-center text-xs text-muted-foreground" role="status" aria-live="polite">
                  <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" aria-hidden="true" />
                  Reading the transcript…
                </div>
              )}
              {isError && (
                <div className="py-10 text-center text-xs text-destructive" role="alert">Couldn't load sections.</div>
              )}
              {!isLoading && sections.length === 0 && !isError && (
                <div className="mx-2 rounded-2xl border border-border/60 bg-card p-6 text-center text-xs text-muted-foreground">
                  No transcript sections yet. The video may not have captions, or processing didn't finish.
                </div>
              )}

              {pinned && pinned.videoId === videoId && (
                <button
                  onClick={() => { onPick(null); onClose(); }}
                  aria-label={`Clear focus on section ${pinned.title}. Use full video context.`}
                  className="mb-3 flex w-full items-center justify-between rounded-2xl border border-primary/40 bg-primary/10 px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <div className="flex items-center gap-2 text-primary">
                    <Target className="h-4 w-4" aria-hidden="true" />
                    <span className="text-[12px] font-black">Clear focus · use full video</span>
                  </div>
                  <X className="h-4 w-4 text-primary" aria-hidden="true" />
                </button>
              )}

              <ul
                aria-label="Video sections"
                className="space-y-2"
              >

                {sections.map((s, i) => {
                  const isPinned = pinned?.videoId === videoId && pinned.index === s.index;
                  const isActive = i === activeIndex;
                  const label = timelineSectionAriaLabel({
                    index: i,
                    total: sections.length,
                    title: s.title,
                    start_seconds: s.start_seconds,
                    end_seconds: s.end_seconds,
                    source: s.source,
                    isPinned,
                  });
                  return (
                    <li
                      key={s.index}
                      data-timeline-section-index={i}
                      className={cn(
                        "relative flex items-stretch gap-1 rounded-2xl border shadow-card transition",
                        isPinned
                          ? "border-primary/50 bg-primary/10"
                          : "border-border/60 bg-card hover:border-primary/30",
                        isActive && !isPinned && "border-primary/40",
                      )}
                    >
                      <button
                        ref={(el) => { itemRefs.current[i] = el; }}
                        id={`yt-section-${s.index}`}
                        aria-pressed={isPinned}
                        aria-current={isActive ? "true" : undefined}
                        aria-label={label}
                        tabIndex={isActive ? 0 : -1}
                        onFocus={() => setActiveIndex(i)}
                        onClick={() => pickSection(s)}
                        className={cn(
                          "group flex min-w-0 flex-1 items-start gap-3 rounded-2xl p-3 text-left transition active:scale-[0.99]",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                        )}
                      >
                        <div className={cn(
                          "grid h-11 w-11 shrink-0 place-items-center rounded-xl font-black text-[11px] tabular-nums",
                          isPinned ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                        )} aria-hidden="true">
                          {fmtDuration(s.start_seconds)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className={cn(
                            "line-clamp-2 text-[13px] font-bold leading-snug",
                            isPinned && "text-primary",
                          )}>
                            {s.title}
                          </div>
                          <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground" aria-hidden="true">
                            <Clock className="h-3 w-3" />
                            {fmtDuration(s.start_seconds)} – {fmtDuration(s.end_seconds)}
                            {s.source === "chapters" && (
                              <span className="ml-1 rounded-full bg-success/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-success">
                                Chapter
                              </span>
                            )}
                          </div>
                        </div>
                        {isPinned ? (
                          <Pin className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                        ) : (
                          <MapPin className="h-4 w-4 shrink-0 text-muted-foreground/50 group-hover:text-primary" aria-hidden="true" />
                        )}
                      </button>
                      <a
                        href={`https://youtu.be/${videoId}?t=${s.start_seconds}`}
                        target="_blank"
                        rel="noreferrer"
                        onKeyDown={(e) => e.stopPropagation()}
                        tabIndex={-1}
                        className="my-2 mr-2 grid w-9 shrink-0 place-items-center rounded-full text-muted-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        aria-label={`Open section ${s.title} (${fmtDuration(s.start_seconds)} to ${fmtDuration(s.end_seconds)}) in YouTube (new tab)`}
                      >
                        <ExternalLink className="h-4 w-4" aria-hidden="true" />
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>

            {sections.length > 0 && (
              <div
                id={hintId}
                className="border-t border-border/60 px-6 py-2.5 text-[10px] text-muted-foreground"
              >
                <span className="sr-only">Keyboard shortcuts: </span>
                <kbd className="rounded bg-muted px-1 py-0.5 font-mono">↑</kbd>{" "}
                <kbd className="rounded bg-muted px-1 py-0.5 font-mono">↓</kbd> move ·{" "}
                <kbd className="rounded bg-muted px-1 py-0.5 font-mono">Enter</kbd> focus ·{" "}
                <kbd className="rounded bg-muted px-1 py-0.5 font-mono">O</kbd> open ·{" "}
                {pinned && pinned.videoId === videoId && (
                  <>
                    <kbd className="rounded bg-muted px-1 py-0.5 font-mono">C</kbd> clear ·{" "}
                  </>
                )}
                <kbd className="rounded bg-muted px-1 py-0.5 font-mono">Esc</kbd> close
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
