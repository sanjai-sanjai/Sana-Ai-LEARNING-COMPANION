import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo, useState } from "react";
import { ClipboardList, ExternalLink, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/classroom/assignments")({
  component: AssignmentsPage,
});

type Filter = "upcoming" | "overdue" | "all";

function AssignmentsPage() {
  const [filter, setFilter] = useState<Filter>("upcoming");

  const { data: courses } = useQuery({
    queryKey: ["classroom-courses"],
    queryFn: async () => {
      const { data } = await supabase
        .from("classroom_courses")
        .select("google_course_id, name")
        .order("name");
      return data ?? [];
    },
  });
  const courseMap = useMemo(
    () => new Map((courses ?? []).map((c) => [c.google_course_id, c.name])),
    [courses],
  );

  const { data: items, isLoading } = useQuery({
    queryKey: ["classroom-assignments", filter],
    queryFn: async () => {
      let q = supabase
        .from("classroom_coursework")
        .select("id, title, description, due_at, alternate_link, google_course_id, work_type, max_points, state")
        .order("due_at", { ascending: filter !== "overdue", nullsFirst: false });
      const nowIso = new Date().toISOString();
      if (filter === "upcoming") q = q.gte("due_at", nowIso);
      else if (filter === "overdue") q = q.lt("due_at", nowIso).not("due_at", "is", null);
      const { data } = await q.limit(200);
      return data ?? [];
    },
  });

  const grouped = useMemo(() => groupByDay(items ?? []), [items]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="inline-flex items-center gap-1.5 text-[12px] font-bold text-muted-foreground">
          <Filter className="h-3.5 w-3.5" /> Filter
        </div>
        <div className="flex gap-1.5 rounded-full border border-border bg-card p-1 shadow-card">
          {(["upcoming", "overdue", "all"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-full px-3 py-1.5 text-[11px] font-bold capitalize transition",
                filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground",
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-muted" />)}
        </div>
      ) : !items?.length ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center text-[12px] text-muted-foreground">
          Nothing here. Try switching filters or sync your classroom.
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map((g) => (
            <section key={g.label}>
              <h3 className="mb-1.5 px-1 text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                {g.label}
              </h3>
              <ul className="space-y-2">
                {g.items.map((a) => (
                  <li key={a.id}>
                    <AssignmentRow
                      title={a.title}
                      subtitle={`${courseMap.get(a.google_course_id) ?? "Course"}${a.max_points ? ` · ${a.max_points} pts` : ""}${a.work_type ? ` · ${prettyWorkType(a.work_type)}` : ""}`}
                      due={a.due_at}
                      href={a.alternate_link ?? undefined}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function AssignmentRow({ title, subtitle, due, href }: {
  title: string; subtitle: string; due: string | null; href?: string;
}) {
  const overdue = due ? new Date(due).getTime() < Date.now() : false;
  const inner = (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-card transition hover:border-primary/40">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue/10 text-blue">
        <ClipboardList className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-bold">{title}</span>
        <span className="block truncate text-[11px] text-muted-foreground">{subtitle}</span>
      </span>
      <span className="flex flex-col items-end gap-0.5">
        <span className={cn(
          "rounded-full px-2 py-0.5 text-[10px] font-bold",
          overdue ? "bg-destructive/10 text-destructive" : due ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
        )}>
          {fmtDueShort(due)}
        </span>
        {href && <ExternalLink className="h-3 w-3 text-muted-foreground" />}
      </span>
    </div>
  );
  return href ? <a href={href} target="_blank" rel="noopener noreferrer">{inner}</a> : inner;
}

function groupByDay(rows: Array<{ due_at: string | null; [k: string]: any }>) {
  const groups: Record<string, typeof rows> = {};
  for (const r of rows) {
    const label = bucketLabel(r.due_at);
    (groups[label] ||= []).push(r);
  }
  const order = ["Overdue", "Today", "Tomorrow", "This Week", "Later", "No due date"];
  return order
    .filter((l) => groups[l]?.length)
    .map((l) => ({ label: l, items: groups[l] }));
}

function bucketLabel(iso: string | null): string {
  if (!iso) return "No due date";
  const t = new Date(iso).getTime();
  const days = Math.floor((t - startOfToday()) / 86400000);
  if (days < 0) return "Overdue";
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days <= 7) return "This Week";
  return "Later";
}
function startOfToday() {
  const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime();
}

function fmtDueShort(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function prettyWorkType(w: string) {
  return w.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}
