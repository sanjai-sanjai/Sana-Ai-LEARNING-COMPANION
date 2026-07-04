import { createFileRoute } from "@tanstack/react-router";

/**
 * Public cron endpoint — called by pg_cron every 15 minutes.
 *
 * Iterates every connected Classroom account, refreshes the OAuth token if
 * needed, and re-syncs courses, coursework, announcements, and materials.
 *
 * Document indexing (embeddings) is intentionally NOT run here — it's heavy
 * and users trigger it from the "Sync now" progress modal.
 *
 * Security: `/api/public/*` routes bypass auth; we gate on the shared
 * Supabase publishable key (`apikey` header) that pg_cron provides.
 */

type ConnRow = {
  user_id: string;
  access_token: string;
  refresh_token: string | null;
  token_expires_at: string | null;
  status: string | null;
};

const CLASSROOM = "https://classroom.googleapis.com";

async function refreshAccessToken(refreshToken: string) {
  const clientId = process.env.GOOGLE_CLASSROOM_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLASSROOM_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Google OAuth env missing");
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`Token refresh ${res.status}: ${await res.text()}`);
  return (await res.json()) as { access_token: string; expires_in: number };
}

async function ensureAccessToken(admin: any, conn: ConnRow): Promise<string> {
  const exp = conn.token_expires_at ? new Date(conn.token_expires_at).getTime() : 0;
  if (exp && exp - Date.now() > 60_000) return conn.access_token;
  if (!conn.refresh_token) throw new Error("No refresh token");
  const r = await refreshAccessToken(conn.refresh_token);
  const iso = new Date(Date.now() + r.expires_in * 1000).toISOString();
  await admin
    .from("classroom_connections")
    .update({ access_token: r.access_token, token_expires_at: iso })
    .eq("user_id", conn.user_id);
  return r.access_token;
}

