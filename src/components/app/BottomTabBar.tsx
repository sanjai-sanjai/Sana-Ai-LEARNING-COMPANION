import { Link, useLocation } from "@tanstack/react-router";
import { Home, MessageCircle, BookOpen, Timer, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/chat", label: "Chat", icon: MessageCircle },
  { to: "/revision", label: "Revision", icon: BookOpen },
  { to: "/pomodoro", label: "Pomodoro", icon: Timer },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
];

export function BottomTabBar() {
  const loc = useLocation();
  return (
    <nav
      className="pointer-events-auto sticky bottom-0 left-0 right-0 z-30 border-t border-border/60 bg-background/95 backdrop-blur-xl"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0.25rem)" }}
    >
      <ul className="mx-auto grid max-w-md grid-cols-5 px-2 pt-2">
        {items.map(({ to, label, icon: Icon }) => {
          const active = loc.pathname.startsWith(to);
          return (
            <li key={to}>
              <Link
                to={to}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl py-1.5 text-[11px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span
                  className={cn(
                    "grid h-9 w-9 place-items-center rounded-2xl transition-colors",
                    active && "bg-primary/10",
                  )}
                >
                  <Icon className={cn("h-5 w-5", active && "fill-primary/15")} strokeWidth={active ? 2.4 : 2} />
                </span>
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
