import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getClassroomConnection } from "@/lib/classroom.functions";
import { getClassroomSyncSummary } from "@/lib/classroom-sync.functions";
import {
  BookOpen, ClipboardList, Megaphone, FileStack, Sparkles, RefreshCw, ExternalLink, Clock, GraduationCap,
} from "lucide-react";
import { motion } from "framer-motion";

export const Route = createFileRoute("/_authenticated/classroom/")({
  component: ClassroomOverview,
});

function ClassroomOverview() {
  const getConn = useServerFn(getClassroomConnection);
  const getSummary = useServerFn(getClassroomSyncSummary);

  const { data: conn, isLoading: connLoading } = useQuery({
    queryKey: ["classroom-connection"],
    queryFn: () => getConn(),
    staleTime: 30_000,
  });
  const { data: summary } = useQuery({
    queryKey: ["classroom-sync-summary"],
    queryFn: () => getSummary(),
    staleTime: 30_000,
    enabled: !!conn?.connected,
  });

  const { data: courses } = useQuery({
    queryKey: ["classroom-courses"],
    enabled: !!conn?.connected,
    queryFn: async () => {
      const { data } = await supabase
        .from("classroom_courses")
        .select("google_course_id, name, section, alternate_link, course_state")
        .order("name");
      return data ?? [];
    },
  });

  const { data: upcoming } = useQuery({
    queryKey: ["classroom-upcoming"],
    enabled: !!conn?.connected,
    queryFn: async () => {
      const nowIso = new Date().toISOString();
      const { data } = await supabase
        .from("classroom_coursework")
        .select("id, title, due_at, alternate_link, google_course_id, work_type, max_points")
        .not("due_at", "is", null)
        .gte("due_at", nowIso)
        .order("due_at", { ascending: true })
        .limit(5);
      return data ?? [];
    },
  });

  const { data: recentAnnouncements } = useQuery({
    queryKey: ["classroom-recent-announcements"],
    enabled: !!conn?.connected,
    queryFn: async () => {
      const { data } = await supabase
        .from("classroom_announcements")
        .select("id, text, alternate_link, google_updated_at, google_course_id")
        .order("google_updated_at", { ascending: false })
        .limit(4);
      return data ?? [];
    },
  });

  if (connLoading) return <SkeletonBlock />;
  if (!conn?.connected) return <NotConnectedCTA />;

  const stats = [
    { icon: BookOpen, label: "Courses", value: summary?.courses ?? 0, tint: "text-primary bg-primary/10" },
    { icon: ClipboardList, label: "Assignments", value: summary?.coursework ?? 0, tint: "text-blue bg-blue/10" },
    { icon: Megaphone, label: "Announcements", value: summary?.announcements ?? 0, tint: "text-warning bg-warning/15" },
    { icon: FileStack, label: "Materials", value: summary?.materials ?? 0, tint: "text-success bg-success/10" },
  ];

  const courseMap = new Map<string, string>();
  for (const c of courses ?? []) courseMap.set(c.google_course_id, c.name);

  return (
    <div className="space-y-5">
      {/* Hero card */}
      <motion.div
        initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-warning/15 via-primary/10 to-transparent p-5 shadow-card"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-card/70 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary shadow-card">
              <Sparkles className="h-3 w-3" /> AI-grounded
            </div>
            <h2 className="mt-2 text-xl font-black leading-tight">
              Ask anything about your classes
            </h2>
            <p className="mt-1 text-[12px] text-muted-foreground">
              Sana answers using your synced assignments, materials, and lectures — with citations.
            </p>
          </div>
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-card/70 text-warning shadow-card">
            <GraduationCap className="h-7 w-7" />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <Link
            to="/chat"
            className="gradient-primary inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[12px] font-bold text-white shadow-soft"
          >
            Ask Sana
          </Link>
          <Link
            to="/classroom/settings"
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-2 text-[12px] font-bold text-foreground shadow-card"
          >
            <RefreshCw className="h-3 w-3" /> Sync &amp; settings
          </Link>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-border/60 bg-card p-3 shadow-card">
            <div className={`grid h-8 w-8 place-items-center rounded-xl ${s.tint}`}>
              <s.icon className="h-4 w-4" />
            </div>
            <div className="mt-2 text-2xl font-black leading-none">{s.value}</div>
            <div className="mt-1 text-[11px] font-semibold text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Upcoming */}
      <Section title="Due soon" href="/classroom/assignments">
        {upcoming && upcoming.length ? (
          <ul className="space-y-2">
            {upcoming.map((a) => (
              <li key={a.id}>
                <ItemRow
                  icon={<ClipboardList className="h-4 w-4 text-blue" />}
                  iconTint="bg-blue/10"
                  title={a.title}
                  subtitle={`${courseMap.get(a.google_course_id) ?? "Course"} · ${fmtDue(a.due_at)}`}
                  href={a.alternate_link ?? undefined}
                />
              </li>
            ))}
          </ul>
        ) : (
          <Empty text="No upcoming assignments 🎉" />
        )}
      </Section>

      {/* Announcements */}
      <Section title="Recent announcements" href="/classroom/announcements">
        {recentAnnouncements && recentAnnouncements.length ? (
          <ul className="space-y-2">
            {recentAnnouncements.map((a) => (
              <li key={a.id}>
                <ItemRow
                  icon={<Megaphone className="h-4 w-4 text-warning" />}
                  iconTint="bg-warning/15"
                  title={truncate(a.text ?? "Announcement", 90)}
                  subtitle={`${courseMap.get(a.google_course_id) ?? "Course"} · ${fmtRelative(a.google_updated_at)}`}
                  href={a.alternate_link ?? undefined}
                />
              </li>
            ))}
          </ul>
        ) : (
          <Empty text="Nothing new lately." />
        )}
      </Section>

      {/* Courses */}
      <Section title={`Your courses${courses?.length ? ` (${courses.length})` : ""}`}>
        {courses && courses.length ? (
          <div className="grid grid-cols-1 gap-2">
            {courses.map((c) => (
              <a
                key={c.google_course_id}
                href={c.alternate_link ?? "#"}
                target={c.alternate_link ? "_blank" : undefined}
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-card transition hover:border-primary/40"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <BookOpen className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-bold">{c.name}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {c.section ?? c.course_state ?? "Google Classroom"}
                  </span>
                </span>
                {c.alternate_link && <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />}
              </a>
            ))}
          </div>
        ) : (
          <Empty text="No courses synced yet — try Sync now." />
        )}
      </Section>
    </div>
  );
}

