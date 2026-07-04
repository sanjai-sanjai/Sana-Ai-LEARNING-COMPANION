/**
 * Strict Mode (web scope) — AI Focus Lock inside Sana.
 *
 * PLATFORM LIMIT: A browser cannot monitor other Android apps or draw over
 * them. That requires a native Android app (see /android scaffold). What we
 * CAN do from the web:
 *
 *   - Detect when the user leaves this tab / minimises the browser
 *     (Page Visibility API) and count it as a distraction attempt.
 *   - Intercept in-app navigation away from the focus route.
 *   - Keep the screen on with the Screen Wake Lock API.
 *   - Fire Notifications on session events.
 *   - Persist analytics locally (Focus Score, streak, distractions,
 *     time saved, weekly chart) so the dashboard is real, not fake.
 *
 * All storage is localStorage keyed by user (falls back to "anon"). Swap for
 * Supabase later without changing the hook surface.
 */

import { useCallback, useEffect, useRef, useState } from "react";

export type BlockedApp = {
  id: string;
  name: string;
  reason: string;
  attempts: number;
  lastAttemptAt: number;
};

export type StrictSession = {
  startedAt: number;
  endedAt: number | null;
  plannedSeconds: number;
  actualSeconds: number;
  distractionAttempts: number;
  longestFocusStreakSec: number;
  completed: boolean;
};

export type StrictStats = {
  focusScore: number; // 0-100
  todayFocusMinutes: number;
  todayDistractions: number;
  todayStreak: number; // completed sessions today
  currentDayStreak: number; // consecutive days with ≥1 completed session
  timeSavedMinutes: number; // minutes shielded from blocked-app attempts (heuristic: 2 min/attempt averted)
  longestStreakSec: number; // longest uninterrupted in-app focus this week
  weekly: { day: string; minutes: number; distractions: number }[]; // last 7 days, oldest → newest
  blockedApps: BlockedApp[];
};

const STORAGE_KEY = "sana.strict-mode.v1";

export const DEFAULT_ALLOW_LIST = [
  { id: "sana", name: "Sana AI", essential: true },
  { id: "phone", name: "Phone", essential: true },
  { id: "camera", name: "Camera", essential: true },
  { id: "calculator", name: "Calculator", essential: true },
  { id: "clock", name: "Clock", essential: true },
  { id: "messages", name: "Messages", essential: true },
  { id: "emergency", name: "Emergency Dialer", essential: true },
  { id: "classroom", name: "Google Classroom", essential: true },
  { id: "youtube", name: "YouTube", essential: false },
];

type StoreShape = {
  sessions: StrictSession[]; // last 30 days
  blockedApps: Record<string, BlockedApp>;
  dayStreak: { lastDate: string; count: number };
};

function todayKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function loadStore(): StoreShape {
  if (typeof window === "undefined") {
    return { sessions: [], blockedApps: {}, dayStreak: { lastDate: "", count: 0 } };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) throw new Error("empty");
    const parsed = JSON.parse(raw) as StoreShape;
    return {
      sessions: parsed.sessions ?? [],
      blockedApps: parsed.blockedApps ?? {},
      dayStreak: parsed.dayStreak ?? { lastDate: "", count: 0 },
    };
  } catch {
    return { sessions: [], blockedApps: {}, dayStreak: { lastDate: "", count: 0 } };
  }
}

function saveStore(s: StoreShape) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

function computeStats(store: StoreShape): StrictStats {
  const now = new Date();
  const today = todayKey(now);
  const todaySessions = store.sessions.filter(
    (s) => todayKey(new Date(s.startedAt)) === today,
  );

  const todayFocusMinutes = Math.round(
    todaySessions.reduce((a, s) => a + s.actualSeconds, 0) / 60,
  );
  const todayDistractions = todaySessions.reduce(
    (a, s) => a + s.distractionAttempts,
    0,
  );
  const todayStreak = todaySessions.filter((s) => s.completed).length;
  const longestStreakSec = Math.max(
    0,
    ...store.sessions.slice(-20).map((s) => s.longestFocusStreakSec),
  );

  // Focus score: completion ratio (0-70) + low-distraction bonus (0-30)
  const plannedMin = todaySessions.reduce((a, s) => a + s.plannedSeconds, 0) / 60 || 1;
  const completionRatio = Math.min(1, todayFocusMinutes / plannedMin);
  const distractionPenalty = Math.min(1, todayDistractions / 10);
  const focusScore = Math.round(completionRatio * 70 + (1 - distractionPenalty) * 30);

  // Weekly bucket
  const weekly: StrictStats["weekly"] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = todayKey(d);
    const day = d.toLocaleDateString(undefined, { weekday: "short" });
    const dayS = store.sessions.filter((s) => todayKey(new Date(s.startedAt)) === key);
    weekly.push({
      day,
      minutes: Math.round(dayS.reduce((a, s) => a + s.actualSeconds, 0) / 60),
      distractions: dayS.reduce((a, s) => a + s.distractionAttempts, 0),
    });
  }

  const timeSavedMinutes = Object.values(store.blockedApps).reduce(
    (a, b) => a + b.attempts * 2,
    0,
  );

  return {
    focusScore: isFinite(focusScore) ? focusScore : 0,
    todayFocusMinutes,
    todayDistractions,
    todayStreak,
    currentDayStreak: store.dayStreak.count,
    timeSavedMinutes,
    longestStreakSec,
    weekly,
    blockedApps: Object.values(store.blockedApps).sort((a, b) => b.attempts - a.attempts),
  };
}

