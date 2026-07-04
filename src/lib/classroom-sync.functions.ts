import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Google Classroom sync engine.
 *
 * Each step is its own server function so the UI can render animated
 * per-step progress. All steps share getValidAccessToken() which
 * transparently refreshes the OAuth token when expired.
 */

type ConnectionRow = {
  access_token: string;
  refresh_token: string | null;
  token_expires_at: string | null;
};

async function loadConn(supabase: any, userId: string): Promise<ConnectionRow> {
  const { data, error } = await supabase
    .from("classroom_connections")
    .select("access_token, refresh_token, token_expires_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Not connected to Google Classroom");
  return data as ConnectionRow;
}

async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string;
  expires_in: number;
}> {
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
  if (!res.ok) throw new Error(`Token refresh failed: ${await res.text()}`);
  return res.json();
}

async function getValidAccessToken(supabase: any, userId: string): Promise<string> {
  const conn = await loadConn(supabase, userId);
  const expiresAt = conn.token_expires_at ? new Date(conn.token_expires_at).getTime() : 0;
  const isExpired = !expiresAt || expiresAt - Date.now() < 60_000;

  if (!isExpired) return conn.access_token;
  if (!conn.refresh_token) {
    // Expired without a refresh token — the user must reconnect.
    throw new Error("Google session expired. Please reconnect.");
  }

  const refreshed = await refreshAccessToken(conn.refresh_token);
  const newExpires = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();
  await supabase
    .from("classroom_connections")
    .update({
      access_token: refreshed.access_token,
      token_expires_at: newExpires,
    })
    .eq("user_id", userId);
  return refreshed.access_token;
}

