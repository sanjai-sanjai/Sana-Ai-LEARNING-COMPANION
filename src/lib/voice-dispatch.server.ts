// Server-only helpers for placing Twilio voice calls and building TwiML.
// Never import from a client-reachable file directly at module scope.

import { supabaseAdmin } from "@/integrations/supabase/client.server";

const TWILIO_GATEWAY = "https://connector-gateway.lovable.dev/twilio";

/** Public origin of this app, used as the Twilio webhook base. */
export function getPublicOrigin(): string {
  const explicit = process.env.APP_PUBLIC_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const projectId = process.env.VITE_LOVABLE_PROJECT_ID || process.env.LOVABLE_PROJECT_ID;
  if (projectId) return `https://project--${projectId}.lovable.app`;
  throw new Error(
    "APP_PUBLIC_URL is not configured. Set it to the app's published https origin (e.g. https://your-app.lovable.app).",
  );
}

/** Escape XML entities for embedding into TwiML. */
export function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function twimlResponse(body: string): Response {
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<Response>${body}</Response>`, {
    status: 200,
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
}

/** Build a natural <Say> using a warm neural voice. */
export function say(text: string): string {
  return `<Say voice="Polly.Joanna-Neural" language="en-US">${xmlEscape(text)}</Say>`;
}

/** Build a <Gather input="speech"> that POSTs the recognized speech to `actionUrl`. */
export function gather(actionUrl: string, opts?: { hints?: string; timeout?: number }): string {
  const hints = opts?.hints ? ` hints="${xmlEscape(opts.hints)}"` : "";
  const timeout = opts?.timeout ?? 6;
  return `<Gather input="speech" action="${xmlEscape(actionUrl)}" method="POST" speechTimeout="auto" speechModel="experimental_conversations" timeout="${timeout}" language="en-US"${hints}/>`;
}

/**
 * Place an outbound voice call for a reminder via Twilio.
 * Returns the Twilio CallSid.
 */
export async function placeVoiceCall(reminderId: string): Promise<string> {
  throw new Error("Voice calls are currently disabled because Lovable API integration was removed.");
}

/** Compute the next scheduled_at for a repeating reminder, or null if not repeating. */
export function nextOccurrence(current: string, repeat: string): string | null {
  const base = new Date(current);
  if (repeat === "daily") base.setUTCDate(base.getUTCDate() + 1);
  else if (repeat === "weekly") base.setUTCDate(base.getUTCDate() + 7);
  else return null;
  return base.toISOString();
}
