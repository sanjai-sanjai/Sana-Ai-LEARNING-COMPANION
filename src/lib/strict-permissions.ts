/**
 * Tracks which Strict Mode permissions the user has granted. Web can
 * genuinely request Notifications and Wake Lock; the rest are Android-only
 * and marked "unavailable on web" so the UI degrades honestly rather than
 * pretending to enforce something the browser can't.
 */

export type PermissionId =
  | "notifications"
  | "wakeLock"
  | "visibility"
  | "accessibility"
  | "usageStats"
  | "overlay"
  | "notificationListener";

export type PermissionState = "granted" | "denied" | "unavailable" | "pending";

export type PermissionSpec = {
  id: PermissionId;
  title: string;
  why: string;
  degrade: string;
  platform: "web" | "android";
  required: boolean;
};

export const PERMISSIONS: PermissionSpec[] = [
  {
    id: "notifications",
    title: "Notifications",
    why: "Alert you when a session ends and when Strict Mode blocks something.",
    degrade: "No end-of-session ping. Timer still works in-app.",
    platform: "web",
    required: false,
  },
  {
    id: "wakeLock",
    title: "Keep screen awake",
    why: "Stops the screen sleeping mid-session so the timer stays visible.",
    degrade: "Screen may dim; session continues in the background.",
    platform: "web",
    required: false,
  },
  {
    id: "visibility",
    title: "Tab-away detection",
    why: "Counts leaving this tab as a distraction attempt.",
    degrade: "Always on — no permission needed.",
    platform: "web",
    required: true,
  },
  {
    id: "accessibility",
    title: "Accessibility Service",
    why: "Detects which app is in the foreground so blocked apps trigger the lock overlay.",
    degrade: "Real-time app blocking is off. Sana still tracks in-app distractions.",
    platform: "android",
    required: true,
  },
  {
    id: "usageStats",
    title: "Usage Access",
    why: "Backup polling to detect blocked apps and populate weekly analytics.",
    degrade: "Weekly analytics limited to in-app time; app blocking degrades to Accessibility only.",
    platform: "android",
    required: false,
  },
  {
    id: "overlay",
    title: "Display Over Other Apps",
    why: "Draws the full-screen Strict Mode lock over blocked apps.",
    degrade: "Falls back to a high-priority notification instead of the overlay.",
    platform: "android",
    required: false,
  },
  {
    id: "notificationListener",
    title: "Notification Access",
    why: "Optionally mutes distracting notifications during a focus session.",
    degrade: "Notifications from other apps still ring. Sessions still run.",
    platform: "android",
    required: false,
  },
];

const KEY = "sana.strict-permissions.v1";

export type PermissionMap = Record<PermissionId, PermissionState>;

export function loadPermissions(): PermissionMap {
  const base: PermissionMap = {
    notifications: "pending",
    wakeLock: "pending",
    visibility: "granted",
    accessibility: "unavailable",
    usageStats: "unavailable",
    overlay: "unavailable",
    notificationListener: "unavailable",
  };
  if (typeof window === "undefined") return base;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PermissionMap>;
      return { ...base, ...parsed };
    }
  } catch {
    /* noop */
  }
  // sync current browser state
  if (typeof Notification !== "undefined") {
    base.notifications =
      Notification.permission === "granted"
        ? "granted"
        : Notification.permission === "denied"
          ? "denied"
          : "pending";
  }
  return base;
}

export function savePermissions(p: PermissionMap) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(p));
}

export async function requestPermission(id: PermissionId): Promise<PermissionState> {
  if (typeof window === "undefined") return "pending";
  if (id === "notifications") {
    if (typeof Notification === "undefined") return "unavailable";
    const res = await Notification.requestPermission();
    return res === "granted" ? "granted" : res === "denied" ? "denied" : "pending";
  }
  if (id === "wakeLock") {
    const nav = navigator as Navigator & {
      wakeLock?: { request: (t: "screen") => Promise<WakeLockSentinel> };
    };
    if (!nav.wakeLock) return "unavailable";
    try {
      const s = await nav.wakeLock.request("screen");
      await s.release();
      return "granted";
    } catch {
      return "denied";
    }
  }
  if (id === "visibility") return "granted";
  // Android-only: web can only advise, actual request happens in the native app.
  return "unavailable";
}
