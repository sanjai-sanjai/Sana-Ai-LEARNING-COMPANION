import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Bookmark, MoreVertical, Search, Play, Sparkles, BookOpen, LayoutGrid, HelpCircle, TrendingUp, Target, ChevronRight, BarChart3 } from "lucide-react";
import { ProgressRing } from "@/components/app/ProgressRing";
import { useState } from "react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/revision/$setId")({
  ssr: false,
  component: SetDetail,
});

type TabKey = "notes" | "flashcards" | "quizzes" | "weak" | "progress";

const TABS: { key: TabKey; label: string }[] = [
  { key: "notes", label: "Notes" },
  { key: "flashcards", label: "Flashcards" },
  { key: "quizzes", label: "Quizzes" },
  { key: "weak", label: "Weak Areas" },
  { key: "progress", label: "Progress" },
];

function SetDetail() {
  const { setId } = Route.useParams();
  const nav = useNavigate();
  const [tab, setTab] = useState<TabKey>("notes");

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
    queryFn: async () => (await supabase.from("flashcards").select("*").eq("set_id", setId).order("created_at")).data ?? [],
  });
  const { data: quiz = [] } = useQuery({
    queryKey: ["quiz", setId],
    queryFn: async () => (await supabase.from("quiz_questions").select("*").eq("set_id", setId).order("created_at")).data ?? [],
  });
  const { data: weak = [] } = useQuery({
    queryKey: ["weak", setId],
    queryFn: async () => (await supabase.from("weak_areas").select("*").eq("set_id", setId).order("accuracy_pct")).data ?? [],
  });

  if (!set) return <div className="p-6 text-sm text-muted-foreground">Loading set…</div>;

  const reviewed = cards.filter(c => c.mastery > 0).length;
  const mastery = cards.length ? Math.round(cards.reduce((a, c) => a + c.mastery, 0) / cards.length) : 0;

  return (
    <div className="pb-24">
      <header className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-3 px-5 pb-3 pt-6">
        <Link to="/revision" className="shadow-card grid h-11 w-11 place-items-center rounded-2xl bg-card"><ArrowLeft className="h-5 w-5" /></Link>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xl">{set.emoji || "📘"}</span>
            <h1 className="truncate text-lg font-black">{set.title}</h1>
          </div>
          <div className="truncate text-[11px] text-muted-foreground">{notes.length} Notes · {cards.length} Flashcards {set.last_revised_at ? `· revised ${new Date(set.last_revised_at).toLocaleDateString()}` : ""}</div>
        </div>
        <Link to="/revision/$setId/summary" params={{ setId }} className="shadow-card grid h-11 w-11 place-items-center rounded-2xl bg-card" title="Summary"><BarChart3 className="h-5 w-5" /></Link>
        <Link to="/revision/$setId/ask" params={{ setId }} className="shadow-card grid h-11 w-11 place-items-center rounded-2xl bg-card" title="Ask AI"><Sparkles className="h-5 w-5 text-primary" /></Link>

      </header>

      <section className="mx-5 rounded-[24px] border border-border bg-card p-4 shadow-card">
        <div className="grid grid-cols-5 items-center gap-2">
          <div className="text-center">
            <div className="text-[10px] font-semibold text-muted-foreground">Overall</div>
            <ProgressRing value={set.progress_pct} size={56} stroke={6} />
            <div className="mt-1 text-[10px] font-bold text-primary">{set.progress_pct >= 80 ? "Great job! 🎉" : "Keep going"}</div>
          </div>
          <MiniStat icon="📖" val={notes.length} lbl="Notes" tone="bg-lavender" />
          <MiniStat icon="🎴" val={cards.length} lbl="Cards" tone="bg-pink/15" />
          <MiniStat icon="✅" val={reviewed} lbl="Reviewed" tone="bg-success/10" />
          <MiniStat icon="🎯" val={`${mastery}%`} lbl="Mastery" tone="bg-blue/10" />
        </div>
      </section>

      <div className="mx-5 mt-4 flex gap-5 overflow-x-auto border-b border-border text-sm">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={cn("relative whitespace-nowrap pb-2.5 font-semibold", tab === t.key ? "text-primary" : "text-muted-foreground")}>
            {t.label}
            {tab === t.key && <span className="absolute inset-x-0 bottom-0 h-0.5 gradient-primary rounded-full" />}
          </button>
        ))}
      </div>

      {tab === "notes" && <NotesTab setId={setId} notes={notes} />}
      {tab === "flashcards" && <FlashcardsTab setId={setId} cards={cards} />}
      {tab === "quizzes" && <QuizzesTab setId={setId} quiz={quiz} />}
      {tab === "weak" && <WeakTab weak={weak} />}
      {tab === "progress" && <ProgressTab set={set} notes={notes} cards={cards} />}

      {/* Bottom action bar */}
      <section className="fixed inset-x-0 bottom-16 mx-5 grid grid-cols-[1fr_auto_1fr] gap-2">
        <Link to="/revision/$setId/notes" params={{ setId }} className="shadow-card grid place-items-center rounded-2xl border border-border bg-card px-3 py-2 text-xs font-semibold">
          <BookOpen className="mb-0.5 h-4 w-4" />Notes
        </Link>
        <button
          onClick={() => {
            if (quiz.length > 0) return nav({ to: "/revision/$setId/session", params: { setId } });
            if (cards.length > 0) return nav({ to: "/revision/$setId/flashcards", params: { setId } });
            return nav({ to: "/revision/$setId/notes", params: { setId } });
          }}
          className="gradient-primary shadow-soft inline-flex items-center gap-1 rounded-2xl px-4 py-2 text-xs font-bold text-primary-foreground"
        >
          <Play className="h-3.5 w-3.5" /> Smart Revision
        </button>
        <Link to="/analytics" search={{ tab: "overview", range: "week" }} className="shadow-card grid place-items-center rounded-2xl border border-border bg-card px-3 py-2 text-xs font-semibold">
          <TrendingUp className="mb-0.5 h-4 w-4" />Analytics
        </Link>
      </section>
    </div>
  );
}

