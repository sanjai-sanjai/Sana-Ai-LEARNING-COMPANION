// Twilio status callback: fired on initiated / answered / completed.
// On completion, summarize and finalize the call_sessions row.
import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { summarizeCall } from "@/lib/voice-ai.server";
import { nextOccurrence } from "@/lib/voice-dispatch.server";

type TranscriptTurn = { role: "user" | "assistant"; content: string };

async function handle(request: Request) {
  const form = await request.formData().catch(() => null);
  if (!form) return new Response("", { status: 200 });

  const callSid = (form.get("CallSid") as string | null) ?? "";
  const callStatus = ((form.get("CallStatus") as string | null) ?? "").toLowerCase();
  const duration = parseInt((form.get("CallDuration") as string | null) ?? "0", 10) || 0;

  if (!callSid) return new Response("", { status: 200 });

  const { data: session } = await supabaseAdmin
    .from("call_sessions")
    .select("*, study_call_reminders!inner(*)")
    .eq("twilio_call_sid", callSid)
    .maybeSingle();

  const reminder = (session as unknown as { study_call_reminders?: { id: string; scheduled_at: string; repeat_type: string; miss_count: number } } | null)
    ?.study_call_reminders;

  if (callStatus === "no-answer" || callStatus === "busy" || callStatus === "failed") {
    if (session) {
      await supabaseAdmin
        .from("call_sessions")
        .update({
          ended_at: new Date().toISOString(),
          duration_seconds: duration,
          status: callStatus === "no-answer" ? "no_answer" : callStatus === "busy" ? "busy" : "failed",
        })
        .eq("twilio_call_sid", callSid);
    }
    if (reminder) {
      const roll = nextOccurrence(reminder.scheduled_at, reminder.repeat_type);
      await supabaseAdmin
        .from("study_call_reminders")
        .update({
          status: roll ? "scheduled" : "missed",
          miss_count: (reminder.miss_count ?? 0) + 1,
          ...(roll ? { scheduled_at: roll, next_call_at: roll } : {}),
        })
        .eq("id", reminder.id);
    }
    return new Response("", { status: 200 });
  }

  if (callStatus === "completed") {
    if (!session) return new Response("", { status: 200 });
    const transcript = (session.transcript as TranscriptTurn[] | null | undefined) ?? [];
    const { summary, mood, topics, action_taken } = await summarizeCall(
      transcript.map((t) => ({ role: t.role, content: t.content })),
    );
    await supabaseAdmin
      .from("call_sessions")
      .update({
        ended_at: new Date().toISOString(),
        duration_seconds: duration,
        status: "completed",
        summary,
        mood,
        topics,
        action_taken,
      })
      .eq("twilio_call_sid", callSid);

    // Reminder was already advanced by turn.ts if user said goodbye; otherwise mark done here.
    if (reminder) {
      const { data: current } = await supabaseAdmin
        .from("study_call_reminders")
        .select("status")
        .eq("id", reminder.id)
        .single();
      if (current?.status === "calling") {
        const roll = nextOccurrence(reminder.scheduled_at, reminder.repeat_type);
        await supabaseAdmin
          .from("study_call_reminders")
          .update(
            roll
              ? { status: "scheduled", scheduled_at: roll, next_call_at: roll }
              : { status: "done" },
          )
          .eq("id", reminder.id);
      }
    }
  }

  return new Response("", { status: 200 });
}

export const Route = createFileRoute("/api/public/voice/status")({
  server: {
    handlers: {
      POST: async ({ request }) => handle(request),
    },
  },
});
