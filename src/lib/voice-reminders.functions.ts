import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { validatePhone } from "./phone";

const PhoneSchema = z
  .string()
  .trim()
  .min(1)
  .transform((v, ctx) => {
    const r = validatePhone(v);
    if (!r.ok) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: r.reason });
      return z.NEVER;
    }
    return r.e164;
  });

const CreateSchema = z.object({
  title: z.string().min(1).max(120),
  phone_e164: PhoneSchema,
  study_topic: z.string().max(200).nullable().optional(),
  motivation_style: z.enum(["friendly_coach", "strict_mentor", "mom_mode", "power_coach"]),
  scheduled_at: z.string(), // ISO
  repeat_type: z.enum(["once", "daily", "weekly"]),
});

export const createVoiceCallReminder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CreateSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("study_call_reminders")
      .insert({
        user_id: userId,
        title: data.title,
        phone_e164: data.phone_e164,
        study_topic: data.study_topic ?? null,
        motivation_style: data.motivation_style,
        scheduled_at: data.scheduled_at,
        repeat_type: data.repeat_type,
        next_call_at: data.scheduled_at,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    // Persist phone on profile for convenience
    await supabase.from("profiles").update({ phone_e164: data.phone_e164 }).eq("user_id", userId);

    return row;
  });

export const listVoiceCallReminders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("study_call_reminders")
      .select("*")
      .order("scheduled_at", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const cancelVoiceCallReminder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("study_call_reminders")
      .update({ status: "cancelled" })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listCallSessions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("call_sessions")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getMyPhone = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("profiles")
      .select("phone_e164")
      .eq("user_id", context.userId)
      .maybeSingle();
    return { phone: data?.phone_e164 ?? null };
  });

/** Manually trigger a test call right now for a reminder. */
export const triggerTestCall = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    // Ownership check via RLS
    const { data: reminder, error } = await context.supabase
      .from("study_call_reminders")
      .select("*")
      .eq("id", data.id)
      .single();
    if (error || !reminder) throw new Error("Reminder not found");

    const { placeVoiceCall } = await import("./voice-dispatch.server");
    const sid = await placeVoiceCall(reminder.id);
    return { call_sid: sid };
  });
