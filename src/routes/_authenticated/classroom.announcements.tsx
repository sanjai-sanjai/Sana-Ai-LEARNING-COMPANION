import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo } from "react";
import { Megaphone, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/_authenticated/classroom/announcements")({
  component: AnnouncementsPage,
});

function AnnouncementsPage() {
  const { data: courses } = useQuery({
    queryKey: ["classroom-courses"],
    queryFn: async () => {
      const { data } = await supabase
        .from("classroom_courses")
        .select("google_course_id, name");
      return data ?? [];
    },
  });
  const courseMap = useMemo(
    () => new Map((courses ?? []).map((c) => [c.google_course_id, c.name])),
    [courses],
  );

  const { data, isLoading } = useQuery({
    queryKey: ["classroom-announcements"],
    queryFn: async () => {
      const { data } = await supabase
        .from("classroom_announcements")
        .select("id, text, alternate_link, google_updated_at, google_course_id")
        .order("google_updated_at", { ascending: false })
        .limit(100);
      return data ?? [];
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2, 3].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />)}
      </div>
    );
  }

  if (!data?.length) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-8 text-center text-[12px] text-muted-foreground">
        No announcements yet.
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {data.map((a) => {
        const inner = (
          <article className="rounded-2xl border border-border bg-card p-3.5 shadow-card transition hover:border-primary/40">
            <header className="flex items-center gap-2">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-warning/15 text-warning">
                <Megaphone className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12px] font-bold">
                  {courseMap.get(a.google_course_id) ?? "Course"}
                </span>
                <span className="block truncate text-[10px] text-muted-foreground">
                  {fmtDate(a.google_updated_at)}
                </span>
              </span>
              {a.alternate_link && <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />}
            </header>
            <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-[12.5px] leading-relaxed text-foreground">
              {a.text ?? "—"}
            </p>
          </article>
        );
        return (
          <li key={a.id}>
            {a.alternate_link ? (
              <a href={a.alternate_link} target="_blank" rel="noopener noreferrer">
                {inner}
              </a>
            ) : inner}
          </li>
        );
      })}
    </ul>
  );
}

function fmtDate(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
