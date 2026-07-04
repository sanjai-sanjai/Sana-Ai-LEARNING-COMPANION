import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/app/TopBar";
import { ProgressRing } from "@/components/app/ProgressRing";
import sanaHero from "@/assets/sana-hero.png";
import {
  CalendarPlus,
  MessageCircle,
  Sparkles,
  Timer,
  Bell,
  Bot,
  Moon,
  BookOpen,
  CheckCircle2,
  Circle,
  Clock,
  Flame,
  ChevronRight,
  Plus,
  Phone,
  BarChart3,
  Trash2,
  CheckCheck,
  Repeat,
  Trophy,
  Award,
  ListTodo,
  Target,
  ArrowUpRight,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { listReminders, deleteReminder, updateReminderStatus } from "@/lib/reminders.functions";
import { useReminderNotifications } from "@/hooks/use-reminder-notifications";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/home")({
  component: HomePage,
});

function HomePage() {
  useReminderNotifications();
  const qc = useQueryClient();
  const list = useServerFn(listReminders);
  const del = useServerFn(deleteReminder);
  const setStatus = useServerFn(updateReminderStatus);

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data } = await supabase.from("profiles").select("*").eq("user_id", u.user.id).maybeSingle();
      return data;
    },
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const { data } = await supabase.from("tasks").select("*").order("position").limit(6);
      return data ?? [];
    },
  });

  const toggleTaskMut = useMutation({
    mutationFn: async (t: { id: string; is_done: boolean }) => {
      const { error } = await supabase.from("tasks").update({ is_done: !t.is_done }).eq("id", t.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't update task"),
  });

  const addTaskMut = useMutation({
    mutationFn: async (title: string) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const nextPos = (tasks[tasks.length - 1]?.position ?? 0) + 1;
      const { error } = await supabase.from("tasks").insert({
        user_id: u.user.id,
        title,
        position: nextPos,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tasks"] }); toast.success("Task added"); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't add task"),
  });

  const removeTaskMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const promptAddTask = () => {
    const title = window.prompt("New task")?.trim();
    if (title) addTaskMut.mutate(title);
  };

  const { data: reminders = [] } = useQuery<Array<{
    id: string; title: string; scheduled_at: string; type: string;
    repeat_mode: string; status: string; duration_minutes: number;
  }>>({
    queryKey: ["reminders"],
    queryFn: () => list() as never,
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }) as unknown as Promise<unknown>,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["reminders"] }); toast.success("Reminder removed"); },
  });
  const doneMut = useMutation({
    mutationFn: (id: string) => setStatus({ data: { id, status: "done" } }) as unknown as Promise<unknown>,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["reminders"] }); toast.success("Marked as done"); },
  });

  const name = profile?.display_name ?? "Sanjai";
  const xp = profile?.xp ?? 820;
  const level = profile?.level ?? 4;
  const xpPct = Math.min(100, (xp / 1200) * 100);

  return (
    <div className="pb-8">
      <TopBar title={<span>Good Morning, {name}! 👋</span>} subtitle="Ready to make today amazing?" />

      {/* Hero companion card */}
      <section className="mx-4 mt-1">
        <div className="relative overflow-hidden rounded-[28px] border border-border/70 bg-card shadow-card">
          {/* soft gradient wash */}
          <div
            className="pointer-events-none absolute inset-0 opacity-70"
            style={{
              background:
                "radial-gradient(120% 80% at 100% 0%, oklch(0.92 0.06 300 / 0.55), transparent 55%), radial-gradient(90% 60% at 0% 100%, oklch(0.94 0.05 260 / 0.4), transparent 60%)",
            }}
          />

          <div className="relative p-5">
            <div className="grid grid-cols-[1fr_auto] items-start gap-4">
              <div className="min-w-0">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wider text-primary">
                  <Sparkles className="h-3 w-3" /> Your AI Companion
                </span>
                <h2 className="mt-2.5 text-[26px] font-black leading-[1.1] tracking-tight">
                  I&apos;m <span className="font-script text-[34px] text-primary">Sana</span>{" "}
                  <span className="align-middle">✨</span>
                </h2>
                <p className="mt-1.5 text-[12.5px] leading-snug text-muted-foreground">
                  Plan, focus, learn & achieve — I&apos;ll keep you on track today.
                </p>
              </div>
              <img
                src={sanaHero}
                alt="Sana"
                className="h-28 w-auto shrink-0 object-contain drop-shadow-md"
              />
            </div>

            {/* CTAs */}
            <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
              <Link
                to="/reminder"
                className="gradient-primary shadow-soft flex h-12 items-center justify-center gap-2 rounded-2xl text-[13.5px] font-bold text-primary-foreground active:scale-[0.98] transition-transform"
              >
                <CalendarPlus className="h-4 w-4" /> Add Reminder
              </Link>
              <Link
                to="/chat"
                className="flex h-12 items-center gap-2 rounded-2xl border border-primary/25 bg-background/60 px-4 text-[13px] font-bold text-primary backdrop-blur active:scale-[0.98] transition-transform"
                aria-label="Chat with Sana"
              >
                <MessageCircle className="h-4 w-4" /> Chat
              </Link>
            </div>

            {/* Focus Score — horizontal bar */}
            <div className="mt-3 flex items-center gap-3 rounded-2xl border border-border/70 bg-background/70 p-3 backdrop-blur">
              <div className="shrink-0">
                <ProgressRing value={92} size={54} stroke={6} label="92" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <Target className="h-3 w-3 text-primary" /> Focus Score
                </div>
                <div className="mt-0.5 text-[15px] font-black leading-tight">Excellent focus today</div>
                <div className="text-[11px] text-muted-foreground">+8 pts vs. yesterday · keep the streak</div>
              </div>
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-success/15 text-success">
                <ArrowUpRight className="h-4 w-4" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Today's plan + Upcoming call */}
      <section className="mx-4 mt-3 space-y-3">
        <div className="rounded-[24px] border border-border/70 bg-card p-4 shadow-card">
          <SectionHeader icon={<CalendarPlus className="h-3.5 w-3.5" />} title="Today's Plan" action="View all" />

          <div className="mt-3 flex items-start gap-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-amber-200 to-amber-100 text-2xl shadow-sm">
              🐍
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[14px] font-bold leading-tight">Python Preparation</div>
              <div className="mt-1 flex items-center justify-between text-[11px]">
                <span className="font-bold text-primary">66% completed</span>
                <span className="font-semibold text-muted-foreground">4 of 6 tasks</span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="gradient-primary h-full rounded-full transition-all" style={{ width: "66%" }} />
              </div>
            </div>
          </div>

          <ul className="mt-3 divide-y divide-border/50">
            {[
              { done: true, title: "Functions & Modules", time: "09:00 AM" },
              { done: false, title: "File Handling", time: "10:00 AM" },
              { done: false, title: "Exception Handling", time: "11:30 AM" },
              { done: false, title: "Revision + MCQs", time: "02:00 PM" },
            ].map((t) => (
              <li key={t.title} className="flex items-center justify-between py-2.5">
                <span className="flex min-w-0 items-center gap-2.5">
                  {t.done ? (
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary/15">
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                    </span>
                  ) : (
                    <Circle className="h-5 w-5 shrink-0 text-muted-foreground/40" strokeWidth={1.75} />
                  )}
                  <span className={cn("truncate text-[13px]", t.done && "text-muted-foreground line-through")}>
                    {t.title}
                  </span>
                </span>
                <span className="text-[11px] font-semibold text-muted-foreground tabular-nums">{t.time}</span>
              </li>
            ))}
          </ul>
          <button className="mt-2 flex w-full items-center justify-center gap-1 rounded-xl py-1.5 text-[12.5px] font-bold text-primary hover:bg-primary/5">
            View full schedule <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <UpcomingAICall
          reminders={reminders}
          onDone={(id) => doneMut.mutate(id)}
          onDelete={(id) => deleteMut.mutate(id)}
        />
      </section>

      {/* Study Stats */}
      <section className="mx-4 mt-3 rounded-[24px] border border-border/70 bg-card p-4 shadow-card">
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-2 text-[14px] font-extrabold">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-lavender">
              <BarChart3 className="h-3.5 w-3.5 text-primary" />
            </span>
            Study Stats
          </div>
          <button className="rounded-full border border-border bg-background px-3 py-1 text-[11px] font-bold text-muted-foreground">
            This week ▾
          </button>
        </div>

        <div className="mt-3 grid grid-cols-4 gap-2">
          <StatMini icon={<Clock className="h-4 w-4" />} label="Study" value="3h 24m" tone="text-primary" bg="bg-lavender" />
          <StatMini icon={<Timer className="h-4 w-4" />} label="Pomodoro" value="5" sub="sessions" tone="text-destructive" bg="bg-destructive/10" />
          <StatMini icon={<CheckCircle2 className="h-4 w-4" />} label="Tasks" value="7/10" tone="text-success" bg="bg-success/15" />
          <StatMini icon={<Flame className="h-4 w-4" />} label="Streak" value="12" sub="days" tone="text-warning" bg="bg-warning/15" />
        </div>
        <MiniChart />
      </section>

      {/* Quick Actions */}
      <section className="mx-4 mt-3">
        <div className="mb-2 flex items-center justify-between px-1">
          <div className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">Quick actions</div>
          <div className="text-[10.5px] font-semibold text-muted-foreground">Swipe →</div>
        </div>
        <div className="grid grid-cols-5 gap-2">
          <QuickAction to="/chat" icon={<Bot className="h-5 w-5" />} label="Ask AI" tone="text-primary" bg="bg-lavender" />
          <QuickAction to="/reminder" icon={<Bell className="h-5 w-5" />} label="Alarm" tone="text-blue" bg="bg-blue/10" />
          <QuickAction to="/power-nap" icon={<Moon className="h-5 w-5" />} label="Power Nap" tone="text-primary" bg="bg-lavender" />
          <QuickAction to="/pomodoro" icon={<Timer className="h-5 w-5" />} label="Pomodoro" tone="text-destructive" bg="bg-destructive/10" />
          <QuickAction to="/revision" icon={<BookOpen className="h-5 w-5" />} label="Revise" tone="text-blue" bg="bg-blue/10" />
        </div>
      </section>

      {/* Level / XP */}
      <section className="mx-4 mt-3">
        <div className="relative overflow-hidden rounded-[24px] border border-border/70 bg-gradient-to-br from-lavender via-lavender/70 to-background p-4 shadow-card">
          <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-primary/15 blur-2xl" />
          <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
            <div className="gradient-primary grid h-11 w-11 place-items-center rounded-2xl text-primary-foreground shadow-soft">
              <Trophy className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[13.5px] font-extrabold">
                You&apos;re doing great <Flame className="h-3.5 w-3.5 text-warning" />
              </div>
              <div className="text-[11px] text-muted-foreground">Consistency is the secret of success.</div>
            </div>
            <div className="grid h-11 w-11 place-items-center rounded-2xl border border-primary/20 bg-card">
              <Award className="h-5 w-5 text-primary" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span className="text-foreground">Level {level}</span>
              <span className="text-muted-foreground tabular-nums">
                {xp} / 1200 XP
              </span>
            </div>
            <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-background">
              <div className="gradient-primary h-full rounded-full shadow-glow transition-all" style={{ width: `${xpPct}%` }} />
            </div>
          </div>
        </div>
      </section>

      {/* To do */}
      <section className="mx-4 mt-3 rounded-[24px] border border-border/70 bg-card p-4 shadow-card">
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-2 text-[14px] font-extrabold">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-lavender">
              <ListTodo className="h-3.5 w-3.5 text-primary" />
            </span>
            To-Do
          </div>
          <button
            onClick={promptAddTask}
            className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary active:scale-95"
          >
            <Plus className="h-3 w-3" /> Add task
          </button>
        </div>
        {tasks.length === 0 ? (
          <button
            onClick={promptAddTask}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border/70 bg-background/60 py-4 text-[12px] font-semibold text-muted-foreground hover:text-primary"
          >
            <Plus className="h-3.5 w-3.5" /> Add your first task
          </button>
        ) : (
          <ul className="mt-2.5 space-y-1">
            {tasks.map((t) => (
              <li
                key={t.id}
                className="group flex items-center gap-2.5 rounded-xl px-2 py-2 hover:bg-muted/40"
              >
                <button
                  onClick={() => toggleTaskMut.mutate({ id: t.id, is_done: t.is_done })}
                  className="shrink-0"
                  aria-label={t.is_done ? "Mark as not done" : "Mark as done"}
                >
                  {t.is_done ? (
                    <span className="grid h-5 w-5 place-items-center rounded-full bg-primary/15">
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                    </span>
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground/40" strokeWidth={1.75} />
                  )}
                </button>
                <span className={cn("flex-1 truncate text-[13px]", t.is_done && "text-muted-foreground line-through")}>
                  {t.title}
                </span>
                <button
                  onClick={() => removeTaskMut.mutate(t.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Delete task"
                >
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function SectionHeader({ icon, title, action }: { icon: React.ReactNode; title: string; action?: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="inline-flex items-center gap-2 text-[14px] font-extrabold">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-lavender text-primary">{icon}</span>
        {title}
      </div>
      {action && (
        <button className="text-[11.5px] font-bold text-primary hover:underline">{action} →</button>
      )}
    </div>
  );
}

function StatMini({
  icon,
  label,
  value,
  sub,
  tone,
  bg,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  tone: string;
  bg: string;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/60 p-2.5 text-center">
      <div className={cn("mx-auto grid h-9 w-9 place-items-center rounded-2xl", bg, tone)}>{icon}</div>
      <div className="mt-1.5 text-[9.5px] font-bold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-[14px] font-black tabular-nums leading-tight">{value}</div>
      {sub && <div className="text-[9px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

function QuickAction({ icon, label, tone, bg, to }: { icon: React.ReactNode; label: string; tone: string; bg: string; to: string }) {
  return (
    <Link
      to={to}
      className="flex flex-col items-center gap-1.5 rounded-2xl border border-border/70 bg-card p-2.5 shadow-card transition-transform active:scale-95"
    >
      <span className={cn("grid h-11 w-11 place-items-center rounded-2xl", bg, tone)}>{icon}</span>
      <span className="text-[10.5px] font-bold text-center leading-tight">{label}</span>
    </Link>
  );
}

function MiniChart() {
  const pts = [1, 1.8, 1.4, 2.2, 1.6, 2.4, 3.2];
  const w = 260,
    h = 60;
  const max = Math.max(...pts);
  const path = pts
    .map((p, i) => `${i === 0 ? "M" : "L"} ${(i / (pts.length - 1)) * w} ${h - (p / max) * (h - 8) - 4}`)
    .join(" ");
  return (
    <div className="mt-3">
      <svg viewBox={`0 0 ${w} ${h}`} className="h-16 w-full">
        <defs>
          <linearGradient id="area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="oklch(0.58 0.22 285)" stopOpacity="0.35" />
            <stop offset="1" stopColor="oklch(0.58 0.22 285)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${path} L ${w} ${h} L 0 ${h} Z`} fill="url(#area)" />
        <path
          d={path}
          className="fill-none stroke-primary"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {pts.map((p, i) => (
          <circle
            key={i}
            cx={(i / (pts.length - 1)) * w}
            cy={h - (p / max) * (h - 8) - 4}
            r={i === pts.length - 1 ? 3.5 : 2.5}
            className="fill-primary"
          />
        ))}
      </svg>
      <div className="mt-1 flex justify-between text-[10px] font-semibold text-muted-foreground">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Today"].map((d) => (
          <span key={d} className={d === "Today" ? "text-primary" : ""}>
            {d}
          </span>
        ))}
      </div>
    </div>
  );
}

type ReminderItem = {
  id: string;
  title: string;
  scheduled_at: string;
  type: string;
  repeat_mode: string;
  status: string;
  duration_minutes: number;
};

function UpcomingAICall({
  reminders,
  onDone,
  onDelete,
}: {
  reminders: ReminderItem[];
  onDone: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const now = Date.now();
  const upcoming = reminders
    .filter((r) => r.status !== "done" && new Date(r.scheduled_at).getTime() > now)
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
  const next = upcoming[0];
  const rest = upcoming.slice(1, 4);

  return (
    <div className="rounded-[24px] border border-border/70 bg-card p-4 shadow-card">
      <div className="flex items-center justify-between">
        <div className="inline-flex items-center gap-2 text-[14px] font-extrabold">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-lavender text-primary">
            <Phone className="h-3.5 w-3.5" />
          </span>
          Upcoming AI Call
        </div>
        <Link to="/ai-calls" className="text-[11.5px] font-bold text-primary hover:underline">
          View all →
        </Link>
      </div>

      {!next ? (
        <div className="mt-3 rounded-2xl border border-dashed border-border bg-background/50 p-5 text-center">
          <div className="mx-auto grid h-10 w-10 place-items-center rounded-2xl bg-lavender">
            <Phone className="h-5 w-5 text-primary" />
          </div>
          <div className="mt-2 text-[13.5px] font-bold">No AI calls scheduled</div>
          <p className="mt-1 text-[11.5px] leading-snug text-muted-foreground">
            Sana will call you at the time you set — perfect for study nudges.
          </p>
          <Link
            to="/reminder"
            className="mt-3 inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1.5 text-[11px] font-bold text-primary"
          >
            <Plus className="h-3 w-3" /> Schedule AI Call
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-3 flex items-center gap-3 rounded-2xl border border-border/70 bg-background/50 p-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-lavender to-primary/15">
              <span className="text-xl">👩‍🎓</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[17px] font-black leading-none text-primary tabular-nums">
                  {new Date(next.scheduled_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-primary">
                  {formatIn(next.scheduled_at)}
                </span>
                {next.repeat_mode !== "once" && (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-muted px-2 py-0.5 text-[9.5px] font-bold capitalize text-muted-foreground">
                    <Repeat className="h-2.5 w-2.5" /> {next.repeat_mode}
                  </span>
                )}
              </div>
              <div className="mt-1 truncate text-[12px] font-semibold">{next.title}</div>
              <div className="text-[10.5px] text-muted-foreground">{next.duration_minutes} min session</div>
            </div>
            <div className="flex flex-col gap-1.5">
              <button
                onClick={() => onDone(next.id)}
                className="grid h-8 w-8 place-items-center rounded-full bg-success/15 text-success transition-transform active:scale-90"
                aria-label="Mark done"
              >
                <CheckCheck className="h-4 w-4" />
              </button>
              <button
                onClick={() => onDelete(next.id)}
                className="grid h-8 w-8 place-items-center rounded-full bg-destructive/15 text-destructive transition-transform active:scale-90"
                aria-label="Cancel"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {rest.length > 0 && (
            <ul className="mt-3 space-y-1 border-t border-border/50 pt-2.5">
              {rest.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-[12px] hover:bg-muted/40">
                  <div className="flex min-w-0 flex-1 items-center gap-2 truncate">
                    <span className="font-bold text-primary tabular-nums">
                      {new Date(r.scheduled_at).toLocaleString([], {
                        weekday: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <span className="truncate text-muted-foreground">· {r.title}</span>
                  </div>
                  <span className="shrink-0 text-[10px] font-semibold text-muted-foreground">
                    {formatIn(r.scheduled_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <Link
        to="/reminder"
        className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-lavender text-[13px] font-bold text-primary transition-transform active:scale-[0.98]"
      >
        Schedule AI Call <Plus className="h-4 w-4" />
      </Link>
    </div>
  );
}

function formatIn(iso: string) {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return "now";
  const mins = Math.round(diff / 60000);
  if (mins < 60) return `in ${mins} min${mins === 1 ? "" : "s"}`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `in ${hrs} hr${hrs === 1 ? "" : "s"}`;
  const days = Math.round(hrs / 24);
  return `in ${days} day${days === 1 ? "" : "s"}`;
}
