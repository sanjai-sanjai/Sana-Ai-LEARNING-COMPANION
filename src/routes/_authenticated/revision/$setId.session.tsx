import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect, useMemo } from "react";
import { ArrowLeft, Pause, Play, Square, BookOpen, Layers, BarChart3, Target, Trophy, Sparkles, X, MessageCircle, Bookmark, Flame, Clock } from "lucide-react";
import { ProgressRing } from "@/components/app/ProgressRing";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/revision/$setId/session")({
  ssr: false,
  component: SessionPage,
});

type Phase = "intro" | "practice" | "summary";

const STAGES = [
  { key: "review", label: "Review", desc: "Learn & Refresh", icon: BookOpen },
  { key: "practice", label: "Practice", desc: "Test Yourself", icon: Layers },
  { key: "analyze", label: "Analyze", desc: "See Insights", icon: BarChart3 },
  { key: "improve", label: "Improve", desc: "Focus Weak Areas", icon: Target },
  { key: "master", label: "Master", desc: "Achieve Goal", icon: Trophy },
];

function SessionPage() {
  const { setId } = Route.useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [phase, setPhase] = useState<Phase>("intro");
  const [qIdx, setQIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [answered, setAnswered] = useState(0);
  const [paused, setPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [streak, setStreak] = useState(0);

  const { data: set } = useQuery({
    queryKey: ["set", setId],
    queryFn: async () => (await supabase.from("revision_sets").select("*").eq("id", setId).maybeSingle()).data,
  });
  const { data: quiz = [] } = useQuery({
    queryKey: ["quiz", setId],
    queryFn: async () => (await supabase.from("quiz_questions").select("*").eq("set_id", setId).order("created_at")).data ?? [],
  });
  const { data: notes = [] } = useQuery({
    queryKey: ["notes", setId],
    queryFn: async () => (await supabase.from("notes").select("*").eq("set_id", setId).order("position")).data ?? [],
  });

  useEffect(() => {
    if (phase !== "practice" || paused) return;
    const t = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(t);
  }, [phase, paused]);

  const q = quiz[qIdx];
  const total = quiz.length || 1;
  const progressPct = Math.round((answered / total) * 100);
  const score = answered ? Math.round((correct / answered) * 100) : 0;
  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  function pick(i: number) {
    if (revealed) return;
    setSelected(i);
  }
  function submit() {
    if (selected == null || !q) return;
    const isRight = selected === q.correct_index;
    setRevealed(true);
    setAnswered(a => a + 1);
    if (isRight) { setCorrect(c => c + 1); setStreak(s => s + 1); } else { setStreak(0); }
  }
  function nextQ() {
    setSelected(null); setRevealed(false); setSheet(false);
    if (qIdx + 1 >= quiz.length) {
      setPhase("summary");
      finalize();
    } else setQIdx(qIdx + 1);
  }
  async function finalize() {
    const finalScore = answered ? Math.round((correct / answered) * 100) : 0;
    await supabase.from("revision_sets").update({ progress_pct: finalScore, last_revised_at: new Date().toISOString() }).eq("id", setId);
    qc.invalidateQueries({ queryKey: ["set", setId] });
    qc.invalidateQueries({ queryKey: ["sets"] });
  }

  if (phase === "intro") {
    return (
      <div className="pb-8">
        <header className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-5 pb-3 pt-6">
          <Link to="/revision/$setId" params={{ setId }} className="shadow-card grid h-11 w-11 place-items-center rounded-2xl bg-card"><ArrowLeft className="h-5 w-5" /></Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2"><span className="text-xl">{set?.emoji || "📘"}</span><h1 className="truncate text-lg font-black">Smart Revision</h1></div>
            <div className="text-[11px] text-muted-foreground">{set?.title}</div>
          </div>
          <button onClick={()=>nav({ to: "/revision/$setId", params: { setId } })} className="rounded-xl border border-destructive/40 bg-card px-3 py-2 text-xs font-bold text-destructive"><Square className="mr-1 inline h-3 w-3" />End</button>
        </header>

        <section className="mx-5 rounded-[24px] bg-lavender p-5 shadow-card">
          <div className="text-xs font-bold text-primary">Session Goal</div>
          <div className="mt-1 text-lg font-black">Revise key concepts and strengthen weak areas. 🎯</div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <Kpi icon={<Clock className="h-3.5 w-3.5" />} val="60 min" lbl="Total Time" />
            <Kpi icon={<Layers className="h-3.5 w-3.5" />} val={String(quiz.length + notes.length)} lbl="Items" />
            <Kpi icon={<Target className="h-3.5 w-3.5" />} val="80%" lbl="Target" />
          </div>
        </section>

        <section className="mx-5 mt-4">
          <div className="text-sm font-bold">Your Revision Journey</div>
          <div className="mt-3 rounded-2xl border border-border bg-card p-4 shadow-card">
            <StageStrip active={0} />
          </div>
        </section>

        <section className="mx-5 mt-3 rounded-2xl bg-lavender p-4 text-xs text-muted-foreground shadow-card">
          <Sparkles className="mr-1 inline h-3 w-3 text-primary" /> We'll show you a mix of notes, flashcards and quick questions. Stay focused, take breaks if needed. 💪
        </section>

        <section className="mx-5 mt-4">
          <div className="text-sm font-bold">Up Next</div>
          <ul className="mt-2 space-y-2">
            {notes.slice(0, 5).map((n, i) => (
              <li key={n.id} className="shadow-card grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-border bg-card p-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-lavender text-primary">{i === 0 ? <Play className="h-4 w-4" /> : "📄"}</div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold">{i+1}. {n.title}</div>
                  <div className="text-[11px] text-muted-foreground">Notes · Flashcards</div>
                </div>
                <span className="rounded-full bg-lavender px-2 py-1 text-[10px] font-bold text-primary">10 min</span>
              </li>
            ))}
            {quiz.length > 0 && (
              <li className="shadow-card grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-border bg-card p-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-lavender text-primary">❓</div>
                <div className="min-w-0"><div className="truncate text-sm font-bold">Final Quiz</div><div className="text-[11px] text-muted-foreground">{quiz.length} Questions</div></div>
                <span className="rounded-full bg-lavender px-2 py-1 text-[10px] font-bold text-primary">10 min</span>
              </li>
            )}
          </ul>
        </section>

        <div className="mx-5 mt-5">
          <button
            onClick={() => { if (!quiz.length) { toast.error("No quiz questions in this set yet."); return; } setPhase("practice"); }}
            className="gradient-primary shadow-glow flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-base font-black text-primary-foreground"
          >
            <Play className="h-5 w-5" /> Start Revision
          </button>
          <div className="mt-1 text-center text-[11px] text-muted-foreground">Let's begin your smart revision!</div>
        </div>
      </div>
    );
  }

  if (phase === "summary") {
    return (
      <div className="pb-8">
        <header className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 px-5 pb-3 pt-6">
          <Link to="/revision/$setId" params={{ setId }} className="shadow-card grid h-11 w-11 place-items-center rounded-2xl bg-card"><ArrowLeft className="h-5 w-5" /></Link>
          <h1 className="text-lg font-black">Session Complete 🎉</h1>
        </header>
        <section className="mx-5 rounded-[24px] bg-lavender p-6 text-center shadow-card">
          <ProgressRing value={score} size={120} stroke={12} />
          <div className="mt-2 text-2xl font-black">{score}% score</div>
          <div className="text-xs text-muted-foreground">{correct} / {answered} correct · {mm}:{ss}</div>
        </section>
        <div className="mx-5 mt-4 grid grid-cols-2 gap-2">
          <button onClick={()=>{setPhase("intro"); setQIdx(0); setCorrect(0); setAnswered(0); setElapsed(0);}} className="shadow-card rounded-2xl border border-border bg-card p-3 text-sm font-bold">Revise again</button>
          <Link to="/revision/$setId" params={{ setId }} className="gradient-primary shadow-soft grid place-items-center rounded-2xl p-3 text-sm font-bold text-primary-foreground">Back to set</Link>
        </div>
      </div>
    );
  }

  // Practice phase
  return (
    <div className="pb-6">
      <header className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-2 px-5 pb-3 pt-6">
        <Link to="/revision/$setId" params={{ setId }} className="shadow-card grid h-11 w-11 place-items-center rounded-2xl bg-card"><ArrowLeft className="h-5 w-5" /></Link>
        <div className="min-w-0">
          <div className="flex items-center gap-2"><span className="text-xl">{set?.emoji || "📘"}</span><h1 className="truncate text-lg font-black">Smart Revision</h1></div>
          <div className="text-[11px] text-muted-foreground">{set?.title}</div>
        </div>
        <button onClick={()=>setPaused(p=>!p)} className="rounded-xl border border-border bg-card px-3 py-2 text-xs font-bold text-primary">{paused ? <><Play className="mr-1 inline h-3 w-3" />Resume</> : <><Pause className="mr-1 inline h-3 w-3" />Pause</>}</button>
        <button onClick={()=>{ setPhase("summary"); finalize(); }} className="rounded-xl border border-destructive/40 bg-card px-3 py-2 text-xs font-bold text-destructive"><Square className="mr-1 inline h-3 w-3" />End</button>
      </header>

      <section className="mx-5 rounded-[20px] bg-lavender p-4 shadow-card">
        <div className="grid grid-cols-3 items-center gap-3">
          <div>
            <div className="text-[10px] text-muted-foreground">Session Progress</div>
            <div className="text-2xl font-black text-primary">{progressPct}%</div>
            <div className="text-[10px] text-muted-foreground">{answered}/{total} completed</div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/60"><div className="gradient-primary h-full" style={{width:`${progressPct}%`}}/></div>
          </div>
          <div className="text-center">
            <div className="text-[10px] text-muted-foreground">Time Elapsed</div>
            <div className="mt-1 text-2xl font-black">{mm}:{ss}</div>
            <div className="text-[10px] text-muted-foreground">/ 60 min</div>
          </div>
          <div className="text-center">
            <div className="text-[10px] text-muted-foreground">Score</div>
            <ProgressRing value={score} size={60} stroke={7} />
            <div className="mt-0.5 text-[10px] font-bold text-primary">{score >= 70 ? "Good job! 👏" : "Keep going"}</div>
          </div>
        </div>
      </section>

      <div className="mx-5 mt-3 rounded-2xl border border-border bg-card p-3 shadow-card">
        <StageStrip active={1} />
      </div>

      {/* Question card */}
      {!q ? (
        <div className="mx-5 mt-6 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No quiz questions.</div>
      ) : (
        <section className="mx-5 mt-3 rounded-2xl border-2 border-primary/30 bg-card p-4 shadow-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-lavender px-2 py-1 text-[10px] font-bold text-primary">{qIdx+1} / {total}</span>
              <span className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-bold text-success capitalize">{q.difficulty}</span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              <button><Bookmark className="h-4 w-4" /></button>
              <button className="text-destructive">⚑ Report</button>
            </div>
          </div>
          <div className="mt-3 text-sm font-semibold">{q.question}</div>
          {q.code_snippet && (
            <pre className="mt-2 overflow-x-auto rounded-xl bg-slate-900 p-3 text-xs text-slate-100"><code>{q.code_snippet}</code></pre>
          )}
          <ul className="mt-3 space-y-2">
            {(q.options as string[]).map((opt: string, i: number) => {
              const isSel = selected === i;
              const isCorrect = revealed && i === q.correct_index;
              const isWrong = revealed && isSel && i !== q.correct_index;
              return (
                <li key={i}>
                  <button onClick={()=>pick(i)} disabled={revealed} className={cn(
                    "flex w-full items-center gap-3 rounded-2xl border p-3 text-left text-sm transition",
                    isCorrect ? "border-success bg-success/10" :
                    isWrong ? "border-destructive bg-destructive/10" :
                    isSel ? "border-primary bg-lavender" : "border-border bg-card"
                  )}>
                    <span className={cn("grid h-6 w-6 place-items-center rounded-full border text-[10px] font-bold",
                      isSel ? "border-primary bg-primary text-primary-foreground" : "border-border"
                    )}>{String.fromCharCode(65+i)}</span>
                    <span className="flex-1">{opt}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          <button onClick={()=>setSheet(true)} className="mt-3 flex w-full items-center justify-between rounded-2xl bg-lavender p-3 text-xs font-semibold text-primary shadow-card">
            <span>💡 Not sure? Reveal answer and explanation</span>
            <span>⌄</span>
          </button>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button onClick={()=>{ setSelected(null); setRevealed(false); setQIdx(Math.max(0, qIdx-1)); }} className="shadow-card rounded-2xl border border-border bg-card p-3 text-xs font-bold">← Previous</button>
            {revealed
              ? <button onClick={nextQ} className="gradient-primary shadow-soft rounded-2xl p-3 text-xs font-bold text-primary-foreground">Next →</button>
              : <button onClick={submit} disabled={selected==null} className="gradient-primary shadow-soft rounded-2xl p-3 text-xs font-bold text-primary-foreground disabled:opacity-50">Submit</button>
            }
          </div>
        </section>
      )}

      {/* Streak / focus card */}
      <section className="mx-5 mt-3 grid grid-cols-3 gap-2 rounded-2xl border border-border bg-card p-3 shadow-card">
        <div><div className="text-[10px] text-muted-foreground">Streak</div><div className="text-base font-black"><Flame className="mr-0.5 inline h-4 w-4 text-warning" />{streak}</div><div className="text-[10px] text-muted-foreground">Questions correct</div></div>
        <div><div className="text-[10px] text-muted-foreground">Focus Area</div><div className="text-xs font-bold">{q?.topic || "—"}</div></div>
        <div><div className="text-[10px] text-muted-foreground">Break</div><div className="text-xs font-bold text-primary">Take one soon</div></div>
      </section>

      {/* Bottom sheet: answer & explanation */}
      <AnimatePresence>
        {sheet && q && (
          <>
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-40 bg-black/40" onClick={()=>setSheet(false)} />
            <motion.div initial={{y:"100%"}} animate={{y:0}} exit={{y:"100%"}} transition={{type:"spring",damping:28}} className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-[28px] bg-card p-5 shadow-glow">
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted" />
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-2">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-lavender text-primary">💡</div>
                  <div><div className="text-base font-black">Answer & Explanation</div><div className="text-xs text-muted-foreground">Let's understand this step by step.</div></div>
                </div>
                <button onClick={()=>setSheet(false)} className="grid h-8 w-8 place-items-center rounded-full bg-muted"><X className="h-4 w-4" /></button>
              </div>

              <div className="mt-4">
                <div className="text-sm font-bold">1. Correct Answer</div>
                <div className="mt-2 flex items-center gap-3 rounded-2xl bg-lavender p-3">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">{String.fromCharCode(65+q.correct_index)}</span>
                  <span className="text-sm font-bold text-primary">{(q.options as string[])[q.correct_index]}</span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{q.explanation}</p>
              </div>

              <div className="mt-4">
                <div className="text-sm font-bold">2. Why other options are incorrect</div>
                <ul className="mt-2 space-y-2">
                  {(q.options as string[]).map((opt: string, i: number) => i !== q.correct_index && (
                    <li key={i} className="flex items-start gap-2 rounded-2xl border border-border bg-card p-3">
                      <span className="text-[10px] font-bold text-muted-foreground">{String.fromCharCode(65+i)}</span>
                      <div className="flex-1 text-xs"><div className="font-semibold">{opt}</div></div>
                      <X className="h-3 w-3 text-destructive" />
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-4 rounded-2xl bg-lavender p-3">
                <div className="flex items-start gap-2"><Sparkles className="h-4 w-4 text-primary" /><div><div className="text-xs font-bold">Key Takeaway</div><div className="text-xs text-muted-foreground">{q.explanation}</div></div></div>
              </div>

              <div className="sticky bottom-0 mt-4 flex items-center justify-between gap-3 border-t border-border bg-card pt-3">
                <Link to="/chat" className="text-xs font-semibold text-primary"><MessageCircle className="mr-1 inline h-3 w-3" /> Ask AI for help</Link>
                <button onClick={()=>{ if (!revealed) { setSelected(q.correct_index); submit(); } setSheet(false); nextQ(); }} className="gradient-primary shadow-soft rounded-2xl px-4 py-2 text-xs font-bold text-primary-foreground">Got it! Next →</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function StageStrip({ active }: { active: number }) {
  return (
    <div className="flex items-center justify-between">
      {STAGES.map((s, i) => (
        <div key={s.key} className="flex flex-1 flex-col items-center">
          <div className="flex w-full items-center">
            {i > 0 && <div className={cn("h-0.5 flex-1", i <= active ? "bg-primary" : "bg-muted")} />}
            <div className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-full", i <= active ? "gradient-primary text-primary-foreground shadow-glow" : "bg-muted text-muted-foreground")}>
              <s.icon className="h-5 w-5" />
            </div>
            {i < STAGES.length - 1 && <div className={cn("h-0.5 flex-1", i < active ? "bg-primary" : "bg-muted")} />}
          </div>
          <div className="mt-1 text-[10px] font-bold">{i+1}</div>
          <div className="text-[10px] font-bold">{s.label}</div>
          <div className="text-[9px] text-muted-foreground">{s.desc}</div>
        </div>
      ))}
    </div>
  );
}

function Kpi({ icon, val, lbl }: { icon: React.ReactNode; val: string; lbl: string }) {
  return (
    <div className="rounded-xl bg-card/60 p-2">
      <div className="flex items-center justify-center gap-1 text-primary">{icon}<span className="text-sm font-black">{val}</span></div>
      <div className="text-[10px] text-muted-foreground">{lbl}</div>
    </div>
  );
}