async function gcFetch<T>(token: string, path: string): Promise<T> {
  const res = await fetch(`https://classroom.googleapis.com${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Classroom ${path} ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

async function paginated<T>(
  token: string,
  path: string,
  itemsKey: string,
): Promise<T[]> {
  const out: T[] = [];
  let pageToken: string | undefined;
  let safety = 20; // hard cap on pages per resource
  do {
    const sep = path.includes("?") ? "&" : "?";
    const url = `${path}${sep}pageSize=200${pageToken ? `&pageToken=${pageToken}` : ""}`;
    const page = await gcFetch<Record<string, unknown>>(token, url);
    const items = (page[itemsKey] as T[] | undefined) ?? [];
    out.push(...items);
    pageToken = page.nextPageToken as string | undefined;
    safety -= 1;
  } while (pageToken && safety > 0);
  return out;
}

// ─────────────────────────── Step 1: courses ───────────────────────────

type GCourse = {
  id: string;
  name: string;
  section?: string;
  description?: string;
  room?: string;
  ownerId?: string;
  courseState?: string;
  alternateLink?: string;
  enrollmentCode?: string;
  creationTime?: string;
  updateTime?: string;
};

export const syncClassroomCourses = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const token = await getValidAccessToken(context.supabase, context.userId);
    const courses = await paginated<GCourse>(
      token,
      "/v1/courses?studentId=me&courseStates=ACTIVE&courseStates=ARCHIVED",
      "courses",
    );
    if (courses.length) {
      const rows = courses.map((c) => ({
        user_id: context.userId,
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
      const { error } = await context.supabase
        .from("classroom_courses")
        .upsert(rows, { onConflict: "user_id,google_course_id" });
      if (error) throw error;
    }
    return { count: courses.length, courseIds: courses.map((c) => c.id) };
  });

// ─────────────────────────── Step 2: coursework ───────────────────────────

type GCoursework = {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  workType?: string;
  state?: string;
  alternateLink?: string;
  maxPoints?: number;
  materials?: unknown[];
  creationTime?: string;
  updateTime?: string;
  dueDate?: { year: number; month: number; day: number };
  dueTime?: { hours?: number; minutes?: number };
};

function dueAtIso(cw: GCoursework): string | null {
  if (!cw.dueDate) return null;
  const { year, month, day } = cw.dueDate;
  const h = cw.dueTime?.hours ?? 23;
  const m = cw.dueTime?.minutes ?? 59;
  return new Date(Date.UTC(year, month - 1, day, h, m)).toISOString();
}

export const syncClassroomCoursework = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { courseIds: string[] }) => data)
  .handler(async ({ data, context }) => {
    const token = await getValidAccessToken(context.supabase, context.userId);
    let total = 0;
    for (const courseId of data.courseIds) {
      let items: GCoursework[] = [];
      try {
        items = await paginated<GCoursework>(
          token,
          `/v1/courses/${courseId}/courseWork`,
          "courseWork",
        );
      } catch {
        continue; // course may be inaccessible; skip
      }
      if (!items.length) continue;
      const rows = items.map((cw) => ({
        user_id: context.userId,
        google_course_id: courseId,
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
      const { error } = await context.supabase
        .from("classroom_coursework")
        .upsert(rows, { onConflict: "user_id,google_coursework_id" });
      if (error) throw error;
      total += rows.length;
    }
    return { count: total };
  });

// ─────────────────────────── Step 3: announcements ───────────────────────────

type GAnnouncement = {
  id: string;
  courseId: string;
  text?: string;
  state?: string;
  alternateLink?: string;
  materials?: unknown[];
  creationTime?: string;
  updateTime?: string;
};

export const syncClassroomAnnouncements = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { courseIds: string[] }) => data)
  .handler(async ({ data, context }) => {
    const token = await getValidAccessToken(context.supabase, context.userId);
    let total = 0;
    for (const courseId of data.courseIds) {
      let items: GAnnouncement[] = [];
      try {
        items = await paginated<GAnnouncement>(
          token,
          `/v1/courses/${courseId}/announcements`,
          "announcements",
        );
      } catch {
        continue;
      }
      if (!items.length) continue;
      const rows = items.map((a) => ({
        user_id: context.userId,
        google_course_id: courseId,
        google_announcement_id: a.id,
        text: a.text ?? null,
        state: a.state ?? null,
        alternate_link: a.alternateLink ?? null,
        materials: (a.materials ?? []) as any,
        google_created_at: a.creationTime ?? null,
        google_updated_at: a.updateTime ?? null,
      }));
      const { error } = await context.supabase
        .from("classroom_announcements")
        .upsert(rows, { onConflict: "user_id,google_announcement_id" });
      if (error) throw error;
      total += rows.length;
    }
    return { count: total };
  });

// ─────────────────────────── Step 4: coursework materials ───────────────────────────

type GMaterial = {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  state?: string;
  alternateLink?: string;
  materials?: unknown[];
  creationTime?: string;
  updateTime?: string;
};

export const syncClassroomMaterials = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { courseIds: string[] }) => data)
  .handler(async ({ data, context }) => {
    const token = await getValidAccessToken(context.supabase, context.userId);
    let total = 0;
    for (const courseId of data.courseIds) {
      let items: GMaterial[] = [];
      try {
        items = await paginated<GMaterial>(
          token,
          `/v1/courses/${courseId}/courseWorkMaterials`,
          "courseWorkMaterial",
        );
      } catch {
        continue;
      }
      if (!items.length) continue;
      const rows = items.map((m) => ({
        user_id: context.userId,
        google_course_id: courseId,
        google_material_id: m.id,
        title: m.title,
        description: m.description ?? null,
        state: m.state ?? null,
        alternate_link: m.alternateLink ?? null,
        materials: (m.materials ?? []) as any,
        google_created_at: m.creationTime ?? null,
        google_updated_at: m.updateTime ?? null,
      }));
      const { error } = await context.supabase
        .from("classroom_materials")
        .upsert(rows, { onConflict: "user_id,google_material_id" });
      if (error) throw error;
      total += rows.length;
    }
    return { count: total };
  });

// ─────────────────────────── Finalize ───────────────────────────

export const finalizeClassroomSync = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { error?: string | null }) => data)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("classroom_connections")
      .update({
        last_sync_at: new Date().toISOString(),
        last_error: data.error ?? null,
        status: data.error ? "error" : "connected",
      })
      .eq("user_id", context.userId);
    if (error) throw error;
    return { ok: true };
  });

// ─────────────────────────── Summary (for UI) ───────────────────────────

export const getClassroomSyncSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [courses, coursework, announcements, materials] = await Promise.all([
      context.supabase.from("classroom_courses").select("id", { count: "exact", head: true }).eq("user_id", context.userId),
      context.supabase.from("classroom_coursework").select("id", { count: "exact", head: true }).eq("user_id", context.userId),
      context.supabase.from("classroom_announcements").select("id", { count: "exact", head: true }).eq("user_id", context.userId),
      context.supabase.from("classroom_materials").select("id", { count: "exact", head: true }).eq("user_id", context.userId),
    ]);
    return {
      courses: courses.count ?? 0,
      coursework: coursework.count ?? 0,
      announcements: announcements.count ?? 0,
      materials: materials.count ?? 0,
    };
  });
