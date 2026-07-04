import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Share2, MoreVertical, BarChart3, List, Lightbulb, Star, Calendar, ChevronDown, Target, TrendingUp, Trophy } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/revision/$setId/summary")({
  ssr: false,
  component: SummaryPage,
});

type Tab = "overview" | "topics" | "takeaways";

function SummaryPage() {
  const { setId } = Route.useParams();
  const [tab, setTab] = useState<Tab>("overview");

  const { data: set } = useQuery({
    queryKey: ["set", setId],
    queryFn: async () => (await supabase.from("revision_sets").select("*").eq("id", setId).maybeSingle()).data,
  });
  const { data: notes = [] } = useQuery({
    queryKey: ["notes", setId],
    queryFn: async () => (await supabase.from("notes").select("*").eq("set_id", setId).order("position")).data ?? [],
  });
  const { data: cards = [] } = useQuery({
    queryKey: ["cards", setId],
    queryFn: async () => (await supabase.from("flashcards").select("*").eq("set_id", setId)).data ?? [],
  });

  if (!set) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;

  const overall = set.progress_pct ?? 0;
  const topics = groupBy(notes as any[], (n: any) => n.topic || "General");
  const cardsByTopic = groupBy(cards as any[], (c: any) => c.topic || "General");
  const conceptsCovered = Object.keys(topics).length;
  const favorites = (notes as any[]).filter((n: any) => n.is_favorite).length;


  return (
    <div className="pb-8">
      <header className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-2 px-5 pb-3 pt-6">
        <Link to="/revision/$setId" params={{ setId }} className="shadow-card grid h-11 w-11 place-items-center rounded-2xl bg-card"><ArrowLeft className="h-5 w-5" /></Link>
        <div className="min-w-0">
          <div className="flex items-center gap-2"><span className="text-xl">{set.emoji || "📘"}</span><h1 className="truncate text-base font-black">{set.title}</h1></div>
          <div className="text-[11px] text-muted-foreground">Summary</div>
        </div>
        <button className="shadow-card grid h-10 w-10 place-items-center rounded-2xl bg-card"><Share2 className="h-4 w-4" /></button>
        <button className="shadow-card grid h-10 w-10 place-items-center rounded-2xl bg-card"><MoreVertical className="h-4 w-4" /></button>
      </header>

      {/* Segmented control */}
      <div className="mx-5 grid grid-cols-3 gap-1 rounded-2xl bg-lavender/40 p-1 shadow-card">
        <SegBtn active={tab === "overview"} onClick={() => setTab("overview")} icon={<BarChart3 className="h-4 w-4" />} label="Overview" />
        <SegBtn active={tab === "topics"} onClick={() => setTab("topics")} icon={<List className="h-4 w-4" />} label="By Topic" />
        <SegBtn active={tab === "takeaways"} onClick={() => setTab("takeaways")} icon={<Lightbulb className="h-4 w-4" />} label="Key Takeaways" />
      </div>

      {tab === "overview" && (
        <>
          <section className="mx-5 mt-4 rounded-[24px] bg-lavender/50 p-4 shadow-card">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-base font-black">Your Learning Summary</div>
                <button className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground"><Calendar className="h-3 w-3" /> Last 7 Days <ChevronDown className="h-3 w-3" /></button>
              </div>
              <div className="text-3xl">📋</div>
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2 text-center">
              <StatBig icon="📖" val={notes.length} lbl="Notes" tone="bg-lavender text-primary" />
              <StatBig icon="✅" val={`${overall}%`} lbl="Concepts" tone="bg-success/10 text-success" />
              <StatBig icon="⭐" val={favorites} lbl="Favorites" tone="bg-warning/10 text-warning" />
              <StatBig icon="⏱️" val="12h" lbl="Time" tone="bg-blue/10 text-blue" />
            </div>
            <div className="mt-3">
              <div className="mb-1 flex items-center justify-between text-[11px]"><span className="font-bold">Overall Progress</span><span className="font-black">{overall}%</span></div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/60"><div className="gradient-primary h-full" style={{ width: `${overall}%` }} /></div>
            </div>
          </section>

          <section className="mx-5 mt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black">Topic Wise Summary</h3>
              <button onClick={() => setTab("topics")} className="text-xs font-bold text-primary">View All</button>
            </div>
            <div className="mt-2 space-y-2">
              {Object.entries(topics).slice(0, 5).map(([name, list]) => {
                const cnt = list.length;
                const c = cardsByTopic[name]?.length ?? 0;
                const pct = Math.min(100, Math.round(((list.filter((n: any) => n.is_reviewed).length + 1) / (cnt + 1)) * 100));
                const fav = list.some((n: any) => n.is_favorite);
                return (
                  <div key={name} className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto_auto] items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-card">
                    <div className="grid h-11 w-11 place-items-center rounded-2xl bg-lavender/60 text-primary">📘</div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-black">{name}</div>
                      <div className="truncate text-[11px] text-muted-foreground">{cnt} notes covered</div>
                      <div className="mt-1 flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"><div className="gradient-primary h-full" style={{ width: `${pct}%` }} /></div>
                        <span className="text-[10px] font-black">{pct}%</span>
                      </div>
                    </div>
                    <div className="text-center"><div className="text-sm font-black">{cnt}</div><div className="text-[9px] text-muted-foreground">Notes</div></div>
                    <div className="text-center"><div className="text-sm font-black">{c}</div><div className="text-[9px] text-muted-foreground">Flashcards</div></div>
                    <Star className={cn("h-4 w-4", fav ? "fill-warning text-warning" : "text-muted-foreground")} />
                  </div>
                );
              })}
            </div>
          </section>

          <section className="mx-5 mt-4 rounded-2xl border border-border bg-card p-4 shadow-card">
            <div className="text-sm font-black">Key Takeaways</div>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <MiniTake tone="bg-lavender/60 text-primary" icon={<Target className="h-4 w-4" />} title="Doing great!" body={`${overall}% of set complete.`} />
              <MiniTake tone="bg-success/10 text-success" icon={<TrendingUp className="h-4 w-4" />} title="Keep going" body="Focus on weak topics." />
              <MiniTake tone="bg-warning/10 text-warning" icon={<Trophy className="h-4 w-4" />} title="Consistent" body={`${conceptsCovered} concepts covered.`} />
            </div>
          </section>

          <section className="mx-5 mt-4 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl bg-lavender/60 p-4 shadow-card">
            <div className="text-3xl">🤖</div>
            <div className="min-w-0">
              <div className="text-sm font-black text-primary">Sana's Insight ✨</div>
              <div className="text-[11px] text-muted-foreground">You've built a strong foundation! Focus on practice to level up.</div>
            </div>
            <Link to="/revision/$setId/session" params={{ setId }} className="gradient-primary shadow-soft rounded-xl px-3 py-2 text-xs font-black text-primary-foreground">Start Revision</Link>
          </section>
        </>
      )}

      {tab === "topics" && (
        <section className="mx-5 mt-4 space-y-2">
          {Object.entries(topics).map(([name, list]) => (
            <div key={name} className="rounded-2xl border border-border bg-card p-3 shadow-card">
              <div className="flex items-center justify-between">
                <div className="text-sm font-black">{name}</div>
                <span className="rounded-full bg-lavender/60 px-2 py-0.5 text-[10px] font-bold text-primary">{list.length} notes</span>
              </div>
              <ul className="mt-2 space-y-1">
                {list.slice(0, 6).map((n: any) => (
                  <li key={n.id} className="text-xs">
                    <Link to="/revision/$setId/topic/$noteId" params={{ setId, noteId: n.id }} className="text-muted-foreground hover:text-primary">• {n.title}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}

      {tab === "takeaways" && (
        <section className="mx-5 mt-4 space-y-2">
          {(notes as any[]).filter((n: any) => n.key_points?.length).slice(0, 8).map((n: any) => (
            <div key={n.id} className="rounded-2xl border border-border bg-card p-3 shadow-card">
              <div className="text-sm font-black">{n.title}</div>
              <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                {n.key_points.slice(0, 4).map((k: string, i: number) => <li key={i}>• {k}</li>)}
              </ul>
            </div>
          ))}
          {!(notes as any[]).some((n: any) => n.key_points?.length) && (
            <div className="rounded-2xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">No key takeaways yet.</div>
          )}
        </section>
      )}
    </div>
  );
}

function SegBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick} className={cn("inline-flex items-center justify-center gap-1 rounded-xl px-2 py-2 text-[11px] font-bold",
      active ? "gradient-primary text-primary-foreground shadow-soft" : "text-muted-foreground")}>{icon} {label}</button>
  );
}
function StatBig({ icon, val, lbl, tone }: { icon: string; val: React.ReactNode; lbl: string; tone: string }) {
  return (
    <div className="rounded-2xl bg-card p-2 shadow-card">
      <div className={cn("mx-auto grid h-8 w-8 place-items-center rounded-full", tone)}>{icon}</div>
      <div className="mt-1 text-base font-black">{val}</div>
      <div className="text-[10px] text-muted-foreground">{lbl}</div>
    </div>
  );
}
function MiniTake({ tone, icon, title, body }: { tone: string; icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className={cn("rounded-2xl p-2", tone)}>
      <div className="flex items-center gap-1 text-[11px] font-black">{icon}{title}</div>
      <div className="mt-0.5 text-[10px] opacity-80">{body}</div>
    </div>
  );
}
function groupBy<T>(arr: T[], key: (t: T) => string): Record<string, T[]> {
  return arr.reduce((acc, item) => {
    const k = key(item);
    (acc[k] = acc[k] || []).push(item);
    return acc;
  }, {} as Record<string, T[]>);
}
