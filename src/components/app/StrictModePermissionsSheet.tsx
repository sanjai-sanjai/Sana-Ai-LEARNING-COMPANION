import { useEffect, useMemo, useState } from "react";
import {
  Shield,
  Bell,
  Eye,
  MonitorSmartphone,
  BarChart3,
  Layers,
  BellOff,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Smartphone,
  Globe,
  Info,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PERMISSIONS,
  loadPermissions,
  requestPermission,
  savePermissions,
  type PermissionId,
  type PermissionMap,
  type PermissionState,
} from "@/lib/strict-permissions";

const ICONS: Record<PermissionId, React.ReactNode> = {
  notifications: <Bell className="h-5 w-5" />,
  wakeLock: <MonitorSmartphone className="h-5 w-5" />,
  visibility: <Eye className="h-5 w-5" />,
  accessibility: <Shield className="h-5 w-5" />,
  usageStats: <BarChart3 className="h-5 w-5" />,
  overlay: <Layers className="h-5 w-5" />,
  notificationListener: <BellOff className="h-5 w-5" />,
};

type Props = {
  open: boolean;
  onClose: () => void;
  onComplete: (map: PermissionMap) => void;
};

/**
 * Guided permission onboarding shown the first time the user enables
 * Strict Mode. Explains each permission, requests what the web can, and
 * marks Android-only permissions as "install the native app to enable".
 * If any requested permission is denied, features degrade gracefully —
 * the user is shown exactly what will still work.
 */
export function StrictModePermissionsSheet({ open, onClose, onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [perms, setPerms] = useState<PermissionMap>(() => loadPermissions());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  useEffect(() => savePermissions(perms), [perms]);

  const steps = useMemo(
    () => [{ intro: true } as const, ...PERMISSIONS.map((p) => ({ intro: false, spec: p }))],
    [],
  );
  const summary = step === steps.length;
  const total = steps.length + 1;

  if (!open) return null;

  const current = step < steps.length ? steps[step] : null;

  const request = async (id: PermissionId) => {
    setBusy(true);
    const state = await requestPermission(id);
    setPerms((p) => ({ ...p, [id]: state }));
    setBusy(false);
    setStep((s) => s + 1);
  };

  const skip = () => setStep((s) => s + 1);

  const grantedCount = PERMISSIONS.filter((p) => perms[p.id] === "granted").length;
  const androidPending = PERMISSIONS.filter(
    (p) => p.platform === "android" && perms[p.id] === "unavailable",
  ).length;

  return (
    <div
      className="fixed inset-0 z-[70] grid place-items-end bg-background/60 backdrop-blur-xl animate-in fade-in duration-200 md:place-items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Strict Mode permissions"
    >
      <div className="w-full max-w-md rounded-t-[32px] border border-border bg-card p-5 shadow-glow animate-in slide-in-from-bottom-6 duration-300 md:rounded-[32px]">
        {/* Progress */}
        <div className="mb-4 flex items-center gap-1.5">
          {Array.from({ length: total }).map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors",
                i <= step ? "gradient-primary" : "bg-muted",
              )}
            />
          ))}
        </div>

        {current?.intro && (
          <IntroStep onNext={() => setStep(1)} onClose={onClose} />
        )}

        {current && !current.intro && (
          <PermissionStep
            spec={current.spec}
            state={perms[current.spec.id]}
            busy={busy}
            onRequest={() => request(current.spec.id)}
            onSkip={skip}
          />
        )}

        {summary && (
          <SummaryStep
            perms={perms}
            grantedCount={grantedCount}
            androidPending={androidPending}
            onDone={() => {
              onComplete(perms);
              onClose();
            }}
          />
        )}
      </div>
    </div>
  );
}

function IntroStep({ onNext, onClose }: { onNext: () => void; onClose: () => void }) {
  return (
    <div>
      <div className="gradient-primary shadow-glow grid h-16 w-16 place-items-center rounded-3xl">
        <Shield className="h-8 w-8 text-primary-foreground" />
      </div>
      <h2 className="mt-4 text-[22px] font-black leading-tight">
        Set up Strict Mode
      </h2>
      <p className="mt-1 text-[13px] leading-snug text-muted-foreground">
        Sana needs a few permissions to hold your focus. We'll walk you through each one and explain why.
        Skip anything you don't want — Strict Mode still works, just with fewer superpowers.
      </p>

      <ul className="mt-4 space-y-2">
        <IntroRow
          icon={<Sparkles className="h-4 w-4 text-primary" />}
          text="Nothing is enabled without your explicit tap."
        />
        <IntroRow
          icon={<Globe className="h-4 w-4 text-primary" />}
          text="Web version enables in-tab enforcement immediately."
        />
        <IntroRow
          icon={<Smartphone className="h-4 w-4 text-primary" />}
          text="Android-only permissions unlock in the Sana Android app."
        />
      </ul>

      <button
        onClick={onNext}
        className="gradient-primary shadow-soft mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-bold text-primary-foreground active:scale-[0.98]"
      >
        Get started <ChevronRight className="h-4 w-4" />
      </button>
      <button
        onClick={onClose}
        className="mt-2 h-10 w-full text-[12px] font-semibold text-muted-foreground"
      >
        Not now
      </button>
    </div>
  );
}

function IntroRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <li className="flex items-start gap-2.5 rounded-2xl border border-border bg-background p-3">
      <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-lavender">{icon}</div>
      <p className="text-[12.5px] leading-snug">{text}</p>
    </li>
  );
}

