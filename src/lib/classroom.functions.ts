import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createHmac } from "crypto";

/** OAuth scopes — minimum required for Phase 1 (read-only Classroom + Drive/Docs/Slides). */
export const CLASSROOM_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/classroom.courses.readonly",
  "https://www.googleapis.com/auth/classroom.coursework.me.readonly",
  "https://www.googleapis.com/auth/classroom.coursework.students.readonly",
  "https://www.googleapis.com/auth/classroom.announcements.readonly",
  "https://www.googleapis.com/auth/classroom.topics.readonly",
  "https://www.googleapis.com/auth/classroom.student-submissions.me.readonly",
  "https://www.googleapis.com/auth/classroom.courseworkmaterials.readonly",
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/documents.readonly",
  "https://www.googleapis.com/auth/presentations.readonly",
];

/** Sign `{user_id, nonce, exp}` as URL-safe state; verified in the callback. */
function signState(payload: object): string {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("SUPABASE_SERVICE_ROLE_KEY missing");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export const getClassroomAuthUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { origin: string }) => data)
  .handler(async ({ data, context }) => {
    const clientId = process.env.GOOGLE_CLASSROOM_CLIENT_ID;
    if (!clientId) throw new Error("GOOGLE_CLASSROOM_CLIENT_ID missing");
    const state = signState({
      uid: context.userId,
      nonce: crypto.randomUUID(),
      exp: Date.now() + 10 * 60 * 1000,
      origin: data.origin,
    });
    const redirectUri = `${data.origin}/api/public/classroom/callback`;
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      access_type: "offline",
      include_granted_scopes: "true",
      prompt: "consent",
      scope: CLASSROOM_SCOPES.join(" "),
      state,
    });
    return { url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` };
  });

export type ClassroomConnectionInfo = {
  connected: boolean;
  email?: string | null;
  name?: string | null;
  picture?: string | null;
  status?: string | null;
  last_sync_at?: string | null;
  last_error?: string | null;
};

export const getClassroomConnection = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ClassroomConnectionInfo> => {
    const { data, error } = await context.supabase
      .from("classroom_connections")
      .select("google_email, google_name, google_picture, status, last_sync_at, last_error")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return { connected: false };
    return {
      connected: true,
      email: data.google_email,
      name: data.google_name,
      picture: data.google_picture,
      status: data.status,
      last_sync_at: data.last_sync_at,
      last_error: data.last_error,
    };
  });

export const disconnectClassroom = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Best-effort revoke, then delete the row.
    const { data: row } = await context.supabase
      .from("classroom_connections")
      .select("access_token, refresh_token")
      .eq("user_id", context.userId)
      .maybeSingle();
    const token = row?.refresh_token || row?.access_token;
    if (token) {
      try {
        await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, {
          method: "POST",
        });
      } catch {
        // ignore — we still delete our stored copy
      }
    }
    const { error } = await context.supabase
      .from("classroom_connections")
      .delete()
      .eq("user_id", context.userId);
    if (error) throw error;
    return { ok: true };
  });
