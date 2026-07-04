import { createFileRoute, Link } from "@tanstack/react-router";
import sanaHero from "@/assets/sana-hero.png";
import { GradientButton } from "@/components/app/GradientButton";
import { Sparkles, CalendarCheck, Target, BookOpen, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/welcome")({
  component: Welcome,
});

function Welcome() {
  return (
    <div className="min-h-svh bg-gradient-to-b from-background to-lavender/50">
      <div className="mx-auto flex min-h-svh w-full max-w-md flex-col px-6 pb-8 pt-12">
        <div className="flex flex-col items-center text-center">
          <div className="gradient-primary shadow-glow grid h-16 w-16 place-items-center rounded-2xl text-2xl font-black text-white">
            M
          </div>
          <h1 className="mt-4 text-3xl font-black tracking-tight">
            Mnemora Sync <span className="text-primary">AI</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Your AI Learning Companion</p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/5 px-4 py-2 text-xs font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Plan. Focus. Learn. Achieve.
          </div>
        </div>

        <div className="relative mt-6 grid place-items-center">
          <div className="absolute inset-x-6 top-6 h-64 rounded-full bg-lavender-deep/40 blur-3xl" />
          <img
            src={sanaHero}
            alt="Sana, your AI learning companion"
            className="relative h-72 w-auto object-contain drop-shadow-xl"
          />
          <FloatBadge className="absolute left-0 top-6" icon={<CalendarCheck className="h-4 w-4" />} label="Plan" />
          <FloatBadge className="absolute right-0 top-10" icon={<BookOpen className="h-4 w-4" />} label="Learn" />
          <FloatBadge className="absolute left-2 top-44" icon={<Target className="h-4 w-4" />} label="Focus" />
          <FloatBadge className="absolute right-2 top-56" icon={<TrendingUp className="h-4 w-4" />} label="Achieve" />
        </div>

        <blockquote className="mt-4 px-4 text-center">
          <p className="text-xl font-bold leading-snug">
            The best investment
            <br />
            you'll ever make is
          </p>
          <p className="font-script mt-1 text-4xl font-bold text-primary">in yourself.</p>
        </blockquote>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          I'm your AI study buddy, here to help you stay on track, motivated, and successful!
        </p>

        <div className="mt-auto pt-6">
          <Link to="/auth">
            <GradientButton>Let's Begin →</GradientButton>
          </Link>
          <p className="mt-3 text-center text-xs text-muted-foreground">Smart learning starts now 💜</p>
        </div>
      </div>
    </div>
  );
}

function FloatBadge({ icon, label, className }: { icon: React.ReactNode; label: string; className?: string }) {
  return (
    <div className={`shadow-card flex items-center gap-1.5 rounded-2xl bg-card px-3 py-2 text-xs font-semibold ${className}`}>
      <span className="text-primary">{icon}</span>
      {label}
    </div>
  );
}
