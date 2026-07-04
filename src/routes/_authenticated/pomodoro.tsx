import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Pause,
  Play,
  RotateCcw,
  Maximize2,
  Shield,
  Zap,
  Hand,
  Info,
  Code2,
  PenSquare,
  Lightbulb,
  Minimize2,
  Square,
  CheckCircle2,
  Sprout,
  Ban,
  Timer,
  Flame,
  TrendingUp,
  BarChart3,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import sanaAvatar from "@/assets/sana-avatar.png";
import {
  DEFAULT_ALLOW_LIST,
  sanaLine,
  useStrictMode,
  type StrictStats,
} from "@/lib/strict-mode";
import { StrictModeOverlay } from "@/components/app/StrictModeOverlay";
import { StrictModePermissionsSheet } from "@/components/app/StrictModePermissionsSheet";
import { loadPermissions } from "@/lib/strict-permissions";

export const Route = createFileRoute("/_authenticated/pomodoro")({
  ssr: false,
  component: PomodoroPage,
});

type Mode = "focus" | "short" | "long";
const DURATIONS: Record<Mode, number> = { focus: 25 * 60, short: 5 * 60, long: 15 * 60 };
const MIN_LABEL: Record<Mode, string> = { focus: "25 min", short: "5 min", long: "15 min" };
const MODE_LABEL: Record<Mode, string> = { focus: "Focus", short: "Short Break", long: "Long Break" };

function fmt(s: number) {
  const m = Math.floor(s / 60).toString().padStart(2, "0");
  const r = (s % 60).toString().padStart(2, "0");
  return `${m}:${r}`;
}

