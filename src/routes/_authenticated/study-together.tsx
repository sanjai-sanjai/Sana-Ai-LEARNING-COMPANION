import { createFileRoute } from "@tanstack/react-router";
import { TopBar } from "@/components/app/TopBar";
import { Users, Plus, Sparkles, Clock, ArrowRight } from "lucide-react";
import { GradientButton } from "@/components/app/GradientButton";

export const Route = createFileRoute("/_authenticated/study-together")({
  component: StudyTogetherScreen,
});

function StudyTogetherScreen() {
  return (
    <div className="min-h-svh bg-background pb-8">
      <TopBar title="Study Together" back="/home" />

      <div className="mx-4 mt-6 flex flex-col items-center text-center">
        <div className="relative mb-6 grid h-32 w-32 place-items-center rounded-full bg-gradient-to-br from-lavender via-primary/10 to-primary/5 shadow-soft">
          <div className="absolute inset-0 animate-pulse rounded-full border-2 border-primary/20" />
          <Users className="h-14 w-14 text-primary" />
          <div className="absolute -bottom-2 -right-2 grid h-10 w-10 place-items-center rounded-full bg-background shadow-md">
            <Sparkles className="h-5 w-5 text-warning" />
          </div>
        </div>

        <h1 className="text-2xl font-black tracking-tight">Study Together</h1>
        <p className="mt-3 px-4 text-[13.5px] leading-relaxed text-muted-foreground">
          Study Together is where you and your friends collaborate with AI to prepare smarter for exams.
        </p>

        <div className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-[11px] font-bold text-primary">
          <Clock className="h-3.5 w-3.5" />
          More collaborative features will be added in the next update.
        </div>
      </div>

      <div className="mx-4 mt-8 space-y-3">
        <button className="gradient-primary shadow-soft flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-[14px] font-bold text-primary-foreground active:scale-[0.98] transition-transform">
          <Plus className="h-5 w-5" /> Create Group
        </button>
        <button className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl border border-border/70 bg-card text-[14px] font-bold text-muted-foreground active:scale-[0.98] transition-transform opacity-70 cursor-not-allowed">
          Coming Soon
        </button>
      </div>

      <div className="mx-4 mt-8 rounded-[24px] border border-border/70 bg-card p-5 shadow-card">
        <h3 className="text-[14px] font-extrabold flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-lavender text-primary">
            <Sparkles className="h-3.5 w-3.5" />
          </span>
          What to expect
        </h3>
        <ul className="mt-4 space-y-4">
          {[
            { title: "Shared Notes", desc: "Collaborate on study notes seamlessly in real-time." },
            { title: "AI Tutor", desc: "Get an AI assistant to help guide your group's study sessions." },
            { title: "Topic Distribution", desc: "Automatically assign different topics to each member." }
          ].map((feature, i) => (
            <li key={i} className="flex gap-3">
              <div className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                <ArrowRight className="h-3 w-3" />
              </div>
              <div className="min-w-0">
                <div className="text-[13px] font-bold">{feature.title}</div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">{feature.desc}</div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
