import { Shield, ArrowRight, AlertTriangle } from "lucide-react";
import { sanaLine } from "@/lib/strict-mode";
import sanaAvatar from "@/assets/sana-avatar.png";

type Props = {
  open: boolean;
  remainingLabel: string;
  distractions: number;
  blockedApp: string | null;
  onReturn: () => void;
  onEmergency: () => void;
};

/**
 * Full-screen lock overlay shown when the user tries to leave the focus
 * session (tab away, minimise, in-app back navigation). This is the
 * web-scope equivalent of the Android system overlay: it can only cover
 * Sana itself, not other apps.
 */
export function StrictModeOverlay({
  open,
  remainingLabel,
  distractions,
  blockedApp,
  onReturn,
  onEmergency,
}: Props) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-background/60 px-5 backdrop-blur-xl animate-in fade-in duration-300"
      role="dialog"
      aria-modal="true"
      aria-label="Strict Mode is active"
    >
      <div
        className="gradient-primary relative w-full max-w-sm overflow-hidden rounded-[32px] p-6 text-primary-foreground shadow-glow animate-in zoom-in-95 duration-300"
      >
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/15 blur-3xl" />
        <div className="pointer-events-none absolute -left-8 -bottom-12 h-32 w-32 rounded-full bg-white/10 blur-2xl" />

        <div className="relative grid h-20 w-20 place-items-center rounded-3xl bg-white/15 backdrop-blur">
          <Shield className="h-10 w-10 fill-white/90 text-white" />
        </div>

        <h2 className="mt-4 text-[22px] font-black leading-tight">Strict Mode is active.</h2>
        <p className="mt-1 text-[13px] text-white/85">
          {blockedApp ? (
            <>
              <span className="font-semibold">{blockedApp}</span> is blocked until the session ends.
            </>
          ) : (
            <>You&apos;re inside a focus session. Sana is holding the line.</>
          )}
        </p>

        <div className="mt-4 rounded-2xl bg-white/12 p-3 backdrop-blur">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-wide text-white/70">
            <span>Time remaining</span>
            <span>{distractions} attempt{distractions === 1 ? "" : "s"}</span>
          </div>
          <div className="mt-1 text-3xl font-black tabular-nums">{remainingLabel}</div>
        </div>

        <div className="mt-4 flex items-start gap-3 rounded-2xl bg-white/12 p-3 backdrop-blur">
          <img src={sanaAvatar} alt="" className="h-10 w-10 shrink-0 rounded-xl object-cover" />
          <p className="text-[12.5px] leading-snug text-white/95">{sanaLine(distractions)}</p>
        </div>

        <button
          onClick={onReturn}
          className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white text-[14px] font-bold text-primary shadow-soft active:scale-[0.98]"
        >
          Return to Study <ArrowRight className="h-4 w-4" />
        </button>
        <button
          onClick={onEmergency}
          className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-white/40 text-[12.5px] font-semibold text-white/90"
        >
          <AlertTriangle className="h-3.5 w-3.5" /> Emergency Override
        </button>
        <p className="mt-2 text-center text-[10.5px] leading-snug text-white/70">
          Overrides break your streak and are logged.
        </p>
      </div>
    </div>
  );
}