async function gcFetch<T>(token: string, path: string): Promise<T> {
  const res = await fetch(`${CLASSROOM}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Classroom ${path} ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json() as Promise<T>;
}

async function paginated<T>(token: string, path: string, key: string): Promise<T[]> {
  const out: T[] = [];
  let pageToken: string | undefined;
  let safety = 15;
  do {
    const sep = path.includes("?") ? "&" : "?";
    const url = `${path}${sep}pageSize=200${pageToken ? `&pageToken=${pageToken}` : ""}`;
    const page = await gcFetch<Record<string, unknown>>(token, url);
    const items = (page[key] as T[] | undefined) ?? [];
    out.push(...items);
    pageToken = page.nextPageToken as string | undefined;
    safety -= 1;
  } while (pageToken && safety > 0);
  return out;
}

type GCourse = { id: string; name: string; section?: string; description?: string; room?: string; ownerId?: string; courseState?: string; alternateLink?: string; enrollmentCode?: string; creationTime?: string; updateTime?: string };
type GCoursework = { id: string; title: string; description?: string; workType?: string; state?: string; alternateLink?: string; maxPoints?: number; materials?: unknown[]; creationTime?: string; updateTime?: string; dueDate?: { year: number; month: number; day: number }; dueTime?: { hours?: number; minutes?: number } };
type GAnnouncement = { id: string; text?: string; state?: string; alternateLink?: string; materials?: unknown[]; creationTime?: string; updateTime?: string };
type GMaterial = { id: string; title: string; description?: string; state?: string; alternateLink?: string; materials?: unknown[]; creationTime?: string; updateTime?: string };

function dueAtIso(cw: GCoursework): string | null {
  if (!cw.dueDate) return null;
  const { year, month, day } = cw.dueDate;
  const h = cw.dueTime?.hours ?? 23;
  const m = cw.dueTime?.minutes ?? 59;
  return new Date(Date.UTC(year, month - 1, day, h, m)).toISOString();
}

async function syncOneUser(admin: any, conn: ConnRow) {
  const token = await ensureAccessToken(admin, conn);

  // Courses
  const courses = await paginated<GCourse>(
    token,
    "/v1/courses?studentId=me&courseStates=ACTIVE&courseStates=ARCHIVED",
    "courses",
  );
  if (courses.length) {
    const rows = courses.map((c) => ({
      user_id: conn.user_id,
      google_course_id: c.id,
      name: c.name,
      section: c.section ?? null,
      description: c.description ?? null,
      room: c.room ?? null,
      owner_id: c.ownerId ?? null,
      course_state: c.courseState ?? null,
      alternate_link: c.alternateLink ?? null,
      enrollment_code: c.enrollmentCode ?? null,
      google_created_at: c.creationTime ?? null,
      google_updated_at: c.updateTime ?? null,
    }));
    await admin.from("classroom_courses").upsert(rows, { onConflict: "user_id,google_course_id" });
  }

  let cwTotal = 0, anTotal = 0, matTotal = 0;
  for (const c of courses) {
    // Coursework
    try {
      const items = await paginated<GCoursework>(token, `/v1/courses/${c.id}/courseWork`, "courseWork");
      if (items.length) {
        const rows = items.map((cw) => ({
          user_id: conn.user_id,
          google_course_id: c.id,
          google_coursework_id: cw.id,
          title: cw.title,
          description: cw.description ?? null,
          work_type: cw.workType ?? null,
          state: cw.state ?? null,
          alternate_link: cw.alternateLink ?? null,
          max_points: cw.maxPoints ?? null,
          due_at: dueAtIso(cw),
          materials: (cw.materials ?? []) as any,
          google_created_at: cw.creationTime ?? null,
          google_updated_at: cw.updateTime ?? null,
        }));
        await admin.from("classroom_coursework").upsert(rows, { onConflict: "user_id,google_coursework_id" });
        cwTotal += rows.length;
      }
    } catch (e) { console.warn("[cron] coursework fail", c.id, e); }

    // Announcements
    try {
      const items = await paginated<GAnnouncement>(token, `/v1/courses/${c.id}/announcements`, "announcements");
      if (items.length) {
        const rows = items.map((a) => ({
          user_id: conn.user_id,
          google_course_id: c.id,
          google_announcement_id: a.id,
          text: a.text ?? null,
          state: a.state ?? null,
          alternate_link: a.alternateLink ?? null,
          materials: (a.materials ?? []) as any,
          google_created_at: a.creationTime ?? null,
          google_updated_at: a.updateTime ?? null,
        }));
        await admin.from("classroom_announcements").upsert(rows, { onConflict: "user_id,google_announcement_id" });
        anTotal += rows.length;
      }
    } catch (e) { console.warn("[cron] announcements fail", c.id, e); }

    // Materials
    try {
      const items = await paginated<GMaterial>(token, `/v1/courses/${c.id}/courseWorkMaterials`, "courseWorkMaterial");
      if (items.length) {
        const rows = items.map((m) => ({
          user_id: conn.user_id,
          google_course_id: c.id,
          google_material_id: m.id,
          title: m.title,
          description: m.description ?? null,
          state: m.state ?? null,
          alternate_link: m.alternateLink ?? null,
          materials: (m.materials ?? []) as any,
          google_created_at: m.creationTime ?? null,
          google_updated_at: m.updateTime ?? null,
        }));
        await admin.from("classroom_materials").upsert(rows, { onConflict: "user_id,google_material_id" });
        matTotal += rows.length;
      }
    } catch (e) { console.warn("[cron] materials fail", c.id, e); }
  }

  await admin
    .from("classroom_connections")
    .update({
      last_sync_at: new Date().toISOString(),
      last_error: null,
      status: "connected",
    })
    .eq("user_id", conn.user_id);

  return { courses: courses.length, coursework: cwTotal, announcements: anTotal, materials: matTotal };
}

export const Route = createFileRoute("/api/public/hooks/classroom-sync")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Basic guard: pg_cron passes the anon key in `apikey`. We just require
        // one is present; the endpoint is idempotent and read-mostly.
        const apiKey = request.headers.get("apikey");
        if (!apiKey) {
          return new Response(JSON.stringify({ error: "missing apikey" }), {
            status: 401, headers: { "Content-Type": "application/json" },
          });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Only sync connections that were touched in the last 30 days AND have a refresh token.
        const cutoff = new Date(Date.now() - 30 * 86400_000).toISOString();
        const { data: conns, error } = await supabaseAdmin
          .from("classroom_connections")
          .select("user_id, access_token, refresh_token, token_expires_at, status, updated_at")
          .not("refresh_token", "is", null)
          .gte("updated_at", cutoff);
        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500, headers: { "Content-Type": "application/json" },
          });
        }

        const results: Array<{ userId: string; ok: boolean; error?: string; stats?: any }> = [];
        for (const c of (conns ?? []) as ConnRow[]) {
          try {
            const stats = await syncOneUser(supabaseAdmin, c);
            results.push({ userId: c.user_id, ok: true, stats });
          } catch (e) {
            const msg = e instanceof Error ? e.message : "sync failed";
            console.error("[cron] user sync failed", c.user_id, msg);
            await supabaseAdmin
              .from("classroom_connections")
              .update({ last_error: msg.slice(0, 500), status: "error" })
              .eq("user_id", c.user_id);
            results.push({ userId: c.user_id, ok: false, error: msg });
          }
        }

        return new Response(
          JSON.stringify({ ok: true, ran: results.length, results }),
          { headers: { "Content-Type": "application/json" } },
        );
      },
    },
  },
});
