import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/app/TopBar";
import { ProgressRing } from "@/components/app/ProgressRing";
import { BookOpen, ClipboardList, HelpCircle, Target, Sparkles, MessageCircle, RefreshCw, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { generateSetFromThread } from "@/lib/revision.functions";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/revision/")({
  ssr: false,
  component: RevisionPage,
});

function RevisionPage() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const generate = useServerFn(generateSetFromThread);
  const [busy, setBusy] = useState<string | null>(null);

  const { data: threads = [] } = useQuery({
    queryKey: ["chat-threads-for-revision"],
    queryFn: async () => (await supabase.from("chat_threads").select("*").order("last_message_at", { ascending: false })).data ?? [],
  });

  const { data: sets = [] } = useQuery({
    queryKey: ["sets"],
    queryFn: async () => (await supabase.from("revision_sets").select("*").order("updated_at", { ascending: false })).data ?? [],
  });

  const setsByThread = new Map(sets.filter(s => s.thread_id).map(s => [s.thread_id!, s]));

  async function handleGenerate(threadId: string) {
    setBusy(threadId);
    try {
      const res = await generate({ data: { threadId } });
      if (!res.setId) {
        toast.message(res.message ?? "Nothing to learn from yet");
        return;
      }
      toast.success(`Set ready — ${res.counts.notes} notes, ${res.counts.flashcards} cards, ${res.counts.quiz} quiz`);
      qc.invalidateQueries({ queryKey: ["sets"] });
      nav({ to: "/revision/$setId", params: { setId: res.setId } });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to generate set");
    } finally {
      setBusy(null);
    }
  }

  const stats = { topics: sets.length, notes: 0, flash: 0, retention: 78 };

  return (
    <div className="pb-6">
      <TopBar title="Revision" subtitle="Smart revision from your chats" />

      <section className="mx-5 rounded-[28px] bg-gradient-to-br from-primary to-primary-glow p-5 text-primary-foreground shadow-soft">
        <h2 className="text-2xl font-black leading-tight">Keep revising,<br/>Keep growing! 🌱</h2>
        <p className="mt-1 text-xs opacity-90">Everything you learn in Chat, ready to revise.</p>
      </section>

      <section className="mx-5 mt-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold">Revision Overview</h3>
          <Link to="/analytics" search={{ tab: "overview", range: "week" }} className="inline-flex items-center gap-1 text-xs font-semibold text-primary">View Analytics <Sparkles className="h-3 w-3" /></Link>
        </div>
        <div className="shadow-card mt-2 grid grid-cols-4 gap-2 rounded-[24px] border border-border bg-card p-3 text-center">
          <StatCard icon={<BookOpen className="h-4 w-4" />} tone="bg-lavender text-primary" value={stats.topics} label="Sets" sub="Total" />
          <StatCard icon={<ClipboardList className="h-4 w-4" />} tone="bg-success/10 text-success" value={threads.length} label="Chats" sub="Available" />
          <StatCard icon={<HelpCircle className="h-4 w-4" />} tone="bg-warning/10 text-warning" value={sets.filter(s=>s.source==="chat").length} label="From chat" sub="Synced" />
          <StatCard icon={<Target className="h-4 w-4" />} tone="bg-blue/10 text-blue" value={`${stats.retention}%`} label="Retention" sub="This week" />
        </div>
      </section>

      {/* Chat-based sets */}
      <section className="mx-5 mt-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold">From your chats</h3>
          <span className="text-[11px] text-muted-foreground">{threads.length} conversation{threads.length===1?"":"s"}</span>
        </div>
        <p className="mt-0.5 text-[11px] text-muted-foreground">Turn any chat into a smart revision set — notes, flashcards, quiz, weak areas.</p>
        <div className="mt-3 space-y-2">
          {threads.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Start a chat first, then come back to generate a set.
              <div className="mt-3"><Link to="/chat" className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground">Open Chat</Link></div>
            </div>
          )}
          {threads.map((t) => {
            const set = setsByThread.get(t.id);
            const isBusy = busy === t.id;
            return (
              <div key={t.id} className="shadow-card grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-border bg-card p-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-lavender text-lg">💬</div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold">{set?.title || t.title || "Untitled chat"}</div>
                  <div className="truncate text-[11px] text-muted-foreground">
                    {set ? `${set.emoji || "📘"} Set ready · updated ${new Date(set.updated_at).toLocaleDateString()}` : "No set yet"}
                  </div>
                </div>
                {set ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleGenerate(t.id)}
                      disabled={isBusy}
                      title="Regenerate from latest chat"
                      className="grid h-9 w-9 place-items-center rounded-xl border border-border bg-card text-muted-foreground hover:text-primary"
                    >
                      {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    </button>
                    <Link to="/revision/$setId" params={{ setId: set.id }} className="rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground">Open</Link>
                  </div>
                ) : (
                  <button
                    onClick={() => handleGenerate(t.id)}
                    disabled={isBusy}
                    className="gradient-primary inline-flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-bold text-primary-foreground disabled:opacity-60"
                  >
                    {isBusy ? <><Loader2 className="h-3 w-3 animate-spin" /> Generating…</> : <><Sparkles className="h-3 w-3" /> Generate set</>}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* All sets */}
      <section className="mx-5 mt-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold">Your Revision Sets</h3>
          <Link to="/chat" className="inline-flex items-center gap-1 text-xs font-semibold text-primary"><Plus className="h-3.5 w-3.5" /> New chat</Link>
        </div>
        <div className="mt-2 space-y-2">
          {sets.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No sets yet. Generate one from a chat above.
            </div>
          ) : sets.map((set) => (
            <Link key={set.id} to="/revision/$setId" params={{ setId: set.id }} className="shadow-card grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-border bg-card p-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-lavender text-xl">{set.emoji || "📘"}</div>
              <div className="min-w-0">
                <div className="truncate text-sm font-bold">{set.title}</div>
                <div className="truncate text-[11px] text-muted-foreground">
                  {set.source === "chat" ? "From chat" : "Manual"} · {set.last_revised_at ? `revised ${new Date(set.last_revised_at).toLocaleDateString()}` : "not yet revised"}
                </div>
              </div>
              <ProgressRing value={set.progress_pct} size={44} stroke={5} />
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-5 mt-5 rounded-[24px] bg-lavender p-4 shadow-card">
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
          <div className="text-3xl">🧠</div>
          <div className="min-w-0">
            <div className="text-sm font-bold">AI Revision Coach</div>
            <div className="text-xs text-muted-foreground">Chat with Sana about topics you want to master.</div>
          </div>
          <button onClick={() => nav({ to: "/chat" })} className="gradient-primary shadow-soft rounded-2xl px-4 py-2 text-xs font-bold text-primary-foreground"><MessageCircle className="mr-1 inline h-3 w-3" />Chat</button>
        </div>
      </section>
    </div>
  );
}

function StatCard({ icon, tone, value, label, sub }: { icon: React.ReactNode; tone: string; value: React.ReactNode; label: string; sub?: string }) {
  return (
    <div className="rounded-2xl p-2">
      <div className={`mx-auto grid h-9 w-9 place-items-center rounded-full ${tone}`}>{icon}</div>
      <div className="mt-1 text-xl font-black">{value}</div>
      <div className="text-[11px] font-semibold">{label}</div>
      {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
    </div>
  );
}
