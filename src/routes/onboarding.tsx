import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, Sparkles, Settings } from "lucide-react";
import { GOALS, PERSONALITIES, type AiPersonality } from "@/lib/sana";
import { GradientButton } from "@/components/app/GradientButton";
import { supabase } from "@/integrations/supabase/client";
import sanaHero from "@/assets/sana-hero.png";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/onboarding")({
  ssr: false,
  component: Onboarding,
});

function Onboarding() {
  const nav = useNavigate();
  const [step, setStep] = useState(1);
  const [goal, setGoal] = useState<string>("crack_exams");
  const [personality, setPersonality] = useState<AiPersonality>("friendly_coach");
  const [saving, setSaving] = useState(false);

  async function finish() {
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { nav({ to: "/auth" }); return; }
    const { error } = await supabase.from("onboarding_preferences").upsert({
      user_id: u.user.id,
      primary_goal: goal,
      ai_personality: personality,
      completed_at: new Date().toISOString(),
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    nav({ to: "/home" });
  }

  return (
    <div className="min-h-svh bg-background">
      <div className="mx-auto flex min-h-svh w-full max-w-md flex-col px-6 pb-8 pt-10">
        <div className="flex items-center justify-between">
          <button onClick={() => (step > 1 ? setStep(step - 1) : nav({ to: "/auth" }))} className="shadow-card grid h-11 w-11 place-items-center rounded-2xl bg-card">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((n) => (
              <div key={n} className="flex items-center gap-2">
                <div className={cn("grid h-8 w-8 place-items-center rounded-full text-xs font-bold", n <= step ? "gradient-primary text-white" : "bg-muted text-muted-foreground")}>{n}</div>
                {n < 3 && <div className={cn("h-0.5 w-8 rounded-full", n < step ? "bg-primary" : "bg-muted")} />}
              </div>
            ))}
          </div>
          <div className="w-11" />
        </div>

        {step === 1 && <StepGoal goal={goal} setGoal={setGoal} />}
        {step === 2 && <StepPersonality personality={personality} setPersonality={setPersonality} />}
        {step === 3 && <StepConfirm goal={goal} personality={personality} />}

        <div className="mt-auto pt-6">
          {step < 3 ? (
            <GradientButton onClick={() => setStep(step + 1)}>Continue <ArrowRight className="h-4 w-4" /></GradientButton>
          ) : (
            <GradientButton disabled={saving} onClick={finish}>{saving ? "Setting up…" : "Enter Mnemora →"}</GradientButton>
          )}
          <button className="mt-3 w-full text-center text-sm text-muted-foreground" onClick={() => nav({ to: "/home" })}>
            I'll {step === 1 ? "do this later" : "customize later"}
          </button>
        </div>
      </div>
    </div>
  );
}

function StepGoal({ goal, setGoal }: { goal: string; setGoal: (g: string) => void }) {
  return (
    <>
      <div className="mt-6 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary"><Sparkles className="h-4 w-4" /> Onboarding</div>
          <h1 className="mt-2 text-[28px] font-black leading-tight">Let's Personalize<br/>Your <span className="text-primary">Journey</span> ✨</h1>
          <p className="mt-2 text-sm text-muted-foreground">Tell me your main goal so I can guide you better. 💜</p>
        </div>
        <img src={sanaHero} alt="Sana" className="h-32 w-auto object-contain" />
      </div>
      <h2 className="mt-6 text-sm font-bold">What's your primary goal?</h2>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {GOALS.map((g) => {
          const active = goal === g.id;
          return (
            <button key={g.id} onClick={() => setGoal(g.id)} className={cn("relative rounded-2xl border p-4 text-left transition", active ? "border-primary bg-primary/5 shadow-card" : "border-border bg-card")}>
              {active && <span className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-primary text-white"><Check className="h-3.5 w-3.5" /></span>}
              <div className="text-2xl">{g.icon}</div>
              <div className="mt-2 text-sm font-bold">{g.label}</div>
              <div className="mt-1 text-xs text-muted-foreground">{g.desc}</div>
            </button>
          );
        })}
      </div>
      <div className="mt-4 flex items-start gap-3 rounded-2xl border border-border bg-lavender/60 p-3">
        <span className="gradient-primary grid h-9 w-9 shrink-0 place-items-center rounded-full text-white"><Sparkles className="h-4 w-4" /></span>
        <div className="min-w-0 text-xs">
          <p className="font-bold">Don't worry!</p>
          <p className="text-muted-foreground">You can update your goal anytime from settings.</p>
        </div>
      </div>
    </>
  );
}

