import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Bookmark, MoreVertical, Cloud, Bold, Italic, Underline, Heading1, Heading2, List, ListOrdered, Quote, Code2, Link as LinkIcon, ImageIcon, Undo, Redo, ImagePlus, Paperclip, Save, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/revision/$setId/notes/new")({
  ssr: false,
  component: CreateNote,
});

const SUGGESTED = ["loops", "variables", "functions", "syntax", "practice", "examples", "beginners"];

function CreateNote() {
  const { setId } = Route.useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: set } = useQuery({
    queryKey: ["set", setId],
    queryFn: async () => (await supabase.from("revision_sets").select("*").eq("id", setId).maybeSingle()).data,
  });
  const { data: existingNotes = [] } = useQuery({
    queryKey: ["notes", setId],
    queryFn: async () => (await supabase.from("notes").select("id, title, content_md").eq("set_id", setId)).data ?? [],
  });
  const topicsSet = useMemo(() => {
    const s = new Set<string>();
    existingNotes.forEach((n: any) => {
      const m = (n.content_md || "").match(/^>\s*Topic:\s*(.+)$/m);
      if (m) s.add(m[1].trim());
    });
    return Array.from(s);
  }, [existingNotes]);

  const wordCount = body.trim() ? body.trim().split(/\s+/).length : 0;

  function addTag(t: string) {
    const v = t.trim().toLowerCase();
    if (!v || tags.includes(v) || tags.length >= 5) return;
    setTags([...tags, v]);
    setTagInput("");
  }
  function removeTag(t: string) { setTags(tags.filter(x => x !== t)); }

  async function save(asDraft = false) {
    if (!title.trim()) { toast.error("Give your note a title"); return; }
    if (!user) { toast.error("You must be signed in"); return; }
    setSaving(true);
    const nextPos = existingNotes.length;
    const tagLine = tags.length ? `\n\n> Tags: ${tags.join(", ")}` : "";
    const topicLine = topic ? `> Topic: ${topic}\n\n` : "";
    const { error } = await supabase.from("notes").insert({
      set_id: setId,
      user_id: user.id,
      title: title.trim(),
      content_md: `${topicLine}${body}${tagLine}${asDraft ? "\n\n_(draft)_" : ""}`,
      position: nextPos,
    });

    setSaving(false);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["notes", setId] });
    toast.success(asDraft ? "Draft saved" : "Note saved");
    if (!asDraft) nav({ to: "/revision/$setId/notes", params: { setId } });
  }


  return (
    <div className="pb-8">
      <header className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-2 px-5 pb-3 pt-6">
        <Link to="/revision/$setId/notes" params={{ setId }} className="shadow-card grid h-11 w-11 place-items-center rounded-2xl bg-card"><ArrowLeft className="h-5 w-5" /></Link>
        <div className="min-w-0">
          <div className="flex items-center gap-2"><span className="text-xl">{set?.emoji || "📘"}</span><h1 className="truncate text-base font-black">{set?.title || "Notes"}</h1></div>
          <div className="text-[11px] text-muted-foreground">Notes</div>
        </div>
        <button className="shadow-card grid h-10 w-10 place-items-center rounded-2xl bg-card"><Bookmark className="h-4 w-4" /></button>
        <button className="shadow-card grid h-10 w-10 place-items-center rounded-2xl bg-card"><MoreVertical className="h-4 w-4" /></button>
      </header>

      <section className="mx-5 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-[24px] bg-lavender/60 p-4 shadow-card">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/15 text-primary">📝</div>
        <div className="min-w-0">
          <div className="text-base font-black">Create New Note</div>
          <div className="text-[11px] text-muted-foreground">Write and organize your own notes to enhance your learning.</div>
        </div>
        <button onClick={() => save(true)} disabled={saving} className="inline-flex items-center gap-1 text-xs font-bold text-primary"><Cloud className="h-4 w-4" /> Save Draft</button>
      </section>

      <section className="mx-5 mt-4 space-y-3 rounded-2xl border border-border bg-card p-4 shadow-card">
        <div>
          <label className="text-sm font-black">Note Title</label>
          <div className="mt-1 flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
            <input value={title} onChange={e => setTitle(e.target.value.slice(0, 100))} placeholder="Enter a title for your note..." className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
            <span className="text-[10px] text-muted-foreground">{title.length}/100</span>
          </div>
        </div>
        <div className="border-t border-border" />
        <div>
          <label className="text-sm font-black">Choose Topic <span className="text-muted-foreground">(Optional)</span></label>
          <select value={topic} onChange={e => setTopic(e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none">
            <option value="">Select a topic</option>
            {topicsSet.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <p className="mt-1 text-[11px] text-muted-foreground">Choosing a topic helps organize your notes better.</p>
        </div>
      </section>

      <section className="mx-5 mt-3 rounded-2xl border border-border bg-card shadow-card">
        <div className="px-4 pt-3 text-sm font-black">Your Note</div>
        <div className="mt-2 flex items-center gap-1 border-y border-border bg-lavender/30 px-3 py-2 text-muted-foreground overflow-x-auto no-scrollbar">
          <TB icon={<Bold className="h-3.5 w-3.5" />} /><TB icon={<Italic className="h-3.5 w-3.5" />} /><TB icon={<Underline className="h-3.5 w-3.5" />} />
          <Sep />
          <TB icon={<Heading1 className="h-3.5 w-3.5" />} /><TB icon={<Heading2 className="h-3.5 w-3.5" />} />
          <Sep />
          <TB icon={<List className="h-3.5 w-3.5" />} /><TB icon={<ListOrdered className="h-3.5 w-3.5" />} />
          <Sep />
          <TB icon={<Quote className="h-3.5 w-3.5" />} /><TB icon={<Code2 className="h-3.5 w-3.5" />} /><TB icon={<LinkIcon className="h-3.5 w-3.5" />} /><TB icon={<ImageIcon className="h-3.5 w-3.5" />} />
          <div className="ml-auto flex gap-1"><TB icon={<Undo className="h-3.5 w-3.5" />} /><TB icon={<Redo className="h-3.5 w-3.5" />} /></div>
        </div>
        <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Start writing your note here..." className="min-h-[220px] w-full resize-y bg-transparent p-4 text-sm outline-none" />
        <div className="border-t border-border px-4 py-2 text-right text-[11px] text-muted-foreground">{wordCount} words</div>
      </section>

      <section className="mx-5 mt-3 rounded-2xl border border-border bg-card p-4 shadow-card">
        <label className="text-sm font-black">Add Tags <span className="text-muted-foreground">(Optional)</span></label>
        <div className="mt-1 flex items-center gap-2 rounded-xl border border-border px-3 py-2">
          <div className="flex flex-1 flex-wrap items-center gap-1.5">
            {tags.map(t => (
              <span key={t} className="inline-flex items-center gap-1 rounded-full bg-lavender px-2 py-0.5 text-[11px] font-bold text-primary">
                {t}<button onClick={() => removeTag(t)}><X className="h-3 w-3" /></button>
              </span>
            ))}
            <input
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(tagInput); } }}
              placeholder={tags.length ? "" : "Add tags (e.g., loops, python, practice)"}
              className="min-w-[100px] flex-1 bg-transparent text-sm outline-none"
            />
          </div>
          <span className="text-[10px] text-muted-foreground">{tags.length}/5</span>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">Press Enter after each tag</p>
        <div className="mt-2 text-[11px] font-bold text-muted-foreground">Suggested tags:</div>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {SUGGESTED.filter(s => !tags.includes(s)).map(s => (
            <button key={s} onClick={() => addTag(s)} className="rounded-full bg-lavender/60 px-2.5 py-1 text-[11px] font-bold text-primary">{s}</button>
          ))}
        </div>
      </section>

      <section className="mx-5 mt-3 rounded-2xl border border-border bg-card p-4 shadow-card">
        <label className="text-sm font-black">Add Attachments <span className="text-muted-foreground">(Optional)</span></label>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button className="inline-flex items-center justify-center gap-2 rounded-xl border border-primary/30 bg-lavender/40 py-2.5 text-xs font-bold text-primary"><ImagePlus className="h-4 w-4" /> Attach Image</button>
          <button className="inline-flex items-center justify-center gap-2 rounded-xl border border-primary/30 bg-lavender/40 py-2.5 text-xs font-bold text-primary"><Paperclip className="h-4 w-4" /> Attach File</button>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">Supports: JPG, PNG, PDF, TXT (Max 5MB)</p>
      </section>

      <div className="mx-5 mt-4 grid grid-cols-[auto_1fr] gap-2">
        <button onClick={() => nav({ to: "/revision/$setId/notes", params: { setId } })} className="shadow-card rounded-2xl border border-border bg-card px-6 py-3 text-sm font-bold">Cancel</button>
        <button onClick={() => save(false)} disabled={saving} className="gradient-primary shadow-soft inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3 text-sm font-black text-primary-foreground disabled:opacity-60"><Save className="h-4 w-4" /> Save Note</button>
      </div>
    </div>
  );
}

function TB({ icon }: { icon: React.ReactNode }) {
  return <button className="grid h-7 w-7 place-items-center rounded-md hover:bg-white/60">{icon}</button>;
}
function Sep() { return <div className="mx-1 h-4 w-px bg-border" />; }
