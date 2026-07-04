import { createFileRoute } from "@tanstack/react-router";
import { TopBar } from "@/components/app/TopBar";
import sanaAvatar from "@/assets/sana-avatar.png";
import {
  Bell, Trophy, CheckCircle2, Phone, Calendar, Settings, Tag,
  Gift, ShieldCheck, Target,
} from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/notifications")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Notifications — Sana" },
      { name: "description", content: "Stay updated with reminders, AI calls, and study milestones." },
    ],
  }),
  component: NotificationsPage,
});

type Category = "reminder" | "ai_call" | "system" | "offer" | "achievement";
type Bucket = "Today" | "Yesterday" | "This Week" | "Earlier";

type N = {
  id: string;
  category: Category;
  title: string;
  body: string;
  time: string;
  bucket: Bucket;
  unread: boolean;
  withSana?: boolean;
  tint: "lavender" | "amber" | "green" | "pink" | "sky" | "neutral";
  icon: React.ComponentType<{ className?: string }>;
};

const SEED: N[] = [
  { id: "1", category: "ai_call", title: "Upcoming AI Call with Sana", body: "Sana will call you for “Functions & Modules Revision”\nToday at 09:00 AM", time: "8:30 AM", bucket: "Today", unread: true, withSana: true, tint: "lavender", icon: Phone },
  { id: "2", category: "reminder", title: "Reminder Set Successfully", body: "“Functions & Modules Revision” is set for\nToday at 09:00 AM", time: "8:29 AM", bucket: "Today", unread: true, tint: "amber", icon: Bell },
  { id: "3", category: "system", title: "Focus Score Update", body: "Great job! Your Focus Score improved to 92.\nKeep the momentum going!", time: "7:45 AM", bucket: "Today", unread: true, tint: "green", icon: Target },
  { id: "4", category: "reminder", title: "Study Session Completed", body: "You completed “Python Preparation” session.\nKeep going, Sanjay!", time: "Yesterday, 08:15 PM", bucket: "Yesterday", unread: true, tint: "lavender", icon: Calendar },
  { id: "5", category: "achievement", title: "Daily Goal Achieved", body: "Amazing! You've completed 3 out of 3 tasks today. You're on fire! 🔥", time: "Yesterday, 07:30 PM", bucket: "Yesterday", unread: true, tint: "green", icon: CheckCircle2 },
  { id: "6", category: "ai_call", title: "AI Call Missed", body: "Sana tried to call you for “Revision + MCQs”\nYesterday at 02:00 PM", time: "May 23, 02:00 PM", bucket: "This Week", unread: false, withSana: true, tint: "neutral", icon: Phone },
  { id: "7", category: "achievement", title: "New Badge Earned 🏆", body: "You earned the “Consistent Learner” badge.\nConsistency is your superpower!", time: "May 22, 09:10 PM", bucket: "This Week", unread: false, tint: "pink", icon: Trophy },
  { id: "8", category: "offer", title: "Special Offer for You!", body: "Unlock Premium and get 20% OFF\nvalid for 24 hours only!", time: "May 22, 11:00 AM", bucket: "This Week", unread: false, tint: "pink", icon: Gift },
  { id: "9", category: "system", title: "App Update Available", body: "Version 2.3.0 is now available.\nTap to update and enjoy new features!", time: "May 20, 06:45 PM", bucket: "Earlier", unread: false, tint: "neutral", icon: Settings },
];

const TABS: { id: "all" | Category; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "all", label: "All", icon: Bell },
  { id: "reminder", label: "Reminders", icon: Calendar },
  { id: "ai_call", label: "AI Calls", icon: Phone },
  { id: "system", label: "System", icon: Settings },
  { id: "offer", label: "Offers", icon: Tag },
];

const TINT: Record<N["tint"], { card: string; icon: string }> = {
  lavender: { card: "bg-lavender/50 border-lavender-deep/30", icon: "bg-card text-primary" },
  amber:    { card: "bg-warning/10 border-warning/25",         icon: "bg-card text-warning" },
  green:    { card: "bg-success/10 border-success/25",         icon: "bg-card text-success" },
  pink:     { card: "bg-pink/10 border-pink/25",               icon: "bg-card text-pink" },
  sky:      { card: "bg-blue/10 border-blue/25",               icon: "bg-card text-blue" },
  neutral:  { card: "bg-card border-border",                    icon: "bg-muted text-muted-foreground" },
};

