// Cron target: find reminders whose scheduled_at has arrived and place calls.
// Called by pg_cron every minute.
import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { placeVoiceCall } from "@/lib/voice-dispatch.server";

async function handle() {
  const nowIso = new Date().toISOString();
  const windowStart = new Date(Date.now() - 90_000).toISOString(); // 90s grace

  const { data: due, error } = await supabaseAdmin
    .from("study_call_reminders")
    .select("id")
    .eq("status", "scheduled")
    .gte("scheduled_at", windowStart)
    .lte("scheduled_at", nowIso)
    .limit(25);

  if (error) {
    console.error("[voice-dispatcher] query error", error);
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }

  const results: { id: string; ok: boolean; error?: string; sid?: string }[] = [];
  for (const r of due ?? []) {
    try {
      const sid = await placeVoiceCall(r.id);
      results.push({ id: r.id, ok: true, sid });
    } catch (err) {
      results.push({ id: r.id, ok: false, error: err instanceof Error ? err.message : String(err) });
    }
  }

  return Response.json({ ok: true, processed: results.length, results });
}

export const Route = createFileRoute("/api/public/hooks/voice-dispatcher")({
  server: {
    handlers: {
      POST: async () => handle(),
      GET: async () => handle(),
    },
  },
});
