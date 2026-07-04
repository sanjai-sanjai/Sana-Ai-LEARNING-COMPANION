import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { GradientButton } from "@/components/app/GradientButton";
import sanaHero from "@/assets/sana-hero.png";
import { Mail, Lock, Eye, EyeOff, User, Phone, MapPin, Users } from "lucide-react";
import { toast } from "sonner";
import { validatePhone } from "@/lib/phone";

export const Route = createFileRoute("/auth")({
  component: Auth,
});

function Auth() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "other" | "prefer_not" | "">("");
  const [location, setLocation] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  async function persistProfileFields(userId: string) {
    const phoneCheck = validatePhone(phone);
    if (!phoneCheck.ok) return;
    await supabase
      .from("profiles")
      .update({
        display_name: displayName || email.split("@")[0],
        phone_e164: phoneCheck.e164,
        gender: gender || null,
        location: location.trim() || null,
      })
      .eq("user_id", userId);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        // Require + validate phone up-front so AI Calls work end-to-end.
        const phoneCheck = validatePhone(phone);
        if (!phoneCheck.ok) {
          toast.error(phoneCheck.reason);
          setLoading(false);
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/onboarding`,
            data: {
              display_name: displayName || email.split("@")[0],
              phone_e164: phoneCheck.e164,
              gender: gender || null,
              location: location.trim() || null,
            },
          },
        });
        if (error) {
          const msg = error.message.toLowerCase();
          if (msg.includes("rate limit") || msg.includes("already registered") || msg.includes("already been registered")) {
            const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
            if (signInErr) {
              toast.error("Email confirmations are rate-limited on this project. Disable 'Confirm email' in Supabase Auth settings, or try again later.");
              return;
            }
            if (signInData.user) await persistProfileFields(signInData.user.id);
            nav({ to: "/home" });
            return;
          }
          throw error;
        }
        if (data.session && data.user) {
          await persistProfileFields(data.user.id);
          toast.success("Account created");
          nav({ to: "/onboarding" });
        } else {
          toast.success("Check your email to confirm your account");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        nav({ to: "/home" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Auth error");
    } finally {
      setLoading(false);
    }
  }

  async function oauth(provider: "google" | "apple") {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/onboarding` },
      });
      if (error) throw error;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "OAuth error";
      toast.error(`${provider} sign-in failed: ${msg}. Enable ${provider} provider in your Supabase dashboard.`);
    }
  }

  return (
    <div className="min-h-svh bg-background">
      <div className="mx-auto flex min-h-svh w-full max-w-md flex-col px-6 pt-10">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
          <div>
            <div className="gradient-primary grid h-12 w-12 place-items-center rounded-2xl text-lg font-black text-white">
              M
            </div>
            <h1 className="mt-4 text-3xl font-black leading-tight">
              {mode === "signin" ? "Welcome" : "Create"}
              <br />
              <span className="text-primary">{mode === "signin" ? "Back!" : "Account"}</span>
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {mode === "signin" ? "Glad to see you again!" : "Start your AI learning journey"}
            </p>
            <div className="mt-3 flex items-center gap-1.5">
              <div className="h-1 w-10 rounded-full bg-primary" />
              <div className="h-1 w-2 rounded-full bg-primary" />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              {mode === "signin" ? "Login to continue your" : "Sign up to begin your"} learning journey with AI ✨
            </p>
          </div>
          <img src={sanaHero} alt="Sana" className="h-40 w-auto object-contain" />
        </div>

        <form onSubmit={submit} className="mt-6 space-y-4">
          {mode === "signup" && (
            <Field
              icon={<User className="h-5 w-5" />}
              label="Name"
              placeholder="Your name"
              value={displayName}
              onChange={setDisplayName}
              type="text"
            />
          )}
          <Field
            icon={<Mail className="h-5 w-5" />}
            label="Email"
            placeholder="Enter your email"
            value={email}
            onChange={setEmail}
            type="email"
          />
          <Field
            icon={<Lock className="h-5 w-5" />}
            label="Password"
            placeholder="Enter your password"
            value={password}
            onChange={setPassword}
            type={show ? "text" : "password"}
            trailing={
              <button type="button" onClick={() => setShow((s) => !s)} className="text-muted-foreground">
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
          />
          {mode === "signup" && (
            <>
              <Field
                icon={<Phone className="h-5 w-5" />}
                label="Phone (for AI Calls)"
                placeholder="+1 555 123 4567"
                value={phone}
                onChange={setPhone}
                type="tel"
              />
              <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
                <div className="shadow-card grid h-14 w-14 place-items-center rounded-2xl border border-border bg-card text-primary">
                  <Users className="h-5 w-5" />
                </div>
                <div className="min-w-0 border-b border-border pb-2">
                  <div className="text-sm font-bold">Gender <span className="font-normal text-muted-foreground">(optional)</span></div>
                  <select
                    className="mt-1 w-full bg-transparent text-sm focus:outline-none"
                    value={gender}
                    onChange={(e) => setGender(e.target.value as typeof gender)}
                  >
                    <option value="">Prefer not to say</option>
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <Field
                icon={<MapPin className="h-5 w-5" />}
                label="Location"
                placeholder="City, Country (optional)"
                value={location}
                onChange={setLocation}
                type="text"
                optional
              />
            </>
          )}

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" defaultChecked className="h-4 w-4 accent-primary" />
              <span className="text-muted-foreground">Remember me</span>
            </label>
            <button type="button" className="font-semibold text-primary">Forgot Password?</button>
          </div>

          <GradientButton disabled={loading}>
            {loading ? "Please wait…" : mode === "signin" ? "Login →" : "Sign Up →"}
          </GradientButton>
        </form>

        <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" />
          or continue with
          <div className="h-px flex-1 bg-border" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={() => oauth("google")} className="shadow-card flex h-12 items-center justify-center gap-2 rounded-2xl border border-border bg-card text-sm font-semibold">
            <span className="grid h-5 w-5 place-items-center rounded-full bg-white text-[10px] font-black text-primary">G</span> Google
          </button>
          <button type="button" onClick={() => oauth("apple")} className="shadow-card flex h-12 items-center justify-center gap-2 rounded-2xl border border-border bg-card text-sm font-semibold">
             Apple
          </button>
        </div>

        <p className="mb-8 mt-6 text-center text-sm">
          {mode === "signin" ? "Don't have an account? " : "Have an account? "}
          <button type="button" className="font-semibold text-primary" onClick={() => setMode(mode === "signin" ? "signup" : "signin")}>
            {mode === "signin" ? "Sign Up" : "Sign In"}
          </button>
        </p>
      </div>
    </div>
  );
}

function Field({ icon, label, placeholder, value, onChange, type, trailing, optional = false }: {
  icon: React.ReactNode; label: string; placeholder: string; value: string; onChange: (v: string) => void; type: string; trailing?: React.ReactNode; optional?: boolean;
}) {
  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
      <div className="shadow-card grid h-14 w-14 place-items-center rounded-2xl border border-border bg-card text-primary">
        {icon}
      </div>
      <div className="min-w-0 border-b border-border pb-2">
        <div className="text-sm font-bold">
          {label} {optional && <span className="font-normal text-muted-foreground">(optional)</span>}
        </div>
        <div className="mt-1 flex items-center gap-2">
          <input
            className="min-w-0 flex-1 bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            type={type}
            required={!optional}
          />
          {trailing}
        </div>
      </div>
    </div>
  );
}