function NotificationsPage() {
  const [items, setItems] = useState<N[]>(SEED);
  const [tab, setTab] = useState<"all" | Category>("all");

  const filtered = useMemo(
    () => (tab === "all" ? items : items.filter((n) => n.category === tab)),
    [items, tab],
  );

  const grouped = useMemo(() => {
    const order: Bucket[] = ["Today", "Yesterday", "This Week", "Earlier"];
    return order
      .map((b) => ({ bucket: b, list: filtered.filter((n) => n.bucket === b) }))
      .filter((g) => g.list.length > 0);
  }, [filtered]);

  const markAllToday = () =>
    setItems((prev) => prev.map((n) => (n.bucket === "Today" ? { ...n, unread: false } : n)));

  const markOne = (id: string) =>
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, unread: false } : n)));

  return (
    <div className="pb-8">
      <TopBar title="Notifications" subtitle="Stay updated with everything important." back="/home" />

      {/* Filter chips */}
      <div className="no-scrollbar -mx-1 mt-1 flex gap-2 overflow-x-auto px-5 pb-1">
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-2xl border px-3.5 py-2 text-xs font-bold transition",
                active
                  ? "border-primary bg-lavender text-primary shadow-card"
                  : "border-border bg-card text-foreground",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          );
        })}
      </div>

      {/* Groups */}
      <div className="mx-5 mt-5 space-y-6">
        {grouped.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-border p-10 text-center">
            <Bell className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">You're all caught up</p>
          </div>
        ) : (
          grouped.map(({ bucket, list }) => (
            <section key={bucket}>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-black">{bucket}</h2>
                {bucket === "Today" && list.some((n) => n.unread) && (
                  <button onClick={markAllToday} className="text-xs font-bold text-primary">
                    Mark all as read
                  </button>
                )}
              </div>
              <ul className="space-y-2.5">
                {list.map((n) => (
                  <li key={n.id}>
                    <button
                      onClick={() => markOne(n.id)}
                      className={cn(
                        "grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 rounded-2xl border p-3.5 text-left shadow-card transition",
                        TINT[n.tint].card,
                      )}
                    >
                      {/* Icon (+ optional Sana avatar) */}
                      <div className="flex shrink-0 items-center">
                        <div className={cn("grid h-11 w-11 place-items-center rounded-2xl shadow-card", TINT[n.tint].icon)}>
                          <n.icon className="h-5 w-5" />
                        </div>
                        {n.withSana && (
                          <img
                            src={sanaAvatar}
                            alt=""
                            className="-ml-2 h-11 w-11 rounded-full border-2 border-card object-cover"
                          />
                        )}
                      </div>

                      {/* Text */}
                      <div className="min-w-0">
                        <div className="truncate text-sm font-black">{n.title}</div>
                        <p className="mt-0.5 whitespace-pre-line text-xs leading-snug text-muted-foreground">
                          {n.body}
                        </p>
                      </div>

                      {/* Time + dot */}
                      <div className="flex shrink-0 flex-col items-end gap-2 pt-0.5">
                        <span className="text-[10px] font-semibold text-muted-foreground">{n.time}</span>
                        <span
                          className={cn(
                            "h-2 w-2 rounded-full",
                            n.unread ? "bg-primary" : "bg-muted-foreground/40",
                          )}
                        />
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}

        {/* Enable notifications promo */}
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-[24px] border border-primary/25 bg-lavender/60 p-4">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-card text-primary shadow-card">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-black">Don't miss important updates!</div>
            <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
              Enable notifications to stay on track and never miss AI calls or reminders.
            </p>
          </div>
          <button
            onClick={() => {
              if (typeof window !== "undefined" && "Notification" in window) {
                Notification.requestPermission().catch(() => {});
              }
            }}
            className="shrink-0 rounded-full border border-primary bg-card px-4 py-2 text-xs font-bold text-primary"
          >
            Enable Now
          </button>
        </div>
      </div>
    </div>
  );
}