function MiniStat({ icon, val, lbl, tone }: { icon: string; val: React.ReactNode; lbl: string; tone: string }) {
  return (
    <div className="rounded-xl p-1 text-center">
      <div className={cn("mx-auto grid h-8 w-8 place-items-center rounded-xl text-sm", tone)}>{icon}</div>
      <div className="mt-1 text-lg font-black leading-none">{val}</div>
      <div className="text-[10px] font-semibold text-muted-foreground">{lbl}</div>
    </div>
  );
}

function NotesTab({ setId, notes }: { setId: string; notes: any[] }) {
  return (
    <div className="mx-5">
      <div className="mt-4 flex items-center gap-2 rounded-2xl border border-border bg-card px-3 py-2.5 shadow-card">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input placeholder="Search notes…" className="min-w-0 flex-1 bg-transparent text-sm focus:outline-none" />
      </div>
      <div className="mt-3 flex items-center justify-between">
        <div className="text-sm font-bold">All Notes ({notes.length})</div>
        <Link to="/revision/$setId/notes" params={{ setId }} className="text-xs font-semibold text-primary">View all →</Link>
      </div>
      {notes.length === 0 ? (
        <EmptyBlock label="No notes yet" note="Generate a set from a chat to fill this in." />
      ) : (
        <ul className="mt-2 divide-y divide-border rounded-2xl border border-border bg-card shadow-card">
          {notes.slice(0, 6).map((n, i) => (
            <li key={n.id}>
              <Link to="/revision/$setId/topic/$noteId" params={{ setId, noteId: n.id }} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 p-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-lavender text-primary">📄</div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold">{i + 1}. {n.title}</div>
                  <div className="truncate text-[11px] text-muted-foreground">{n.content_md ? n.content_md.replace(/[#>*`]/g, "").slice(0, 60) : "Tap to open"}</div>
                </div>
                <div className="text-[11px] font-bold text-primary">{n.progress_pct}%</div>
              </Link>
            </li>
          ))}

        </ul>
      )}
    </div>
  );
}

function FlashcardsTab({ setId, cards }: { setId: string; cards: any[] }) {
  const known = cards.filter(c => c.status === "known" || c.mastery >= 80).length;
  return (
    <div className="mx-5 mt-4">
      <div className="grid grid-cols-3 gap-2">
        <StatPill val={cards.length} lbl="Total" tone="bg-lavender text-primary" />
        <StatPill val={known} lbl="Known" tone="bg-success/10 text-success" />
        <StatPill val={cards.length - known} lbl="To review" tone="bg-warning/15 text-warning" />
      </div>
      {cards.length === 0 ? (
        <EmptyBlock label="No flashcards yet" note="Generate from chat first." />
      ) : (
        <>
          <Link to="/revision/$setId/flashcards" params={{ setId }} className="gradient-primary shadow-soft mt-3 flex h-12 items-center justify-center gap-2 rounded-2xl text-sm font-bold text-primary-foreground">
            <Play className="h-4 w-4" /> Study {cards.length} cards
          </Link>
          <ul className="mt-3 divide-y divide-border rounded-2xl border border-border bg-card shadow-card">
            {cards.slice(0, 5).map((c) => (
              <li key={c.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 p-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold">{c.front}</div>
                  <div className="text-[11px] text-muted-foreground">{c.topic || "General"} · {c.difficulty || "medium"}</div>
                </div>
                <div className="text-[11px] font-bold text-primary">{c.mastery}%</div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function QuizzesTab({ setId, quiz }: { setId: string; quiz: any[] }) {
  const nav = useNavigate();
  return (
    <div className="mx-5 mt-4">
      {quiz.length === 0 ? (
        <EmptyBlock label="No quizzes yet" note="Generate from chat first." />
      ) : (
        <>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-lavender text-2xl">📝</div>
              <div className="min-w-0">
                <div className="text-sm font-bold">Practice Quiz</div>
                <div className="text-[11px] text-muted-foreground">{quiz.length} questions · mixed difficulty</div>
              </div>
            </div>
            <button onClick={() => nav({ to: "/revision/$setId/session", params: { setId } })} className="gradient-primary shadow-soft mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-2xl text-sm font-bold text-primary-foreground">
              <Play className="h-4 w-4" /> Start quiz
            </button>
          </div>
          <ul className="mt-3 divide-y divide-border rounded-2xl border border-border bg-card shadow-card">
            {quiz.slice(0, 6).map((q, i) => (
              <li key={q.id} className="p-3">
                <div className="flex items-start gap-2">
                  <span className="text-[10px] font-bold text-muted-foreground">Q{i+1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold">{q.question}</div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">{q.topic || "General"} · {q.difficulty}</div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function WeakTab({ weak }: { weak: any[] }) {
  return (
    <div className="mx-5 mt-4">
      {weak.length === 0 ? (
        <EmptyBlock label="No weak areas detected" note="Study more, we'll flag topics you struggle with." />
      ) : (
        <ul className="space-y-2">
          {weak.map((w) => (
            <li key={w.id} className="rounded-2xl border border-border bg-card p-3 shadow-card">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold">{w.topic}</div>
                  <div className="text-[11px] text-muted-foreground">{w.notes || "Focus recommended"}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-warning">{w.accuracy_pct}%</div>
                  <div className="text-[10px] text-muted-foreground">accuracy</div>
                </div>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-warning" style={{ width: `${w.accuracy_pct}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ProgressTab({ set, notes, cards }: { set: any; notes: any[]; cards: any[] }) {
  const mastery = cards.length ? Math.round(cards.reduce((a, c) => a + c.mastery, 0) / cards.length) : 0;
  return (
    <div className="mx-5 mt-4 space-y-3">
      <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground">Set progress</div>
            <div className="text-2xl font-black">{set.progress_pct}%</div>
          </div>
          <ProgressRing value={set.progress_pct} size={64} stroke={7} />
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div className="gradient-primary h-full" style={{ width: `${set.progress_pct}%` }} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-2xl border border-border bg-card p-3 shadow-card">
          <div className="text-[11px] text-muted-foreground">Notes covered</div>
          <div className="text-lg font-black">{notes.length}</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-3 shadow-card">
          <div className="text-[11px] text-muted-foreground">Avg mastery</div>
          <div className="text-lg font-black">{mastery}%</div>
        </div>
      </div>
    </div>
  );
}

function StatPill({ val, lbl, tone }: { val: React.ReactNode; lbl: string; tone: string }) {
  return (
    <div className={cn("rounded-2xl p-3 text-center", tone)}>
      <div className="text-lg font-black leading-none">{val}</div>
      <div className="mt-0.5 text-[10px] font-semibold">{lbl}</div>
    </div>
  );
}

function EmptyBlock({ label, note }: { label: string; note: string }) {
  return (
    <div className="mt-4 rounded-2xl border border-dashed border-border p-8 text-center">
      <Sparkles className="mx-auto h-6 w-6 text-primary" />
      <div className="mt-2 text-sm font-bold">{label}</div>
      <div className="text-xs text-muted-foreground">{note}</div>
    </div>
  );
}
