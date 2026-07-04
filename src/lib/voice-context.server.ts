// Fetch personalization context for a user before/during a voice call.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type CallContext = {
  displayName: string | null;
  studyTopic: string | null;
  motivationStyle: string;
  todayReminders: { title: string; scheduled_at: string }[];
  recentSummary: string | null;
  pendingClassroom: { title: string; due_at: string | null }[];
};

export async function fetchCallContext(userId: string, reminderId: string): Promise<CallContext> {
  const [{ data: profile }, { data: reminder }, { data: todays }, { data: lastSession }, { data: pending }] =
    await Promise.all([
      supabaseAdmin.from("profiles").select("display_name").eq("user_id", userId).maybeSingle(),
      supabaseAdmin.from("study_call_reminders").select("study_topic, motivation_style").eq("id", reminderId).maybeSingle(),
      supabaseAdmin
        .from("reminders")
        .select("title, scheduled_at")
        .eq("user_id", userId)
        .gte("scheduled_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString())
        .lte("scheduled_at", new Date(new Date().setHours(23, 59, 59, 999)).toISOString())
        .order("scheduled_at", { ascending: true })
        .limit(5),
      supabaseAdmin
        .from("call_sessions")
        .select("summary")
        .eq("user_id", userId)
        .not("summary", "is", null)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabaseAdmin
        .from("classroom_coursework")
        .select("title, due_at")
        .eq("user_id", userId)
        .not("due_at", "is", null)
        .gte("due_at", new Date().toISOString())
        .order("due_at", { ascending: true })
        .limit(3),
    ]);

  return {
    displayName: profile?.display_name ?? null,
    studyTopic: reminder?.study_topic ?? null,
    motivationStyle: reminder?.motivation_style ?? "friendly_coach",
    todayReminders: (todays ?? []).map((r) => ({ title: r.title, scheduled_at: r.scheduled_at })),
    recentSummary: lastSession?.summary ?? null,
    pendingClassroom: (pending ?? []).map((c) => ({ title: c.title, due_at: c.due_at })),
  };
}

export function contextToSystemAddendum(ctx: CallContext): string {
  const parts: string[] = [];
  parts.push(`\n\n--- USER CONTEXT (use naturally, don't dump verbatim) ---`);
  if (ctx.displayName) parts.push(`Name: ${ctx.displayName}`);
  if (ctx.studyTopic) parts.push(`Planned topic for this call: ${ctx.studyTopic}`);
  if (ctx.todayReminders.length) {
    parts.push(`Today's schedule:`);
    for (const r of ctx.todayReminders) {
      const t = new Date(r.scheduled_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      parts.push(`- ${t} · ${r.title}`);
    }
  }
  if (ctx.pendingClassroom.length) {
    parts.push(`Pending classroom work:`);
    for (const c of ctx.pendingClassroom) {
      const due = c.due_at ? new Date(c.due_at).toLocaleDateString() : "no date";
      parts.push(`- ${c.title} (due ${due})`);
    }
  }
  if (ctx.recentSummary) parts.push(`Last call summary: ${ctx.recentSummary}`);
  parts.push(`--- END CONTEXT ---`);
  return parts.join("\n");
}
