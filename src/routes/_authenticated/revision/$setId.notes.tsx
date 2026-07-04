import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Search, Star, ChevronRight, Plus } from "lucide-react";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export const Route = createFileRoute("/_authenticated/revision/$setId/notes")({
  ssr: false,
  component: NotesPage,
});

function NotesPage() {
  const { setId } = Route.useParams();
  const [q, setQ] = useState("");
  const [topic, setTopic] = useState<string>("all");
  const [open, setOpen] = useState<string | null>(null);

  const { data: set } = useQuery({
    queryKey: ["set", setId],
    queryFn: async () => (await supabase.from("revision_sets").select("*").eq("id", setId).maybeSingle()).data,
  });
  const { data: notes = [] } = useQuery({
    queryKey: ["notes", setId],
    queryFn: async () => (await supabase.from("notes").select("*").eq("set_id", setId).order("position")).data ?? [],
  });

  const topics = useMemo(() => {
    const t = new Set<string>();
    notes.forEach(n => { const first = (n.content_md || "").split("\n")[0].replace(/[#>*`]/g, "").trim(); if (first) t.add(first.slice(0, 20)); });
    return Array.from(t).slice(0, 6);
  }, [notes]);

  const filtered = notes.filter(n => {
    if (q && !n.title.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const activeNote = notes.find(n => n.id === open);

  return (
    <div className="pb-8">
      <header className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-5 pb-3 pt-6">
        <Link to="/revision/$setId" params={{ setId }} className="shadow-card grid h-11 w-11 place-items-center rounded-2xl bg-card"><ArrowLeft className="h-5 w-5" /></Link>
        <div className="min-w-0">
          <div className="flex items-center gap-2"><span className="text-xl">{set?.emoji || "📘"}</span><h1 className="truncate text-lg font-black">{set?.title || "Notes"}</h1></div>
          <div className="text-[11px] text-muted-foreground">Notes</div>
        </div>
        <Link to="/revision/$setId/notes/new" params={{ setId }} className="gradient-primary shadow-soft inline-flex h-11 items-center gap-1 rounded-2xl px-3 text-xs font-black text-primary-foreground"><Plus className="h-4 w-4" /> New</Link>
      </header>

      {/* Chips */}
      <div className="mx-5 mt-2 flex gap-2 overflow-x-auto pb-1">
        {["all", ...topics].map(t => (
          <button key={t} onClick={() => setTopic(t)}
            className={cn("shrink-0 rounded-2xl border px-3 py-2 text-xs font-semibold shadow-card", topic === t ? "border-primary bg-lavender text-primary" : "border-border bg-card text-muted-foreground")}>
            {t === "all" ? `All Notes · ${notes.length}` : t}
          </button>
        ))}
      </div>

      {/* Overview */}
      <section className="mx-5 mt-3 rounded-[20px] bg-lavender p-4 shadow-card">
        <div className="text-sm font-bold">Your Notes Overview</div>
        <div className="mt-3 grid grid-cols-4 gap-2 text-center">
          <div><div className="text-xl font-black">{notes.length}</div><div className="text-[10px] text-muted-foreground">Total</div></div>
          <div><div className="text-xl font-black text-success">{topics.length}</div><div className="text-[10px] text-muted-foreground">Topics</div></div>
          <div><div className="text-xl font-black text-warning">{notes.filter(n=>n.progress_pct>0).length}</div><div className="text-[10px] text-muted-foreground">Started</div></div>
          <div><div className="text-xl font-black text-primary">{Math.round(notes.reduce((a,n)=>a+n.progress_pct,0)/(notes.length||1))}%</div><div className="text-[10px] text-muted-foreground">Coverage</div></div>
        </div>
      </section>

      <div className="mx-5 mt-3 flex items-center gap-2 rounded-2xl border border-border bg-card px-3 py-2.5 shadow-card">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search notes…" className="min-w-0 flex-1 bg-transparent text-sm focus:outline-none" />
      </div>

      <div className="mx-5 mt-3 text-sm font-bold">All Notes</div>
      <ul className="mx-5 mt-2 space-y-2">
        {filtered.length === 0 && <li className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No notes here yet.</li>}
        {filtered.map((n, i) => (
          <li key={n.id} className="shadow-card overflow-hidden rounded-2xl border border-border bg-card">
            <div className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-3 p-3">
              <Link to="/revision/$setId/topic/$noteId" params={{ setId, noteId: n.id }} className="grid h-10 w-10 place-items-center rounded-xl bg-lavender text-primary">
                {n.title.startsWith("Introduction") ? "</>" : "📄"}
              </Link>
              <Link to="/revision/$setId/topic/$noteId" params={{ setId, noteId: n.id }} className="min-w-0">
                <div className="truncate text-sm font-bold">{i+1}. {n.title}</div>
                <div className="truncate text-[11px] text-muted-foreground">Tap to open · preview below</div>
              </Link>
              <button onClick={() => setOpen(open === n.id ? null : n.id)} aria-label="Toggle preview" className="grid h-8 w-8 place-items-center rounded-lg hover:bg-lavender/50">
                <ChevronRight className={cn("h-4 w-4 text-muted-foreground transition-transform", open === n.id && "rotate-90")} />
              </button>
            </div>
            {open === n.id && (
              <div className="border-t border-border bg-card p-4">
                <article className="prose prose-sm max-w-none prose-headings:font-black prose-code:rounded prose-code:bg-muted prose-code:px-1">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{n.content_md || "*(empty note)*"}</ReactMarkdown>
                </article>
                <Link to="/revision/$setId/topic/$noteId" params={{ setId, noteId: n.id }} className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-primary">Open full topic →</Link>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
