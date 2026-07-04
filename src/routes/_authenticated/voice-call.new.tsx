import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowLeft, Phone, Sparkles } from "lucide-react";
import { TopBar } from "@/components/app/TopBar";
import { PhoneInput } from "@/components/app/PhoneInput";
import { PERSONALITIES, type AiPersonality } from "@/lib/sana";
import {
  createVoiceCallReminder,
  getMyPhone,
  triggerTestCall,
} from "@/lib/voice-reminders.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/voice-call/new")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "New AI Voice Call — Sana" },
      { name: "description", content: "Schedule a real-time AI phone call with your Sana study coach." },
    ],
  }),
  component: NewVoiceCallPage,
});

function toLocalInput(d: Date) {
  const p = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function NewVoiceCallPage() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const create = useServerFn(createVoiceCallReminder);
  const test = useServerFn(triggerTestCall);
  const phoneFn = useServerFn(getMyPhone);

  const { data: phoneData } = useQuery({ queryKey: ["my-phone"], queryFn: () => phoneFn() as never });

  const [title, setTitle] = useState("Study session with Sana");
  const [phone, setPhone] = useState("");
  const [topic, setTopic] = useState("");
  const [persona, setPersona] = useState<AiPersonality>("friendly_coach");
  const [when, setWhen] = useState(() => toLocalInput(new Date(Date.now() + 5 * 60_000)));
  const [repeat, setRepeat] = useState<"once" | "daily" | "weekly">("once");

  useEffect(() => {
    if (phoneData && typeof phoneData === "object" && "phone" in phoneData) {
      const p = (phoneData as { phone: string | null }).phone;
      if (p && !phone) setPhone(p);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phoneData]);

  const scheduledIso = useMemo(() => new Date(when).toISOString(), [when]);

  const createMut = useMutation({
    mutationFn: (testNow: boolean) =>
      (create({
        data: {
          title,
          phone_e164: phone.trim(),
          study_topic: topic.trim() || null,
          motivation_style: persona,
          scheduled_at: scheduledIso,
          repeat_type: repeat,
        },
      }) as unknown as Promise<{ id: string }>).then(async (row) => {
        if (testNow) {
          await (test({ data: { id: row.id } }) as unknown as Promise<unknown>);
        }
        return row;
      }),
    onSuccess: (_row, testNow) => {
      qc.invalidateQueries({ queryKey: ["voice-reminders"] });
      qc.invalidateQueries({ queryKey: ["reminders"] });
      toast.success(testNow ? "Calling you now…" : "Voice call scheduled");
      nav({ to: "/ai-calls" });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not save"),
  });

  const phoneOk = /^\+[1-9]\d{6,14}$/.test(phone.trim());

  return (
    <div className="pb-8">
      <TopBar
        title={<span className="inline-flex items-center gap-2"><Phone className="h-4 w-4 text-primary" /> New AI Voice Call</span>}
        subtitle="Sana will call your phone at the scheduled time"
      />
      <div className="mx-5 -mt-2">
        <button onClick={() => nav({ to: "/ai-calls" })} className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </button>
      </div>

      <section className="mx-5 mt-4 space-y-4">
        <Field label="Title">
          <input
            className="h-11 w-full rounded-2xl border border-border bg-card px-3 text-sm font-semibold outline-none focus:border-primary"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Python revision"
          />
        </Field>

        <Field label="Phone number" hint="Pick your country">
          <PhoneInput value={phone} onChange={(e164) => setPhone(e164)} placeholder="98765 43210" />
        </Field>

        <Field label="Topic (optional)">
          <input
            className="h-11 w-full rounded-2xl border border-border bg-card px-3 text-sm font-semibold outline-none focus:border-primary"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Control flow, DBMS joins, …"
          />
        </Field>

        <Field label="When">
          <input
            className="h-11 w-full rounded-2xl border border-border bg-card px-3 text-sm font-semibold outline-none focus:border-primary"
            type="datetime-local"
            value={when}
            onChange={(e) => setWhen(e.target.value)}
          />
        </Field>

        <Field label="Repeat">
          <div className="flex gap-2">
            {(["once", "daily", "weekly"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRepeat(r)}
                className={cn(
                  "flex-1 rounded-2xl border px-3 py-2 text-xs font-semibold capitalize",
                  repeat === r
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-foreground",
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Sana's voice personality">
          <div className="grid grid-cols-2 gap-2">
            {PERSONALITIES.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPersona(p.id)}
                className={cn(
                  "rounded-2xl border p-3 text-left transition-colors",
                  persona === p.id ? "border-primary bg-lavender" : "border-border bg-card",
                )}
              >
                <div className={cn("text-sm font-bold", p.color)}>{p.label}</div>
                <div className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{p.tagline}</div>
              </button>
            ))}
          </div>
        </Field>
      </section>

      <section className="mx-5 mt-6 space-y-2">
        <button
          disabled={!phoneOk || createMut.isPending}
          onClick={() => createMut.mutate(false)}
          className="gradient-primary shadow-soft flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-bold text-primary-foreground disabled:opacity-50"
        >
          <Phone className="h-4 w-4" /> Schedule call
        </button>
        <button
          disabled={!phoneOk || createMut.isPending}
          onClick={() => createMut.mutate(true)}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-primary/30 bg-lavender text-sm font-bold text-primary disabled:opacity-50"
        >
          <Sparkles className="h-4 w-4" /> Save & call me now (test)
        </button>
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          You'll receive a real phone call from Sana at the scheduled time.
        </p>
      </section>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</span>
        {hint && <span className="text-[10px] text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </label>
  );
}
