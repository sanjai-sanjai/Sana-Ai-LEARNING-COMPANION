import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Bookmark, MoreVertical, RotateCw, ArrowLeft as Prev, ArrowRight as Next, Check, X, Lightbulb } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/revision/$setId/flashcards")({
  ssr: false,
  component: FlashcardsStudy,
});

type Filter = "all" | "review" | "known" | "difficult" | "bookmark";

function FlashcardsStudy() {
  const { setId } = Route.useParams();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Filter>("all");
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const { data: set } = useQuery({
    queryKey: ["set", setId],
    queryFn: async () => (await supabase.from("revision_sets").select("*").eq("id", setId).maybeSingle()).data,
  });
  const { data: cards = [] } = useQuery({
    queryKey: ["cards", setId],
    queryFn: async () => (await supabase.from("flashcards").select("*").eq("set_id", setId).order("created_at")).data ?? [],
  });

  const deck = cards.filter(c => {
    if (filter === "known") return c.status === "known" || c.mastery >= 80;
    if (filter === "difficult") return c.status === "difficult" || c.mastery < 30;
    if (filter === "review") return c.status !== "known";
    if (filter === "bookmark") return c.bookmarked;
    return true;
  });

  const card = deck[idx];
  const total = cards.length;
  const reviewed = cards.filter(c => c.mastery > 0).length;
  const known = cards.filter(c => c.status === "known").length;
  const mastery = cards.length ? Math.round(cards.reduce((a, c) => a + c.mastery, 0) / cards.length) : 0;

  async function answer(kind: "know" | "somewhat" | "dont") {
    if (!card) return;
    const delta = kind === "know" ? 25 : kind === "somewhat" ? 10 : -10;
    const mastery = Math.max(0, Math.min(100, (card.mastery || 0) + delta));
    const status = kind === "know" ? "known" : kind === "dont" ? "difficult" : "review";
    await supabase.from("flashcards").update({ mastery, status, last_reviewed_at: new Date().toISOString() }).eq("id", card.id);
    qc.invalidateQueries({ queryKey: ["cards", setId] });
    setFlipped(false); setShowHint(false);
    if (idx + 1 >= deck.length) { toast.success("Deck complete!"); setIdx(0); } else setIdx(idx + 1);
  }
  async function toggleBookmark() {
    if (!card) return;
    await supabase.from("flashcards").update({ bookmarked: !card.bookmarked }).eq("id", card.id);
    qc.invalidateQueries({ queryKey: ["cards", setId] });
  }

  return (
    <div className="pb-6">
      <header className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-3 px-5 pb-3 pt-6">
        <Link to="/revision/$setId" params={{ setId }} className="shadow-card grid h-11 w-11 place-items-center rounded-2xl bg-card"><ArrowLeft className="h-5 w-5" /></Link>
        <div className="min-w-0">
          <div className="flex items-center gap-2"><span className="text-xl">{set?.emoji || "📘"}</span><h1 className="truncate text-lg font-black">{set?.title || "Flashcards"}</h1></div>
          <div className="text-[11px] text-muted-foreground">Flashcards · Card {Math.min(idx+1, deck.length || 1)} of {deck.length || 1}</div>
        </div>
        <Link to="/revision/$setId/known" params={{ setId }} className="shadow-card grid h-11 w-11 place-items-center rounded-2xl bg-card" title="Known cards"><Check className="h-5 w-5 text-success" /></Link>
        <button className="shadow-card grid h-11 w-11 place-items-center rounded-2xl bg-card"><MoreVertical className="h-5 w-5" /></button>
      </header>

      {/* Stats card */}
      <section className="mx-5 rounded-[20px] border border-border bg-card p-4 shadow-card">
        <div className="grid grid-cols-4 gap-2 text-center">
          <div><div className="text-xl font-black text-primary">{total}</div><div className="text-[10px] text-muted-foreground">Total</div></div>
          <div><div className="text-xl font-black text-success">{reviewed}</div><div className="text-[10px] text-muted-foreground">Reviewed</div></div>
          <div><div className="text-xl font-black text-warning">{total - known}</div><div className="text-[10px] text-muted-foreground">Remaining</div></div>
          <div><div className="text-xl font-black text-primary">{mastery}%</div><div className="text-[10px] text-muted-foreground">Mastery</div></div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <div className="text-[10px] font-semibold text-muted-foreground">Progress</div>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted"><div className="gradient-primary h-full" style={{ width: `${(reviewed/(total||1))*100}%` }} /></div>
          <div className="text-[10px] font-bold">{reviewed}/{total}</div>
        </div>
      </section>

      {/* Filter tabs */}
      <div className="mx-5 mt-3 flex gap-4 overflow-x-auto border-b border-border text-sm">
        {(["all","review","known","difficult","bookmark"] as Filter[]).map(f => (
          <button key={f} onClick={()=>{setFilter(f); setIdx(0);}} className={cn("relative whitespace-nowrap pb-2 font-semibold capitalize", filter === f ? "text-primary" : "text-muted-foreground")}>
            {f === "all" ? "All Flashcards" : f === "review" ? "To Review" : f === "bookmark" ? "Bookmarks" : f}
            {filter === f && <span className="absolute inset-x-0 bottom-0 h-0.5 gradient-primary rounded-full" />}
          </button>
        ))}
      </div>

      {/* Card */}
      {!card ? (
        <div className="mx-5 mt-8 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No cards in this filter.</div>
      ) : (
        <>
          <div className="mx-5 mt-4 [perspective:1200px]">
            <AnimatePresence mode="wait">
              <motion.button
                key={card.id + (flipped ? "b" : "f")}
                initial={{ opacity: 0, rotateY: flipped ? -90 : 90 }}
                animate={{ opacity: 1, rotateY: 0 }}
                exit={{ opacity: 0, rotateY: flipped ? 90 : -90 }}
                transition={{ duration: 0.35 }}
                onClick={() => setFlipped(f => !f)}
                className={cn("shadow-glow relative grid min-h-[280px] w-full place-items-center rounded-[28px] border border-border p-6 text-left",
                  flipped ? "bg-emerald-50 dark:bg-emerald-950/20" : "bg-lavender")}
              >
                <button onClick={(e)=>{e.stopPropagation(); toggleBookmark();}} className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full bg-card shadow-card">
                  <Bookmark className={cn("h-4 w-4", card.bookmarked && "fill-primary text-primary")} />
                </button>
                <div className="absolute left-4 top-4 rounded-full bg-card px-2 py-0.5 text-[10px] font-bold uppercase text-primary shadow-card">{flipped ? "Back" : "Front"}</div>
                <div className="w-full">
                  {!flipped ? (
                    <div className="text-center">
                      <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-card text-primary shadow-card">{"</>"}</div>
                      <div className="mt-4 text-base font-bold leading-snug">{card.front}</div>
                      {showHint && card.hint && <div className="mt-3 rounded-xl bg-card p-3 text-xs text-muted-foreground shadow-card"><Lightbulb className="mr-1 inline h-3 w-3 text-warning" /> {card.hint}</div>}
                      <div className="mt-4 text-[11px] text-muted-foreground">Tap card to flip</div>
                    </div>
                  ) : (
                    <div>
                      <div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-success text-white"><Check className="h-5 w-5" /></div>
                      <div className="mt-3 text-center text-lg font-black">{card.back}</div>
                      {card.explanation && <div className="mt-3 rounded-xl bg-card p-3 text-xs shadow-card"><div className="font-bold">Explanation</div>{card.explanation}</div>}
                    </div>
                  )}
                </div>
              </motion.button>
            </AnimatePresence>
          </div>

          {card.hint && !flipped && (
            <div className="mx-5 mt-2 text-center">
              <button onClick={()=>setShowHint(s=>!s)} className="inline-flex items-center gap-1 text-xs font-semibold text-primary"><Lightbulb className="h-3 w-3" />{showHint ? "Hide hint" : "Show hint"}</button>
            </div>
          )}

          {/* Answer buttons */}
          {flipped ? (
            <div className="mx-5 mt-4 grid grid-cols-3 gap-2">
              <button onClick={()=>answer("dont")} className="shadow-card flex items-center justify-center gap-1 rounded-2xl border border-destructive/30 bg-card p-3 text-xs font-bold text-destructive">😕 Still confusing</button>
              <button onClick={()=>answer("somewhat")} className="shadow-card flex items-center justify-center gap-1 rounded-2xl border border-border bg-card p-3 text-xs font-bold">😐 Somewhat</button>
              <button onClick={()=>answer("know")} className="shadow-soft flex items-center justify-center gap-1 rounded-2xl bg-success p-3 text-xs font-bold text-white">😊 Got it!</button>
            </div>
          ) : (
            <div className="mx-5 mt-4 grid grid-cols-2 gap-3">
              <button onClick={()=>answer("dont")} className="shadow-card flex items-center justify-center gap-2 rounded-2xl border border-destructive/30 bg-card p-3 text-sm font-bold text-destructive"><X className="h-4 w-4" /> Don't know</button>
              <button onClick={()=>answer("know")} className="gradient-primary shadow-soft flex items-center justify-center gap-2 rounded-2xl p-3 text-sm font-bold text-primary-foreground"><Check className="h-4 w-4" /> I know it</button>
            </div>
          )}

          {/* Nav */}
          <div className="mx-5 mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <button onClick={()=>{setFlipped(false); setIdx(Math.max(0, idx-1));}} className="shadow-card flex items-center justify-center gap-1 rounded-2xl border border-border bg-card px-4 py-2 text-xs font-bold"><Prev className="h-4 w-4" /> Previous</button>
            <button onClick={()=>setFlipped(f=>!f)} className="gradient-primary shadow-glow grid h-11 w-11 place-items-center rounded-full text-primary-foreground"><RotateCw className="h-5 w-5" /></button>
            <button onClick={()=>{setFlipped(false); setIdx(Math.min(deck.length-1, idx+1));}} className="shadow-card flex items-center justify-center gap-1 rounded-2xl border border-border bg-card px-4 py-2 text-xs font-bold">Next <Next className="h-4 w-4" /></button>
          </div>
        </>
      )}
    </div>
  );
}
