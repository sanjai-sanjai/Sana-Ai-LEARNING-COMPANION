// Twilio webhook: initial TwiML when the call is answered.
// Twilio POSTs application/x-www-form-urlencoded here.
import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { generateTurn, voiceSystemPrompt, parseControlMarkers, type VoicePersona } from "@/lib/voice-ai.server";
import { fetchCallContext, contextToSystemAddendum } from "@/lib/voice-context.server";
import { gather, say, twimlResponse } from "@/lib/voice-dispatch.server";

async function handle(request: Request, url: URL) {
  const reminderId = url.searchParams.get("reminder_id");
  if (!reminderId) return twimlResponse(say("This call was set up incorrectly. Goodbye.") + "<Hangup/>");

  const form = await request.formData().catch(() => null);
  const callSid = (form?.get("CallSid") as string | null) ?? crypto.randomUUID();
  const answeredBy = (form?.get("AnsweredBy") as string | null) ?? null;

  // Voicemail? Leave a short message and hang up.
  if (answeredBy && answeredBy.startsWith("machine")) {
    return twimlResponse(
      say(
        "Hi, this is Sana. I was calling for your study session. Open the app to reschedule when you're free. Talk soon!",
      ) + "<Hangup/>",
    );
  }

  const { data: reminder } = await supabaseAdmin
    .from("study_call_reminders")
    .select("*")
    .eq("id", reminderId)
    .single();
  if (!reminder) return twimlResponse(say("Sorry, I couldn't find your study session. Goodbye.") + "<Hangup/>");

  // Create the call_sessions row (idempotent by CallSid).
  await supabaseAdmin
    .from("call_sessions")
    .upsert(
      {
        reminder_id: reminder.id,
        user_id: reminder.user_id,
        twilio_call_sid: callSid,
        status: "in_progress",
        transcript: [],
      },
      { onConflict: "twilio_call_sid" },
    );

  // ── Low-latency path: Media Streams relay ─────────────────────────────────
  const relayUrl = process.env.VOICE_RELAY_WSS_URL;
  if (relayUrl) {
    const ctx = await fetchCallContext(reminder.user_id, reminder.id);
    const wss = relayUrl.replace(/\/$/, "");
    const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
    const params = [
      ["reminder_id", reminder.id],
      ["user_id", reminder.user_id],
      ["persona", reminder.motivation_style ?? "friendly_coach"],
      ["topic", reminder.study_topic ?? ""],
      ["display_name", ctx.displayName ?? ""],
    ]
      .filter(([, v]) => v != null)
      .map(([k, v]) => `<Parameter name="${k}" value="${esc(String(v))}"/>`)
      .join("");
    return twimlResponse(`<Connect><Stream url="${esc(wss)}">${params}</Stream></Connect>`);
  }

  // ── Fallback: <Gather>+<Say> loop (works without the relay deployed) ─────
  const ctx = await fetchCallContext(reminder.user_id, reminder.id);
  const system =
    voiceSystemPrompt(reminder.motivation_style as VoicePersona, ctx.displayName) +
    contextToSystemAddendum(ctx);

  const raw = await generateTurn(system, [
    { role: "user", content: "The call just connected. Greet them warmly by name and open the session naturally." },
  ]);
  const { spoken, endCall } = parseControlMarkers(raw);
  const opener = spoken || `Hi ${ctx.displayName ?? "there"}, this is Sana. How are you doing?`;

  await supabaseAdmin
    .from("call_sessions")
    .update({ transcript: [{ role: "assistant", content: opener }] })
    .eq("twilio_call_sid", callSid);

  if (endCall) return twimlResponse(say(opener) + "<Hangup/>");

  const origin = new URL(request.url).origin;
  const turnUrl = `${origin}/api/public/voice/turn?reminder_id=${reminder.id}`;
  return twimlResponse(say(opener) + gather(turnUrl, { hints: reminder.study_topic ?? undefined }));
}

export const Route = createFileRoute("/api/public/voice/start")({
  server: {
    handlers: {
      POST: async ({ request }) => handle(request, new URL(request.url)),
      GET: async ({ request }) => handle(request, new URL(request.url)),
    },
  },
});
