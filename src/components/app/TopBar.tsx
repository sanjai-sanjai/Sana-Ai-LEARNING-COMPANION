import { Link } from "@tanstack/react-router";
import { Menu, Bell, ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import avatarUrl from "@/assets/sana-avatar.png";
import { cn } from "@/lib/utils";

type Props = {
  title?: ReactNode;
  subtitle?: ReactNode;
  onMenu?: () => void;
  back?: string;
  right?: ReactNode;
  className?: string;
};

export function TopBar({ title, subtitle, onMenu, back, right, className }: Props) {
  return (
    <header
      className={cn(
        "grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-5 pt-6 pb-4",
        className,
      )}
    >
      {back ? (
        <Link
          to={back}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-card shadow-card"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
      ) : (
        <button
          type="button"
          onClick={onMenu}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-card shadow-card"
          aria-label="Menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      )}
      <div className="min-w-0">
        {title && <h1 className="truncate text-[22px] font-bold leading-tight">{title}</h1>}
        {subtitle && <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {right}
        <Link to="/notifications" className="relative grid h-11 w-11 place-items-center rounded-2xl bg-card shadow-card" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
            3
          </span>
        </Link>
        <Link to="/profile" className="relative shrink-0" aria-label="Profile">
          <img
            src={avatarUrl}
            alt="Profile"
            className="h-11 w-11 rounded-full border-2 border-card object-cover shadow-card"
          />
          <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card bg-success" />
        </Link>
      </div>
    </header>
  );
}
