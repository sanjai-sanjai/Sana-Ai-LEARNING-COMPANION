import { Link, useNavigate } from "@tanstack/react-router";
import { Users, ChevronRight, Plus, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function StudyTogetherHomeCard() {
  const navigate = useNavigate();
  // Mock data for Phase 2 frontend display
  const hasGroups = false; 

  const recentGroups = [
    { title: "📚 Data Structures", members: 4, completion: 72, studyingNow: 2 },
    { title: "Operating Systems", members: 5, completion: 41, studyingNow: 0 },
    { title: "Python", members: 8, completion: 80, studyingNow: 0 },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      whileHover={{ y: -2, boxShadow: "0 10px 30px -10px rgba(0,0,0,0.08)" }}
      className="cursor-pointer overflow-hidden rounded-[24px] border border-border/70 bg-card p-4 shadow-card transition-all"
      onClick={() => navigate({ to: "/study-together" })}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2 text-[14px] font-extrabold">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-lavender text-primary">
            <Users className="h-3.5 w-3.5" />
          </span>
          Study Together
        </div>
      </div>
      
      <p className="mt-2 text-[12px] leading-snug text-muted-foreground">
        Study smarter with your friends using AI-powered collaboration.
      </p>

      {!hasGroups ? (
        <div className="mt-4 rounded-2xl border border-dashed border-border bg-background/50 p-5 text-center">
          <div className="mx-auto grid h-10 w-10 place-items-center rounded-2xl bg-lavender text-primary">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="mt-2 text-[13.5px] font-bold">No Study Groups Yet</div>
          <p className="mt-1 text-[11.5px] leading-snug text-muted-foreground">
            Start learning together by creating your first collaborative study group.
          </p>
          <div className="mt-4 flex flex-col items-center gap-2">
            <Link
              to="/study-together"
              onClick={(e) => e.stopPropagation()}
              className="gradient-primary shadow-soft flex h-10 w-full items-center justify-center gap-1.5 rounded-full text-[12.5px] font-bold text-primary-foreground transition-transform active:scale-95"
            >
              <Plus className="h-3.5 w-3.5" /> Create Study Group
            </Link>
            <div className="text-[10px] font-bold text-muted-foreground">or</div>
            <Link 
              to="/study-together"
              onClick={(e) => e.stopPropagation()}
              className="text-[11.5px] font-bold text-primary hover:underline"
            >
              Explore Feature
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="rounded-2xl border border-border/70 bg-background/50 p-3">
            <div className="flex items-center justify-between">
              <div className="text-[14px] font-bold">{recentGroups[0].title}</div>
              <div className="text-[11px] font-bold text-primary">{recentGroups[0].completion}% Completed</div>
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>{recentGroups[0].members} Members</span>
              {recentGroups[0].studyingNow > 0 && (
                <span className="flex items-center gap-1 text-success">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75"></span>
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-success"></span>
                  </span>
                  {recentGroups[0].studyingNow} studying now
                </span>
              )}
            </div>
            <Link
              to="/study-together"
              onClick={(e) => e.stopPropagation()}
              className="mt-3 flex w-full items-center justify-center gap-1 rounded-xl bg-primary/10 py-2 text-[12px] font-bold text-primary transition-transform active:scale-95"
            >
              Continue <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          
          <div className="space-y-1">
            {recentGroups.slice(1).map((group, idx) => (
              <div key={idx} className="flex items-center justify-between rounded-xl px-2 py-2 hover:bg-muted/40">
                <div className="min-w-0">
                  <div className="truncate text-[12.5px] font-semibold">{group.title}</div>
                  <div className="text-[10px] text-muted-foreground">{group.members} Members</div>
                </div>
                <div className="text-[11px] font-bold text-primary">{group.completion}%</div>
              </div>
            ))}
          </div>

          <Link
            to="/study-together"
            onClick={(e) => e.stopPropagation()}
            className="mt-2 flex w-full items-center justify-center gap-1 rounded-xl py-1.5 text-[12px] font-bold text-primary hover:bg-primary/5"
          >
            View All Groups <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}
    </motion.div>
  );
}