function StepPersonality({ personality, setPersonality }: { personality: AiPersonality; setPersonality: (p: AiPersonality) => void }) {
  return (
    <>
      <div className="mt-6 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary"><Sparkles className="h-4 w-4" /> Onboarding</div>
          <h1 className="mt-2 text-[28px] font-black leading-tight">Choose Your<br/><span className="text-primary">AI Companion</span> ✨</h1>
          <p className="mt-2 text-sm text-muted-foreground">Pick a personality that motivates and guides you the best. 💜</p>
        </div>
        <img src={sanaHero} alt="Sana" className="h-32 w-auto object-contain" />
      </div>
      <h2 className="mt-6 text-sm font-bold">Select your AI companion's personality</h2>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {PERSONALITIES.map((p) => {
          const active = personality === p.id;
          return (
            <button key={p.id} onClick={() => setPersonality(p.id)} className={cn("relative rounded-2xl border p-3 text-left transition", active ? "border-primary bg-primary/5 shadow-card" : "border-border bg-card")}>
              <span className={cn("absolute right-2 top-2 grid h-5 w-5 place-items-center rounded-full border", active ? "gradient-primary border-transparent text-white" : "border-border")}>
                {active && <Check className="h-3 w-3" />}
              </span>
              <div className={cn("text-sm font-bold", p.color)}>{p.label}</div>
              <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">{p.tagline}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {p.tags.map((t) => (<span key={t} className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold">{t}</span>))}
              </div>
            </button>
          );
        })}
      </div>
      <div className="mt-4 flex items-start gap-3 rounded-2xl border border-border bg-lavender/60 p-3">
        <span className="gradient-primary grid h-9 w-9 shrink-0 place-items-center rounded-full text-white"><Sparkles className="h-4 w-4" /></span>
        <div className="min-w-0 flex-1 text-xs">
          <p className="font-bold">You can change this anytime!</p>
          <p className="text-muted-foreground">Explore different personalities in settings.</p>
        </div>
        <Settings className="h-4 w-4 shrink-0 text-primary" />
      </div>
    </>
  );
}

function StepConfirm({ goal, personality }: { goal: string; personality: AiPersonality }) {
  const g = GOALS.find(x => x.id === goal)!;
  const p = PERSONALITIES.find(x => x.id === personality)!;
  return (
    <div className="mt-6">
      <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary"><Sparkles className="h-4 w-4" /> All Set!</div>
      <h1 className="mt-2 text-[28px] font-black leading-tight">Let's begin your<br/><span className="text-primary">journey together</span></h1>
      <div className="mt-6 flex justify-center"><img src={sanaHero} alt="Sana" className="h-56 w-auto object-contain drop-shadow-xl" /></div>
      <div className="mt-4 space-y-3">
        <div className="shadow-card flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
          <div className="text-2xl">{g.icon}</div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Your goal</div>
            <div className="text-sm font-bold">{g.label}</div>
          </div>
        </div>
        <div className="shadow-card rounded-2xl border border-border bg-card p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Your Sana</div>
          <div className={cn("text-sm font-bold", p.color)}>{p.label}</div>
          <p className="mt-1 text-xs text-muted-foreground">{p.tagline}</p>
        </div>
      </div>
    </div>
  );
}