function PermissionStep({
  spec,
  state,
  busy,
  onRequest,
  onSkip,
}: {
  spec: (typeof PERMISSIONS)[number];
  state: PermissionState;
  busy: boolean;
  onRequest: () => void;
  onSkip: () => void;
}) {
  const isAndroid = spec.platform === "android";
  const done = state === "granted" || state === "denied" || state === "unavailable";

  return (
    <div>
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
            isAndroid
              ? "bg-warning/15 text-warning-foreground"
              : "bg-lavender text-primary",
          )}
        >
          {isAndroid ? <Smartphone className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
          {isAndroid ? "Android" : "Web"}
        </span>
        {spec.required && (
          <span className="text-[10px] font-bold uppercase tracking-wide text-destructive">
            Recommended
          </span>
        )}
      </div>

      <div className="mt-3 gradient-primary shadow-glow grid h-14 w-14 place-items-center rounded-2xl text-primary-foreground">
        {ICONS[spec.id]}
      </div>

      <h2 className="mt-4 text-[20px] font-black leading-tight">{spec.title}</h2>
      <p className="mt-1 text-[13px] leading-snug text-muted-foreground">{spec.why}</p>

      <div className="mt-3 flex items-start gap-2 rounded-2xl border border-border bg-background p-3">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <p className="text-[11.5px] leading-snug text-muted-foreground">
          <span className="font-semibold text-foreground">If skipped: </span>
          {spec.degrade}
        </p>
      </div>

      {done && <StateBadge state={state} />}

      <div className="mt-5 flex gap-2">
        {isAndroid ? (
          <>
            <button
              onClick={onSkip}
              className="gradient-primary shadow-soft flex h-12 flex-1 items-center justify-center gap-1.5 rounded-2xl text-sm font-bold text-primary-foreground active:scale-[0.98]"
            >
              Got it <ChevronRight className="h-4 w-4" />
            </button>
          </>
        ) : (
          <>
            <button
              onClick={onSkip}
              className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-border bg-card px-5 text-sm font-semibold shadow-card"
            >
              Skip
            </button>
            <button
              onClick={onRequest}
              disabled={busy || state === "granted"}
              className="gradient-primary shadow-soft flex h-12 flex-1 items-center justify-center gap-1.5 rounded-2xl text-sm font-bold text-primary-foreground disabled:opacity-70 active:scale-[0.98]"
            >
              {state === "granted" ? "Granted" : busy ? "Requesting…" : "Allow"}
              {state !== "granted" && !busy && <ChevronRight className="h-4 w-4" />}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function StateBadge({ state }: { state: PermissionState }) {
  const map = {
    granted: {
      cls: "bg-success/15 text-success",
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
      label: "Granted",
    },
    denied: {
      cls: "bg-destructive/15 text-destructive",
      icon: <XCircle className="h-3.5 w-3.5" />,
      label: "Denied — feature disabled",
    },
    unavailable: {
      cls: "bg-muted text-muted-foreground",
      icon: <Info className="h-3.5 w-3.5" />,
      label: "Available in the Android app",
    },
    pending: {
      cls: "bg-muted text-muted-foreground",
      icon: <Info className="h-3.5 w-3.5" />,
      label: "Not requested yet",
    },
  } as const;
  const s = map[state];
  return (
    <div
      className={cn(
        "mt-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold",
        s.cls,
      )}
    >
      {s.icon} {s.label}
    </div>
  );
}

function SummaryStep({
  perms,
  grantedCount,
  androidPending,
  onDone,
}: {
  perms: PermissionMap;
  grantedCount: number;
  androidPending: number;
  onDone: () => void;
}) {
  return (
    <div>
      <div className="gradient-primary shadow-glow grid h-16 w-16 place-items-center rounded-3xl">
        <CheckCircle2 className="h-8 w-8 text-primary-foreground" />
      </div>
      <h2 className="mt-4 text-[22px] font-black leading-tight">You're set</h2>
      <p className="mt-1 text-[13px] leading-snug text-muted-foreground">
        {grantedCount} permission{grantedCount === 1 ? "" : "s"} granted.
        {androidPending > 0 && (
          <> Install the Sana Android app to unlock {androidPending} more.</>
        )}
      </p>

      <ul className="mt-4 space-y-1.5">
        {PERMISSIONS.map((p) => (
          <li
            key={p.id}
            className="flex items-center justify-between rounded-xl border border-border bg-background px-3 py-2 text-[12px]"
          >
            <span className="flex items-center gap-2 font-semibold">
              <span className="grid h-6 w-6 place-items-center rounded-md bg-lavender text-primary">
                {ICONS[p.id]}
              </span>
              {p.title}
            </span>
            <MiniState state={perms[p.id]} />
          </li>
        ))}
      </ul>

      <button
        onClick={onDone}
        className="gradient-primary shadow-soft mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-bold text-primary-foreground active:scale-[0.98]"
      >
        Enable Strict Mode
      </button>
    </div>
  );
}

function MiniState({ state }: { state: PermissionState }) {
  if (state === "granted")
    return (
      <span className="flex items-center gap-1 text-success">
        <CheckCircle2 className="h-3.5 w-3.5" /> On
      </span>
    );
  if (state === "denied")
    return (
      <span className="flex items-center gap-1 text-destructive">
        <XCircle className="h-3.5 w-3.5" /> Off
      </span>
    );
  if (state === "unavailable")
    return <span className="text-[10px] font-bold text-muted-foreground">ANDROID</span>;
  return <span className="text-[10px] font-bold text-muted-foreground">SKIPPED</span>;
}