function Section({ title, href, children }: { title: string; href?: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-[13px] font-black uppercase tracking-wider text-muted-foreground">{title}</h3>
        {href && (
          <Link to={href as any} className="text-[11px] font-bold text-primary">See all →</Link>
        )}
      </div>
      {children}
    </section>
  );
}

function ItemRow({ icon, iconTint, title, subtitle, href }: {
  icon: React.ReactNode; iconTint: string; title: string; subtitle: string; href?: string;
}) {
  const inner = (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-card transition hover:border-primary/40">
      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${iconTint}`}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-bold">{title}</span>
        <span className="block truncate text-[11px] text-muted-foreground">{subtitle}</span>
      </span>
      {href && <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />}
    </div>
  );
  return href ? <a href={href} target="_blank" rel="noopener noreferrer">{inner}</a> : inner;
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border p-5 text-center text-[12px] text-muted-foreground">
      {text}
    </div>
  );
}

function NotConnectedCTA() {
  return (
    <div className="rounded-3xl border border-border bg-card p-6 text-center shadow-card">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-warning/15 text-warning">
        <GraduationCap className="h-7 w-7" />
      </div>
      <h2 className="mt-3 text-lg font-black">Connect Google Classroom</h2>
      <p className="mt-1 text-[12px] text-muted-foreground">
        Sync your courses, assignments, and materials so Sana can answer with citations.
      </p>
      <Link
        to="/chat"
        className="gradient-primary mt-4 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[12px] font-bold text-white shadow-soft"
      >
        Connect from Chat
      </Link>
    </div>
  );
}

function SkeletonBlock() {
  return (
    <div className="space-y-3">
      <div className="h-40 animate-pulse rounded-3xl bg-muted" />
      <div className="grid grid-cols-2 gap-2">
        {[0, 1, 2, 3].map((i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-muted" />)}
      </div>
    </div>
  );
}

function truncate(s: string, n: number) {
  const clean = s.replace(/\s+/g, " ").trim();
  return clean.length > n ? clean.slice(0, n - 1) + "…" : clean;
}

function fmtDue(iso: string | null) {
  if (!iso) return "No due date";
  const d = new Date(iso);
  const diff = d.getTime() - Date.now();
  const days = Math.round(diff / 86400000);
  if (days < 0) return "Overdue";
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  if (days < 7) return `Due in ${days} days`;
  return `Due ${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
}

function fmtRelative(iso: string | null) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

// Keep icons referenced so tree-shaking doesn't complain.
void Clock;
