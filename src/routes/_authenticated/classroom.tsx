import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { GraduationCap, LayoutDashboard, ClipboardList, Megaphone, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/classroom")({
  component: ClassroomLayout,
});

const tabs: Array<{ to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean }> = [
  { to: "/classroom", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/classroom/assignments", label: "Assignments", icon: ClipboardList },
  { to: "/classroom/announcements", label: "Announcements", icon: Megaphone },
  { to: "/classroom/settings", label: "Settings", icon: Settings },
];

function ClassroomLayout() {
  const loc = useLocation();
  return (
    <div className="flex h-[calc(100svh-64px)] min-h-0 flex-col md:h-[calc(100svh-3rem-64px)]">
      <header className="shrink-0 border-b border-border/60 px-5 pb-3 pt-6">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-warning/15 text-warning">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-black leading-tight">Classroom Hub</h1>
            <p className="text-[11px] text-muted-foreground">Your Google Classroom, synced &amp; searchable.</p>
          </div>
        </div>
        <nav className="no-scrollbar mt-4 flex gap-2 overflow-x-auto">
          {tabs.map((t) => {
            const active = t.exact ? loc.pathname === t.to : loc.pathname.startsWith(t.to);
            const Icon = t.icon;
            return (
              <Link
                key={t.to}
                to={t.to}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-bold transition",
                  active
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {t.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 pb-8 pt-4">
        <Outlet />
      </div>
    </div>
  );
}