function PomodoroPage() {
  const [mode, setMode] = useState<Mode>("focus");
  const [remaining, setRemaining] = useState(DURATIONS.focus);
  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState(0);
  const [gestureControl, setGestureControl] = useState(true);
  const [showPermsSheet, setShowPermsSheet] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const tickRef = useRef<number | null>(null);
  const strict = useStrictMode();

  useEffect(() => {
    if (!running) return;
    tickRef.current = window.setInterval(() => {
      strict.tickSecond();
      setRemaining((r) => {
        if (r <= 1) {
          window.clearInterval(tickRef.current!);
          setRunning(false);
          if (mode === "focus") {
            setCompleted((c) => c + 1);
            if (strict.enabled) strict.disable({ completed: true, actualSeconds: DURATIONS.focus });
          }
          return 0;
        }
        return r - 1;
      });
    }, 1000) as unknown as number;
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
    };
  }, [running, mode, strict]);

  const pct = ((DURATIONS[mode] - remaining) / DURATIONS[mode]) * 100;
  const nextMode: Mode = mode === "focus" ? (completed % 4 === 3 ? "long" : "short") : "focus";

  const toggleStrict = async (checked: boolean) => {
    if (checked) {
      // Show the guided permission sheet first, unless the user has already
      // completed onboarding (notifications already resolved beyond "pending").
      const perms = loadPermissions();
      if (perms.notifications === "pending" && perms.wakeLock === "pending") {
        setShowPermsSheet(true);
        return;
      }
      await strict.enable(DURATIONS[mode]);
      setRunning(true);
    } else {
      strict.disable({
        completed: false,
        actualSeconds: DURATIONS[mode] - remaining,
      });
    }
  };

  const start = async () => {
    if (strict.enabled) {
      setRunning(true);
    } else {
      // starting without strict mode is fine too
      setRunning(true);
    }
  };

  const endSession = () => {
    setRunning(false);
    if (strict.enabled) {
      strict.disable({
        completed: false,
        actualSeconds: DURATIONS[mode] - remaining,
      });
    }
  };

  return (
    <div className="pb-8">
      {/* Custom top bar */}
      <header className="flex items-center gap-3 px-4 pt-5 pb-4">
        <Link
          to="/home"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-border bg-card shadow-card"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="text-2xl leading-none">🐍</span>
          <div className="min-w-0">
            <h1 className="truncate text-[17px] font-extrabold leading-tight">Smart Revision</h1>
            <p className="truncate text-[11px] text-muted-foreground">Python Programming</p>
          </div>
        </div>
        <button
          onClick={() => (running ? setRunning(false) : start())}
          className="flex h-10 items-center gap-1.5 rounded-2xl border border-primary/30 bg-card px-3 text-[12px] font-bold text-primary shadow-card"
        >
          {running ? <Pause className="h-3.5 w-3.5 fill-primary" /> : <Play className="h-3.5 w-3.5 fill-primary" />}
          {running ? "Pause" : "Resume"}
        </button>
        <button
          onClick={endSession}
          className="flex h-10 items-center gap-1.5 rounded-2xl border border-destructive/40 bg-card px-3 text-[12px] font-bold text-destructive shadow-card"
        >
          <Square className="h-3.5 w-3.5" />
          End
        </button>
      </header>

      {/* Strict Mode hero */}
      <section
        className={cn(
          "mx-4 overflow-hidden rounded-[24px] p-5 shadow-soft relative transition-colors",
          strict.enabled
            ? "gradient-primary text-primary-foreground"
            : "border border-border bg-card text-foreground",
        )}
      >
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "grid h-11 w-11 place-items-center rounded-2xl backdrop-blur",
              strict.enabled ? "bg-white/15" : "bg-lavender",
            )}
          >
            <Shield className={cn("h-5 w-5", !strict.enabled && "text-primary")} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-1.5 text-[17px] font-extrabold">
              Strict Mode is {strict.enabled ? "ON" : "OFF"}{" "}
              {strict.enabled && <Zap className="h-4 w-4 fill-warning text-warning" />}
            </div>
            <p
              className={cn(
                "mt-1 text-[12px] leading-snug",
                strict.enabled ? "text-white/85" : "text-muted-foreground",
              )}
            >
              {strict.enabled
                ? "Sana is holding your focus. Leaving this tab counts as a distraction."
                : "Turn on to lock in — tab-away detection, wake-lock, and adaptive Sana coaching."}
            </p>
          </div>
        </div>
        <div className="pointer-events-none absolute -right-4 -bottom-4 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
        {strict.enabled && (
          <div className="pointer-events-none absolute right-4 top-4 grid h-20 w-20 place-items-center rounded-3xl bg-white/15 backdrop-blur">
            <Shield className="h-10 w-10 fill-white/90 text-white" />
          </div>
        )}
      </section>

      {/* Toggles row */}
      <section className="mx-4 mt-3 grid grid-cols-2 gap-0 rounded-[22px] border border-border bg-card p-3 shadow-card">
        <ToggleTile
          icon={<Shield className="h-4 w-4 text-primary" />}
          title="Strict Mode"
          desc="Detects tab-aways as distractions, locks Sana until timer ends."
          checked={strict.enabled}
          onChange={toggleStrict}
        />
        <div className="border-l border-border pl-3">
          <ToggleTile
            icon={<Hand className="h-4 w-4 text-primary" />}
            title="Gesture Control"
            desc="Clap to start or pause the Pomodoro timer."
            checked={gestureControl}
            onChange={setGestureControl}
          />
        </div>
      </section>

      {/* Focus card */}
      <section className="mx-4 mt-3 rounded-[24px] border border-border bg-card p-5 shadow-card">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-1.5 text-[18px] font-extrabold">
              Pomodoro Focus <span>🍅</span>
            </h2>
            <p className="mt-0.5 text-[12px] text-muted-foreground">Stay focused. Time your deep work.</p>
          </div>
          <button className="flex items-center gap-1 rounded-full border border-primary/25 bg-lavender px-3 py-1.5 text-[11px] font-bold text-primary">
            <Info className="h-3 w-3" /> How it works?
          </button>
        </div>

        {/* Mode tabs */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          {(Object.keys(DURATIONS) as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => {
                setMode(m);
                setRemaining(DURATIONS[m]);
                setRunning(false);
              }}
              className={cn(
                "rounded-2xl border py-2.5 text-center transition",
                mode === m
                  ? "border-primary/40 bg-lavender text-primary"
                  : "border-border bg-card text-foreground",
              )}
            >
              <div className={cn("text-[13px] font-bold", mode === m && "text-primary")}>{MODE_LABEL[m]}</div>
              <div className={cn("text-[11px]", mode === m ? "text-primary/80" : "text-muted-foreground")}>
                {MIN_LABEL[m]}
              </div>
            </button>
          ))}
        </div>

        {/* Timer + side cards */}
        <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div className="rounded-2xl border border-border bg-card p-3 text-center shadow-card">
            <div className="mx-auto grid h-6 w-6 place-items-center rounded-full bg-success text-white">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div className="mt-1 text-[11px] font-semibold text-muted-foreground">Sessions Today</div>
            <div className="mt-0.5 text-2xl font-black text-primary">{strict.stats.todayStreak + completed}/4</div>
            <div className="text-[10px] text-muted-foreground">Completed</div>
          </div>

          <TimerRing
            pct={pct}
            time={fmt(remaining)}
            label={mode === "focus" ? "Focus Time" : MODE_LABEL[mode]}
            sub={`${DURATIONS[mode] / 60} min session`}
          />

          <div className="rounded-2xl border border-border bg-card p-3 text-center shadow-card">
            <div className="text-[11px] font-semibold text-muted-foreground">Keep it up!</div>
            <div className="mx-auto my-1 grid h-8 w-8 place-items-center">
              <Sprout className="h-6 w-6 text-success" />
            </div>
            <div className="text-[10px] leading-tight text-muted-foreground">Consistency builds mastery.</div>
          </div>
        </div>

        {/* Controls */}
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={() => (running ? setRunning(false) : start())}
            className="gradient-primary shadow-soft flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl px-6 text-sm font-bold text-primary-foreground active:scale-[0.98]"
          >
            {running ? <Pause className="h-4 w-4 fill-white" /> : <Play className="h-4 w-4 fill-white" />}
            {running ? "Pause" : "Start"}
          </button>
          <button
            onClick={() => {
              setRemaining(DURATIONS[mode]);
              setRunning(false);
            }}
            className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-border bg-card px-5 text-sm font-bold shadow-card"
          >
            <RotateCcw className="h-4 w-4" /> Reset
          </button>
          <button
            onClick={async () => {
              const next = !fullscreen;
              setFullscreen(next);
              try {
                if (next && !document.fullscreenElement) {
                  await document.documentElement.requestFullscreen?.();
                } else if (!next && document.fullscreenElement) {
                  await document.exitFullscreen?.();
                }
              } catch {
                /* fullscreen may be blocked — overlay still works */
              }
            }}
            className="grid h-12 w-12 place-items-center rounded-2xl border border-border bg-card shadow-card active:scale-[0.97]"
            aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen timer"}
          >
            {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>

        <p className="mt-3 text-center text-[12px] text-muted-foreground">
          Up Next: <span className="font-semibold text-foreground">{MODE_LABEL[nextMode]} ({MIN_LABEL[nextMode]})</span> ☕
        </p>
      </section>

      {/* Analytics Dashboard */}
      <AnalyticsSection stats={strict.stats} />

      {/* Allow-list */}
      <AllowListSection />

      {/* Current Focus Topic */}
      <section className="mx-4 mt-3 flex items-center gap-3 rounded-[22px] border border-border bg-card p-4 shadow-card">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-lavender">
          <Code2 className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold text-muted-foreground">Current Focus Topic</div>
          <div className="truncate text-[14px] font-bold">Control Flow (if, else)</div>
          <div className="truncate text-[11px] text-muted-foreground">
            Focus on understanding conditional statements.
          </div>
        </div>
        <button className="flex shrink-0 items-center gap-1 rounded-full border border-primary/25 bg-card px-3 py-1.5 text-[11px] font-bold text-primary">
          <PenSquare className="h-3 w-3" /> Change Topic
        </button>
      </section>

      {/* Focus Tip — adaptive Sana */}
      <section className="mx-4 mt-3 flex items-start gap-3 overflow-hidden rounded-[22px] bg-lavender p-4">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/15">
          <Lightbulb className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-extrabold">Sana says</div>
          <p className="mt-0.5 text-[12px] leading-snug text-muted-foreground">
            {sanaLine(strict.stats.todayDistractions)}
          </p>
        </div>
        <img src={sanaAvatar} alt="Sana" className="h-16 w-16 shrink-0 rounded-2xl object-cover" />
      </section>

      <StrictModeOverlay
        open={strict.locked}
        remainingLabel={fmt(remaining)}
        distractions={strict.stats.todayDistractions}
        blockedApp={strict.lastBlockedApp}
        onReturn={strict.returnToStudy}
        onEmergency={() => {
          strict.emergencyOverride();
          setRunning(false);
        }}
      />

      <StrictModePermissionsSheet
        open={showPermsSheet}
        onClose={() => setShowPermsSheet(false)}
        onComplete={async () => {
          setShowPermsSheet(false);
          await strict.enable(DURATIONS[mode]);
          setRunning(true);
        }}
      />

      {fullscreen && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-between bg-background/95 backdrop-blur-xl px-6 py-10 pb-[max(2.5rem,env(safe-area-inset-bottom))] animate-in fade-in duration-200">
          <div className="flex w-full items-center justify-between">
            <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              {MODE_LABEL[mode]}
            </div>
            <button
              onClick={async () => {
                setFullscreen(false);
                try { if (document.fullscreenElement) await document.exitFullscreen?.(); } catch {}
              }}
              className="grid h-11 w-11 place-items-center rounded-2xl border border-border bg-card shadow-card"
              aria-label="Exit fullscreen"
            >
              <Minimize2 className="h-5 w-5" />
            </button>
          </div>

          <div className="flex flex-col items-center gap-6">
            <TimerRing pct={pct} time={fmt(remaining)} label={mode === "focus" ? "Focus Time" : MODE_LABEL[mode]} sub={`${DURATIONS[mode] / 60} min session`} large />
            <div className="text-center text-[13px] text-muted-foreground">
              Up next: <span className="font-semibold text-foreground">{MODE_LABEL[nextMode]} ({MIN_LABEL[nextMode]})</span>
            </div>
          </div>

          <div className="flex w-full max-w-sm items-center gap-3">
            <button
              onClick={() => (running ? setRunning(false) : start())}
              className="gradient-primary shadow-soft flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl text-[15px] font-bold text-primary-foreground active:scale-[0.98]"
            >
              {running ? <Pause className="h-5 w-5 fill-white" /> : <Play className="h-5 w-5 fill-white" />}
              {running ? "Pause" : "Start"}
            </button>
            <button
              onClick={() => { setRemaining(DURATIONS[mode]); setRunning(false); }}
              className="grid h-14 w-14 place-items-center rounded-2xl border border-border bg-card shadow-card"
              aria-label="Reset"
            >
              <RotateCcw className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function AnalyticsSection({ stats }: { stats: StrictStats }) {
  const maxMin = Math.max(1, ...stats.weekly.map((w) => w.minutes));
  return (
    <section className="mx-4 mt-3 rounded-[24px] border border-border bg-card p-5 shadow-card">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-[16px] font-extrabold">
          <BarChart3 className="h-4 w-4 text-primary" /> Focus Analytics
        </h2>
        <span className="rounded-full bg-lavender px-2 py-0.5 text-[10px] font-bold text-primary">Today</span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <Stat icon={<TrendingUp className="h-3.5 w-3.5" />} label="Focus Score" value={`${stats.focusScore}`} suffix="/100" accent />
        <Stat icon={<Ban className="h-3.5 w-3.5" />} label="Distractions" value={`${stats.todayDistractions}`} />
        <Stat icon={<Timer className="h-3.5 w-3.5" />} label="Time Saved" value={`${stats.timeSavedMinutes}`} suffix="m" />
        <Stat icon={<Flame className="h-3.5 w-3.5" />} label="Day Streak" value={`${stats.currentDayStreak}`} />
        <Stat icon={<CheckCircle2 className="h-3.5 w-3.5" />} label="Today Streak" value={`${stats.todayStreak}`} />
        <Stat icon={<Sprout className="h-3.5 w-3.5" />} label="Longest" value={`${Math.round(stats.longestStreakSec / 60)}`} suffix="m" />
      </div>

      {/* Weekly bar chart */}
      <div className="mt-4 rounded-2xl border border-border bg-background p-3">
        <div className="mb-2 text-[11px] font-semibold text-muted-foreground">Last 7 days · focus minutes</div>
        <div className="flex h-24 items-end gap-1.5">
          {stats.weekly.map((w, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-1">
              <div
                className="w-full rounded-t-md gradient-primary transition-all"
                style={{ height: `${(w.minutes / maxMin) * 100}%`, minHeight: 3 }}
                title={`${w.minutes} min · ${w.distractions} distractions`}
              />
              <span className="text-[9px] font-semibold text-muted-foreground">{w.day}</span>
            </div>
          ))}
        </div>
      </div>

      {stats.blockedApps.length > 0 && (
        <div className="mt-3">
          <div className="mb-2 text-[11px] font-semibold text-muted-foreground">Top distractions</div>
          <ul className="space-y-1.5">
            {stats.blockedApps.slice(0, 3).map((b) => (
              <li key={b.id} className="flex items-center justify-between rounded-xl border border-border bg-background px-3 py-2 text-[12px]">
                <span className="font-semibold">{b.name}</span>
                <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold text-destructive">
                  {b.attempts} blocked
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function Stat({
  icon,
  label,
  value,
  suffix,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  suffix?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-2.5",
        accent ? "gradient-primary border-transparent text-primary-foreground" : "border-border bg-background",
      )}
    >
      <div className={cn("flex items-center gap-1 text-[10px] font-semibold", accent ? "text-white/80" : "text-muted-foreground")}>
        {icon} {label}
      </div>
      <div className="mt-1 flex items-baseline gap-0.5">
        <span className="text-xl font-black leading-none tabular-nums">{value}</span>
        {suffix && <span className={cn("text-[10px] font-bold", accent ? "text-white/80" : "text-muted-foreground")}>{suffix}</span>}
      </div>
    </div>
  );
}

function AllowListSection() {
  return (
    <section className="mx-4 mt-3 rounded-[24px] border border-border bg-card p-5 shadow-card">
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-extrabold">Allow-list</h2>
        <span className="text-[10px] text-muted-foreground">Essentials always allowed</span>
      </div>
      <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
        On Android, these apps stay accessible while Strict Mode is active. Everything else is blocked with a full-screen lock.
      </p>
      <ul className="mt-3 grid grid-cols-3 gap-2">
        {DEFAULT_ALLOW_LIST.map((a) => (
          <li
            key={a.id}
            className="flex items-center gap-1.5 rounded-xl border border-border bg-background px-2.5 py-1.5 text-[11px] font-semibold"
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                a.essential ? "bg-success" : "bg-muted-foreground",
              )}
            />
            <span className="truncate">{a.name}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ToggleTile({
  icon,
  title,
  desc,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start gap-2.5 pr-2">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-lavender">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <div className="text-[13px] font-bold">{title}</div>
          <button
            onClick={() => onChange(!checked)}
            className={cn(
              "relative h-5 w-9 shrink-0 rounded-full transition-colors",
              checked ? "gradient-primary" : "bg-muted",
            )}
            aria-pressed={checked}
          >
            <span
              className={cn(
                "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all",
                checked ? "left-4" : "left-0.5",
              )}
            />
          </button>
        </div>
        <p className="mt-0.5 text-[10.5px] leading-snug text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}

function TimerRing({ pct, time, label, sub, large = false }: { pct: number; time: string; label: string; sub: string; large?: boolean }) {
  const size = large ? 300 : 190;
  const stroke = large ? 14 : 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (Math.max(0, Math.min(100, pct)) / 100) * c;
  const angle = (pct / 100) * 360 - 90;
  const knobX = size / 2 + r * Math.cos((angle * Math.PI) / 180);
  const knobY = size / 2 + r * Math.sin((angle * Math.PI) / 180);

  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="timerGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="oklch(0.58 0.22 285)" />
            <stop offset="100%" stopColor="oklch(0.66 0.24 305)" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} className="fill-none stroke-muted" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          className="fill-none"
          stroke="url(#timerGrad)"
        />
      </svg>
      <span
        className="absolute h-3 w-3 rounded-full bg-primary shadow-glow"
        style={{ left: knobX - 6, top: knobY - 6 }}
      />
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className={large ? "text-[13px] font-semibold text-muted-foreground" : "text-[11px] font-semibold text-muted-foreground"}>{label}</div>
          <div className={large ? "text-[72px] font-black leading-none tracking-tight tabular-nums" : "text-[38px] font-black leading-none tracking-tight"}>{time}</div>
          <div className={large ? "mt-3 inline-block rounded-full bg-lavender px-3 py-1 text-[12px] font-bold text-primary" : "mt-1.5 inline-block rounded-full bg-lavender px-2.5 py-0.5 text-[10px] font-bold text-primary"}>
            {sub}
          </div>
        </div>
      </div>
    </div>
  );
}
