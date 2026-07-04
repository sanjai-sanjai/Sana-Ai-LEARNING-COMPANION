import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Bookmark, Share2, MoreVertical, Lightbulb, CheckCircle2, Play, ChevronRight } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

export const Route = createFileRoute("/_authenticated/revision/$setId/topic/$noteId")({
  ssr: false,
  component: TopicDetail,
});

type Tab = "overview" | "notes" | "examples" | "flowchart" | "practice" | "flashcards" | "quiz";
const TABS: { key: Tab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "notes", label: "Notes" },
  { key: "examples", label: "Examples" },
  { key: "flowchart", label: "Flowchart" },
  { key: "practice", label: "Practice" },
  { key: "flashcards", label: "Flashcards" },
  { key: "quiz", label: "Quiz" },
];

type NoteMeta = {
  topic?: string;
  icon?: string;
  summary?: string;
  key_points?: string[];
  examples?: Array<{ title?: string; code?: string; output?: string } | string>;
};

function parseMeta(md: string | null | undefined): NoteMeta {
  if (!md) return {};
  const topic = md.match(/^>\s*Topic:\s*(.+)$/m)?.[1]?.trim();
  return { topic };
}

function TopicDetail() {
  const { setId, noteId } = Route.useParams();
  const [tab, setTab] = useState<Tab>("overview");

  const { data: set } = useQuery({
    queryKey: ["set", setId],
    queryFn: async () => (await supabase.from("revision_sets").select("*").eq("id", setId).maybeSingle()).data,
  });
  const { data: note } = useQuery({
    queryKey: ["note", noteId],
    queryFn: async () => (await supabase.from("notes").select("*").eq("id", noteId).maybeSingle()).data,
  });

  const meta: NoteMeta = note ? parseMeta(note.content_md) : {};

  const { data: cards = [] } = useQuery({
    queryKey: ["cards-topic", setId, meta.topic],
    queryFn: async () => (await supabase.from("flashcards").select("*").eq("set_id", setId)).data ?? [],
    enabled: !!note,
  });
  const { data: quiz = [] } = useQuery({
    queryKey: ["quiz-topic", setId, meta.topic],
    queryFn: async () => (await supabase.from("quiz_questions").select("*").eq("set_id", setId)).data ?? [],
    enabled: !!note,
  });

  if (!note) return <div className="p-6 text-sm text-muted-foreground">Loading topic…</div>;

  const topicCards = meta.topic ? cards.filter(c => c.topic === meta.topic) : cards;
  const topicQuiz = meta.topic ? quiz.filter(q => q.topic === meta.topic) : quiz;

  return (
    <div className="pb-24">
      <header className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto_auto] items-center gap-2 px-5 pb-3 pt-6">
        <Link to="/revision/$setId" params={{ setId }} className="shadow-card grid h-11 w-11 place-items-center rounded-2xl bg-card">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xl">{set?.emoji || "📘"}</span>
            <h1 className="truncate text-base font-black">{note.title}</h1>
          </div>
          <div className="truncate text-[11px] text-muted-foreground">{set?.title}</div>
        </div>
        <button className="shadow-card grid h-10 w-10 place-items-center rounded-2xl bg-card"><Bookmark className="h-4 w-4" /></button>
        <button className="shadow-card grid h-10 w-10 place-items-center rounded-2xl bg-card"><Share2 className="h-4 w-4" /></button>
        <button className="shadow-card grid h-10 w-10 place-items-center rounded-2xl bg-card"><MoreVertical className="h-4 w-4" /></button>
      </header>

      {/* Tabs */}
      <div className="mx-5 flex gap-4 overflow-x-auto border-b border-border pb-1 text-xs font-bold no-scrollbar">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn("shrink-0 pb-2", tab === t.key ? "border-b-2 border-primary text-primary" : "text-muted-foreground")}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Hero */}
      <section className="mx-5 mt-4 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-[24px] bg-lavender/60 p-4 shadow-card">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/15 text-2xl">{meta.icon || "📘"}</div>
        <div className="min-w-0">
          <div className="text-lg font-black">{meta.topic || note.title}</div>
          <p className="text-xs text-muted-foreground">{meta.summary || "Master this topic with focused notes, examples, and practice."}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Tag tone="bg-success/10 text-success">Beginner</Tag>
            <Tag tone="bg-warning/10 text-warning">Important</Tag>
            <Tag tone="bg-primary/10 text-primary">15–20 min</Tag>
          </div>
        </div>
      </section>


      {tab === "overview" && (
        <>
          <section className="mx-5 mt-5">
            <h3 className="text-sm font-black">Key Points</h3>
            <div className="mt-2 rounded-2xl border border-border bg-card p-4 shadow-card">
              <ul className="space-y-2">
                {(meta.key_points ?? ["Learn the fundamentals", "Practice with real examples", "Build up to advanced use"]).slice(0, 6).map((kp, i) => (
                  <li key={i} className="grid grid-cols-[auto_1fr] items-start gap-2 text-xs">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
                    <span>{kp}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>


          {note.content_md && (
            <section className="mx-5 mt-4">
              <h3 className="text-sm font-black">Explanation</h3>
              <article className="prose prose-sm mt-2 max-w-none rounded-2xl border border-border bg-card p-4 shadow-card">
                <ReactMarkdown>{note.content_md}</ReactMarkdown>
              </article>
            </section>
          )}

          <section className="mx-5 mt-4 rounded-2xl bg-lavender/60 p-4 shadow-card">
            <div className="mb-2 flex items-center gap-2 text-sm font-black text-primary"><Lightbulb className="h-4 w-4" /> Sana's Tip</div>
            <p className="text-xs text-muted-foreground">Read the notes, try the examples, then attempt practice questions to reinforce your understanding.</p>
          </section>
        </>
      )}

      {tab === "notes" && (
        <section className="mx-5 mt-4">
          <article className="prose prose-sm max-w-none rounded-2xl border border-border bg-card p-4 shadow-card">
            <ReactMarkdown>{note.content_md || "_No detailed notes yet._"}</ReactMarkdown>
          </article>
          <Link to="/revision/$setId/notes/new" params={{ setId }} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-primary/40 bg-lavender/40 p-3 text-xs font-bold text-primary">+ Add your own note</Link>
        </section>
      )}

      {tab === "examples" && (
        <section className="mx-5 mt-4 space-y-3">
          {(meta.examples ?? []).length ? (meta.examples ?? []).map((ex, i) => {
            const item = typeof ex === "string" ? { code: ex } : ex;
            return (
              <div key={i} className="rounded-2xl border border-border bg-card p-3 shadow-card">
                <div className="text-xs font-bold">{item.title || `Example ${i + 1}`}</div>
                <pre className="mt-2 overflow-x-auto rounded-xl bg-slate-900 p-3 text-[11px] leading-relaxed text-slate-100"><code>{item.code}</code></pre>
                {item.output && <div className="mt-2 rounded-xl bg-lavender/40 p-2 text-[11px]"><span className="font-bold">Output:</span> {item.output}</div>}
              </div>
            );
          }) : (
            <div className="rounded-2xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">No examples yet.</div>
          )}
        </section>
      )}


      {tab === "flowchart" && (
        <section className="mx-5 mt-4 rounded-2xl border border-border bg-card p-6 text-center shadow-card">
          <div className="text-4xl">🧭</div>
          <div className="mt-2 text-sm font-bold">Flowchart coming soon</div>
          <div className="text-[11px] text-muted-foreground">Visual flow will render here based on notes.</div>
        </section>
      )}

      {tab === "practice" && (
        <section className="mx-5 mt-4 rounded-2xl bg-lavender/60 p-4 text-center shadow-card">
          <div className="text-3xl">🏆</div>
          <div className="mt-1 text-base font-black">Practice makes perfect!</div>
          <p className="mt-1 text-xs text-muted-foreground">Try {topicQuiz.length || quiz.length} questions on this topic.</p>
          <Link to="/revision/$setId/session" params={{ setId }} className="gradient-primary mt-3 inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-xs font-black text-primary-foreground shadow-soft">
            <Play className="h-4 w-4" /> Start Practice
          </Link>
        </section>
      )}

      {tab === "flashcards" && (
        <section className="mx-5 mt-4 space-y-2">
          <div className="text-[11px] text-muted-foreground">{topicCards.length} card{topicCards.length === 1 ? "" : "s"}</div>
          {topicCards.slice(0, 6).map(c => (
            <div key={c.id} className="rounded-2xl border border-border bg-card p-3 text-xs shadow-card">
              <div className="font-bold">Q. {c.front}</div>
              <div className="mt-1 text-muted-foreground">A. {c.back}</div>
            </div>
          ))}
          <Link to="/revision/$setId/flashcards" params={{ setId }} className="flex w-full items-center justify-between rounded-2xl border border-border bg-card p-3 text-xs font-bold shadow-card">
            Open flashcard study <ChevronRight className="h-4 w-4" />
          </Link>
        </section>
      )}

      {tab === "quiz" && (
        <section className="mx-5 mt-4 space-y-2">
          {topicQuiz.slice(0, 6).map((q, i) => (
            <div key={q.id} className="rounded-2xl border border-border bg-card p-3 text-xs shadow-card">
              <div className="font-bold">Q{i + 1}. {q.question}</div>
              <div className="mt-1 text-[10px] uppercase text-muted-foreground">{q.difficulty}</div>
            </div>
          ))}
          <Link to="/revision/$setId/session" params={{ setId }} className="gradient-primary mt-2 flex w-full items-center justify-center gap-2 rounded-2xl p-3 text-xs font-black text-primary-foreground shadow-soft">
            Start Quiz Session <Play className="h-4 w-4" />
          </Link>
        </section>
      )}

      {/* Bottom action strip */}
      <div className="fixed inset-x-0 bottom-16 mx-5 grid grid-cols-5 gap-1.5 rounded-2xl border border-border bg-card/95 p-2 backdrop-blur shadow-card md:relative md:bottom-auto md:inset-x-auto md:mx-5 md:mt-5">
        <QuickAction icon="📝" label="Notes" onClick={() => setTab("notes")} />
        <QuickAction icon="💡" label="Examples" onClick={() => setTab("examples")} />
        <QuickAction icon="📊" label="Flow" onClick={() => setTab("flowchart")} />
        <QuickAction icon="✏️" label="Practice" onClick={() => setTab("practice")} />
        <QuickAction icon="🧠" label="Quiz" onClick={() => setTab("quiz")} />
      </div>
    </div>
  );
}

function Tag({ children, tone }: { children: React.ReactNode; tone: string }) {
  return <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", tone)}>{children}</span>;
}
function QuickAction({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="grid place-items-center rounded-xl bg-lavender/40 p-2 text-[10px] font-bold text-primary">
      <div className="text-base">{icon}</div>
      {label}
    </button>
  );
}
