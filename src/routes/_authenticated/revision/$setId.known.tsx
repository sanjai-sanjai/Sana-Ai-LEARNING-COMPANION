import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Check, Flame, BarChart3 } from "lucide-react";
import { ProgressRing } from "@/components/app/ProgressRing";

export const Route = createFileRoute("/_authenticated/revision/$setId/known")({
  ssr: false,
  component: KnownPage,
});

function KnownPage() {
  const { setId } = Route.useParams();
  const { data: set } = useQuery({
    queryKey: ["set", setId],
    queryFn: async () => (await supabase.from("revision_sets").select("*").eq("id", setId).maybeSingle()).data,
  });
  const { data: cards = [] } = useQuery({
    queryKey: ["cards", setId],
    queryFn: async () => (await supabase.from("flashcards").select("*").eq("set_id", setId).order("last_reviewed_at", { ascending: false })).data ?? [],
  });
  const known = cards.filter(c => c.status === "known" || c.mastery >= 80);
  const mastery = cards.length ? Math.round(cards.reduce((a, c) => a + c.mastery, 0) / cards.length) : 0;

  return (
    <div className="pb-24">
      <header className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 px-5 pb-3 pt-6">
        <Link to="/revision/$setId/flashcards" params={{ setId }} className="shadow-card grid h-11 w-11 place-items-center rounded-2xl bg-card"><ArrowLeft className="h-5 w-5" /></Link>
        <div className="min-w-0"><h1 className="truncate text-lg font-black">{set?.title}</h1><div className="text-[11px] text-muted-foreground">Known Cards</div></div>
      </header>

      <section className="mx-5 grid grid-cols-3 items-center gap-3 rounded-[24px] border border-border bg-card p-4 shadow-card">
        <div className="text-center">
          <div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-success/10 text-success"><Check className="h-5 w-5" /></div>
          <div className="mt-1 text-2xl font-black">{known.length}</div>
          <div className="text-[10px] font-semibold">Known Cards</div>
          <div className="mt-1 inline-block rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-bold text-success">Great! 🔥</div>
        </div>
        <div className="text-center"><ProgressRing value={mastery} size={80} stroke={9} /><div className="mt-1 text-[10px] font-bold">Mastery</div></div>
        <div className="text-[11px]">
          <div className="rounded-xl bg-lavender p-2"><div className="text-muted-foreground">Last Reviewed</div><div className="font-bold">{cards[0]?.last_reviewed_at ? new Date(cards[0].last_reviewed_at).toLocaleString() : "—"}</div></div>
          <div className="mt-1 rounded-xl bg-lavender p-2"><div className="text-muted-foreground">Next Review</div><div className="font-bold">Tomorrow</div></div>
        </div>
      </section>

      <div className="mx-5 mt-4">
        <div className="text-sm font-bold">Cards you know well ✨</div>
        <div className="text-[11px] text-muted-foreground">Great work! These cards are mastered by you.</div>
      </div>

      <ul className="mx-5 mt-3 divide-y divide-border rounded-2xl border border-border bg-card shadow-card">
        {known.length === 0 && <li className="p-6 text-center text-sm text-muted-foreground">No known cards yet. Keep studying!</li>}
        {known.map((c) => (
          <li key={c.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-3 p-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-lavender text-primary">📘</div>
            <div className="min-w-0"><div className="truncate text-sm font-bold">{c.topic || c.front.slice(0, 30)}</div><div className="truncate text-[11px] text-muted-foreground">{c.front}</div></div>
            <span className="rounded-full bg-success/10 px-2 py-1 text-[10px] font-bold text-success"><Check className="mr-0.5 inline h-3 w-3" />Mastered</span>
            <div className="text-right text-[10px] text-muted-foreground">{c.last_reviewed_at ? new Date(c.last_reviewed_at).toLocaleDateString() : "—"}</div>
          </li>
        ))}
      </ul>

      <section className="mx-5 mt-4 rounded-2xl bg-lavender p-4 shadow-card">
        <div className="text-sm font-bold text-primary">Well done! 💡</div>
        <div className="text-xs text-muted-foreground">You know these topics well. Keep revising regularly to retain them forever.</div>
      </section>

      <div className="fixed inset-x-5 bottom-20 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl bg-primary p-3 text-primary-foreground shadow-glow">
        <div className="text-xs"><Flame className="inline h-4 w-4 text-warning" /> <span className="font-black">12</span><div className="text-[10px] opacity-80">Day Streak</div></div>
        <Link to="/revision/$setId/flashcards" params={{ setId }} className="rounded-full bg-white/95 px-4 py-2 text-center text-xs font-bold text-primary">← Back to Flashcards</Link>
        <div className="text-right text-xs"><span className="font-black">{mastery}%</span><div className="text-[10px] opacity-80">Mastery</div></div>
      </div>
    </div>
  );
}
