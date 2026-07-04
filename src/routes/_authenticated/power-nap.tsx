import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Moon,
  Play,
  Pause,
  RotateCcw,
  Phone,
  Minus,
  Plus,
  BellRing,
  Sparkles,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  createVoiceCallReminder,
  getMyPhone,
} from "@/lib/voice-reminders.functions";

export const Route = createFileRoute("/_authenticated/power-nap")({
  ssr: false,
  component: PowerNapPage,
});

function fmt(s: number) {
  const m = Math.floor(s / 60).toString().padStart(2, "0");
  const r = (s % 60).toString().padStart(2, "0");
  return `${m}:${r}`;
}

function PowerNapPage() {
  const navigate = useNavigate();
  const [minutes, setMinutes] = useState(15);
  const [remaining, setRemaining] = useState(15 * 60);
  const [running, setRunning] = useState(false);
  const [caringCall, setCaringCall] = useState(true);
  const [scheduled, setScheduled] = useState<string | null>(null);
  const [alarming, setAlarming] = useState(false);
  const tickRef = useRef<number | null>(null);
  const audioRef = useRef<{ ctx: AudioContext; stop: () => void } | null>(null);

  const getPhone = useServerFn(getMyPhone);
  const scheduleCall = useServerFn(createVoiceCallReminder);
  const { data: phoneData } = useQuery({
    queryKey: ["my-phone"],
    queryFn: () => getPhone() as unknown as Promise<{ phone: string | null }>,
  });
  const hasPhone = !!phoneData?.phone;

  // Reset timer when minutes change while stopped
  useEffect(() => {
    if (!running) setRemaining(minutes * 60);
  }, [minutes, running]);

  useEffect(() => {
    if (!running) return;
    tickRef.current = window.setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          window.clearInterval(tickRef.current!);
          setRunning(false);
          triggerAlarm();
          return 0;
        }
        return r - 1;
      });
    }, 1000) as unknown as number;
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
    };
  }, [running]);

  const triggerAlarm = () => {
    setAlarming(true);
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AC();
      let stopped = false;
      const loop = () => {
        if (stopped) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.35, ctx.currentTime + 0.05);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6);
        osc.connect(gain).connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.65);
        window.setTimeout(loop, 900);
      };
      loop();
      if ("vibrate" in navigator) navigator.vibrate?.([400, 200, 400, 200, 400]);
      audioRef.current = {
        ctx,
        stop: () => {
          stopped = true;
          ctx.close().catch(() => {});
        },
      };
    } catch {
      /* audio unavailable */
    }
  };

  const stopAlarm = () => {
    audioRef.current?.stop();
    audioRef.current = null;
    setAlarming(false);
  };

  const start = async () => {
    setRemaining(minutes * 60);
    setRunning(true);
    setScheduled(null);
    if (caringCall && hasPhone) {
      try {
        const when = new Date(Date.now() + minutes * 60 * 1000 + 5_000).toISOString();
        await scheduleCall({
          data: {
            title: `Post-nap wake-up call`,
            phone_e164: phoneData!.phone!,
            study_topic: "Waking up refreshed and ready to study",
            motivation_style: "friendly_coach",
            scheduled_at: when,
            repeat_type: "once",
          },
        });
        setScheduled(when);
        toast.success("Sana will call you when your nap ends 💜");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Couldn't schedule the call");
      }
    } else if (caringCall && !hasPhone) {
      toast.message("Add your phone number first", {
        description: "Set it in AI Calls to enable Caring Calls.",
        action: { label: "Set up", onClick: () => navigate({ to: "/ai-calls" }) },
      });
    }
  };

  const reset = () => {
    setRunning(false);
    setRemaining(minutes * 60);
    stopAlarm();
  };

  const pct = ((minutes * 60 - remaining) / (minutes * 60)) * 100;

  return (
    <div className="pb-8">
      <header className="flex items-center gap-3 px-4 pt-5 pb-4">
        <Link
          to="/home"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-border bg-card shadow-card"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[17px] font-extrabold leading-tight">Power Nap</h1>
          <p className="truncate text-[11px] text-muted-foreground">Rest, recharge, get back to studying.</p>
        </div>
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-lavender">
          <Moon className="h-5 w-5 text-primary" />
        </div>
      </header>

      {/* Duration selector */}
      <section className="mx-4 rounded-[24px] border border-border bg-card p-5 shadow-card">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Nap Duration</div>
            <div className="mt-1 text-[13px] text-muted-foreground">Choose between 1 and 20 minutes.</div>
          </div>
          <div className="text-right">
            <div className="text-[36px] font-black leading-none tabular-nums">{minutes}</div>
            <div className="text-[11px] font-semibold text-muted-foreground">min</div>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={() => setMinutes((m) => Math.max(1, m - 1))}
            disabled={running || minutes <= 1}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-border bg-background shadow-card disabled:opacity-40"
            aria-label="Decrease"
          >
            <Minus className="h-4 w-4" />
          </button>
          <input
            type="range"
            min={1}
            max={20}
            step={1}
            value={minutes}
            disabled={running}
            onChange={(e) => setMinutes(parseInt(e.target.value, 10))}
            className="flex-1 accent-primary disabled:opacity-40"
          />
          <button
            onClick={() => setMinutes((m) => Math.min(20, m + 1))}
            disabled={running || minutes >= 20}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-border bg-background shadow-card disabled:opacity-40"
            aria-label="Increase"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {[5, 10, 15, 20].map((p) => (
            <button
              key={p}
              disabled={running}
              onClick={() => setMinutes(p)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-[12px] font-bold transition",
                minutes === p
                  ? "border-primary/40 bg-lavender text-primary"
                  : "border-border bg-background text-foreground",
                running && "opacity-40",
              )}
            >
              {p} min
            </button>
          ))}
        </div>
      </section>

      {/* Timer ring */}
      <section className="mx-4 mt-3 rounded-[24px] border border-border bg-card p-5 shadow-card">
        <div className="flex justify-center">
          <NapRing pct={pct} time={fmt(remaining)} label={running ? "Napping…" : alarming ? "Time's up!" : "Ready"} />
        </div>

        <div className="mt-6 flex items-center gap-3">
          {alarming ? (
            <button
              onClick={stopAlarm}
              className="gradient-primary shadow-soft flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl text-[15px] font-bold text-primary-foreground active:scale-[0.98]"
            >
              <Check className="h-5 w-5" /> I&apos;m awake
            </button>
          ) : (
            <button
              onClick={() => (running ? setRunning(false) : start())}
              className="gradient-primary shadow-soft flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl text-[15px] font-bold text-primary-foreground active:scale-[0.98]"
            >
              {running ? <Pause className="h-5 w-5 fill-white" /> : <Play className="h-5 w-5 fill-white" />}
              {running ? "Pause" : "Start Nap"}
            </button>
          )}
          <button
            onClick={reset}
            className="grid h-14 w-14 place-items-center rounded-2xl border border-border bg-card shadow-card"
            aria-label="Reset"
          >
            <RotateCcw className="h-5 w-5" />
          </button>
        </div>

        {scheduled && !alarming && (
          <div className="mt-3 flex items-center gap-2 rounded-2xl border border-primary/20 bg-lavender/60 px-3 py-2 text-[12px] text-primary">
            <BellRing className="h-3.5 w-3.5" />
            <span className="font-semibold">
              Sana will call at {new Date(scheduled).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        )}
      </section>

      {/* Caring Call */}
      <section className="mx-4 mt-3 rounded-[24px] border border-border bg-card p-5 shadow-card">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-lavender">
            <Phone className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3">
              <div className="text-[15px] font-extrabold">Caring Call</div>
              <button
                onClick={() => setCaringCall((v) => !v)}
                aria-pressed={caringCall}
                className={cn(
                  "relative h-7 w-12 shrink-0 rounded-full transition",
                  caringCall ? "bg-primary" : "bg-muted",
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all",
                    caringCall ? "left-[22px]" : "left-0.5",
                  )}
                />
              </button>
            </div>
            <p className="mt-1 text-[12.5px] leading-snug text-muted-foreground">
              When your nap ends, Sana rings you with a warm, motivating pep-talk so you jump straight back into studying.
            </p>
            {caringCall && !hasPhone && (
              <div className="mt-2 flex items-center gap-2 rounded-xl border border-warning/30 bg-warning/10 px-3 py-2 text-[11.5px] font-semibold text-warning-foreground">
                <Sparkles className="h-3.5 w-3.5 text-warning" />
                <span className="text-warning">Add your phone in AI Calls to enable this.</span>
              </div>
            )}
            {caringCall && hasPhone && (
              <div className="mt-2 text-[11px] font-semibold text-muted-foreground">
                Ringing: <span className="text-foreground">{phoneData!.phone}</span>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function NapRing({ pct, time, label }: { pct: number; time: string; label: string }) {
  const size = 260;
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (Math.max(0, Math.min(100, pct)) / 100) * c;

  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="napGrad" x1="0" y1="0" x2="1" y2="1">
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
          stroke="url(#napGrad)"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="text-[12px] font-semibold text-muted-foreground">{label}</div>
          <div className="text-[64px] font-black leading-none tracking-tight tabular-nums">{time}</div>
          <div className="mt-2 inline-block rounded-full bg-lavender px-3 py-1 text-[11px] font-bold text-primary">
            Rest mode
          </div>
        </div>
      </div>
    </div>
  );
}
