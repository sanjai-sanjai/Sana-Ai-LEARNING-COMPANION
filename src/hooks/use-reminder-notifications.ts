import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listReminders } from "@/lib/reminders.functions";

type Reminder = {
  id: string;
  title: string;
  scheduled_at: string;
  alert_before_minutes: number;
  status: string;
};

export function useReminderNotifications() {
  const list = useServerFn(listReminders);
  const { data } = useQuery<Reminder[]>({
    queryKey: ["reminders"],
    queryFn: () => list() as unknown as Promise<Reminder[]>,
  });

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!data || typeof window === "undefined" || !("Notification" in window)) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (const r of data) {
      if (r.status !== "scheduled") continue;
      const fireAt = new Date(r.scheduled_at).getTime() - r.alert_before_minutes * 60_000;
      const delay = fireAt - Date.now();
      if (delay <= 0 || delay > 2_147_483_000) continue;
      timers.push(
        setTimeout(() => {
          if (Notification.permission === "granted") {
            new Notification("Sana Reminder", {
              body: `${r.title} — starts in ${r.alert_before_minutes} min`,
              icon: "/favicon.ico",
            });
          }
        }, delay),
      );
    }
    return () => timers.forEach(clearTimeout);
  }, [data]);
}