/** Adaptive Sana copy based on how often the user has tried to escape. */
export function sanaLine(distractions: number): string {
  if (distractions === 0) return "You're locked in. I'll keep watch — focus on the task.";
  if (distractions <= 2) return "Back to it. One small pull isn't a slip; two is a pattern.";
  if (distractions <= 5) return "Deep breath. Close the tab you were about to open and give me 10 more minutes.";
  if (distractions <= 9) return "You're fighting the urge, which means it's working. Consider a short break next round.";
  return "Let's pause and reset — a 5-minute break now beats losing the whole session.";
}

export function useStrictMode() {
  const [store, setStore] = useState<StoreShape>(() => loadStore());
  const [enabled, setEnabled] = useState(false);
  const [locked, setLocked] = useState(false); // overlay visible
  const [lastBlockedApp, setLastBlockedApp] = useState<string | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const sessionRef = useRef<StrictSession | null>(null);
  const focusStartRef = useRef<number>(Date.now());
  const longestRef = useRef<number>(0);

  const persist = useCallback((next: StoreShape) => {
    setStore(next);
    saveStore(next);
  }, []);

  // Wake lock while enabled
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    (async () => {
      try {
        const nav = navigator as Navigator & {
          wakeLock?: { request: (t: "screen") => Promise<WakeLockSentinel> };
        };
        const sentinel = await nav.wakeLock?.request("screen");
        if (!cancelled) wakeLockRef.current = sentinel ?? null;
      } catch {
        /* not granted */
      }
    })();
    return () => {
      cancelled = true;
      wakeLockRef.current?.release().catch(() => {});
      wakeLockRef.current = null;
    };
  }, [enabled]);

  // Visibility: tab-away = distraction attempt
  useEffect(() => {
    if (!enabled) return;
    const onVis = () => {
      if (document.visibilityState === "hidden") {
        recordDistraction("Browser tab / other app");
        setLocked(true);
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  const recordDistraction = useCallback(
    (appName: string) => {
      const id = appName.toLowerCase().replace(/\s+/g, "-");
      const now = Date.now();

      // update longest streak
      const streak = Math.floor((now - focusStartRef.current) / 1000);
      if (streak > longestRef.current) longestRef.current = streak;
      focusStartRef.current = now;

      const prev = store.blockedApps[id];
      const next: StoreShape = {
        ...store,
        blockedApps: {
          ...store.blockedApps,
          [id]: {
            id,
            name: appName,
            reason: "Not on allow-list",
            attempts: (prev?.attempts ?? 0) + 1,
            lastAttemptAt: now,
          },
        },
      };
      if (sessionRef.current) {
        sessionRef.current.distractionAttempts += 1;
        sessionRef.current.longestFocusStreakSec = Math.max(
          sessionRef.current.longestFocusStreakSec,
          longestRef.current,
        );
      }
      persist(next);
      setLastBlockedApp(appName);
      try {
        if (Notification.permission === "granted") {
          new Notification("Strict Mode", {
            body: `${appName} is blocked. Return to your session.`,
            silent: false,
          });
        }
      } catch {
        /* noop */
      }
    },
    [store, persist],
  );

  const enable = useCallback(async (plannedSeconds: number) => {
    setEnabled(true);
    focusStartRef.current = Date.now();
    longestRef.current = 0;
    sessionRef.current = {
      startedAt: Date.now(),
      endedAt: null,
      plannedSeconds,
      actualSeconds: 0,
      distractionAttempts: 0,
      longestFocusStreakSec: 0,
      completed: false,
    };
    try {
      if ("Notification" in window && Notification.permission === "default") {
        await Notification.requestPermission();
      }
    } catch {
      /* noop */
    }
  }, []);

  const disable = useCallback(
    (opts: { completed: boolean; actualSeconds: number }) => {
      setEnabled(false);
      setLocked(false);
      if (sessionRef.current) {
        sessionRef.current.endedAt = Date.now();
        sessionRef.current.actualSeconds = opts.actualSeconds;
        sessionRef.current.completed = opts.completed;
        sessionRef.current.longestFocusStreakSec = Math.max(
          sessionRef.current.longestFocusStreakSec,
          Math.floor((Date.now() - focusStartRef.current) / 1000),
        );
        const today = todayKey();
        const prev = store.dayStreak;
        const nextStreak =
          opts.completed
            ? prev.lastDate === today
              ? prev
              : {
                  lastDate: today,
                  count:
                    prev.lastDate &&
                    new Date(today).getTime() - new Date(prev.lastDate).getTime() <=
                      2 * 24 * 60 * 60 * 1000
                      ? prev.count + 1
                      : 1,
                }
            : prev;
        const next: StoreShape = {
          ...store,
          sessions: [...store.sessions.slice(-60), sessionRef.current],
          dayStreak: nextStreak,
        };
        persist(next);
        sessionRef.current = null;
      }
    },
    [store, persist],
  );

  const returnToStudy = useCallback(() => setLocked(false), []);
  const emergencyOverride = useCallback(() => {
    disable({ completed: false, actualSeconds: sessionRef.current?.actualSeconds ?? 0 });
  }, [disable]);

  const stats = computeStats(store);

  return {
    enabled,
    locked,
    lastBlockedApp,
    stats,
    enable,
    disable,
    recordDistraction,
    returnToStudy,
    emergencyOverride,
    tickSecond: () => {
      if (sessionRef.current) sessionRef.current.actualSeconds += 1;
    },
  };
}
