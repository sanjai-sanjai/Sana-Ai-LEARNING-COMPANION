import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, MoreVertical, Sparkles, Bug, Code2, HelpCircle, RotateCw, List, Lightbulb, Copy, ThumbsUp, ThumbsDown, Paperclip, ArrowUp, Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/revision/$setId/ask")({
  ssr: false,
  component: AskAI,
});

type Msg = { role: "user" | "assistant"; text: string; at: string };

const STARTERS = [
  { icon: <HelpCircle className="h-4 w-4 text-primary" />, tone: "bg-lavender/60", text: "What is the difference between == and is in Python?" },
  { icon: <RotateCw className="h-4 w-4 text-success" />, tone: "bg-success/10", text: "Explain how loops work in Python." },
  { icon: <List className="h-4 w-4 text-warning" />, tone: "bg-warning/10", text: "How do I create a list and add items to it?" },
  { icon: <Lightbulb className="h-4 w-4 text-blue" />, tone: "bg-blue/10", text: "Why is my code showing an IndentationError?" },
];

function AskAI() {
  const { setId } = Route.useParams();
  const { data: set } = useQuery({
    queryKey: ["set", setId],
    queryFn: async () => (await supabase.from("revision_sets").select("*").eq("id", setId).maybeSingle()).data,
  });
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [thinking, setThinking] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [msgs, thinking]);

  function send(text?: string) {
    const v = (text ?? input).trim();
    if (!v) return;
    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setMsgs(m => [...m, { role: "user", text: v, at: now }]);
    setInput("");
    setThinking(true);
    setTimeout(() => {
      setMsgs(m => [...m, {
        role: "assistant",
        at: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        text: mockAnswer(v),
      }]);
      setThinking(false);
    }, 700);
  }

  return (
    <div className="flex h-[calc(100dvh-4rem)] flex-col pb-2">
      <header className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 px-5 pb-3 pt-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Link to="/revision/$setId" params={{ setId }} className="shadow-card grid h-9 w-9 place-items-center rounded-xl bg-card"><ArrowLeft className="h-4 w-4" /></Link>
            <h1 className="text-lg font-black">Ask AI <Sparkles className="ml-0.5 inline h-4 w-4 text-primary" /></h1>
          </div>
          <div className="mt-0.5 pl-11 text-[11px] text-muted-foreground">Your AI coding assistant</div>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full border border-success/30 bg-success/5 px-2 py-1 text-[10px] font-bold text-success"><span className="h-1.5 w-1.5 rounded-full bg-success" /> AI is online</span>
        <button className="shadow-card grid h-9 w-9 place-items-center rounded-xl bg-card"><MoreVertical className="h-4 w-4" /></button>
      </header>

      <div ref={scroller} className="flex-1 space-y-4 overflow-y-auto px-5 pb-4">
        {msgs.length === 0 && (
          <>
            <section className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-[22px] bg-lavender/60 p-3 shadow-card">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary text-2xl text-primary-foreground">🤖</div>
              <div className="min-w-0">
                <div className="text-sm font-black">Hi! I'm Sana ✨</div>
                <div className="text-[11px] text-muted-foreground">Ask me anything about {set?.title || "your topic"}. I can explain concepts, help solve errors, write code and more.</div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Chip icon={<Sparkles className="h-3 w-3" />}>Explain a concept</Chip>
                  <Chip icon={<Bug className="h-3 w-3 text-success" />}>Debug my code</Chip>
                  <Chip icon={<Code2 className="h-3 w-3 text-warning" />}>Write code</Chip>
                </div>
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between">
                <div className="text-sm font-black">Try asking me something</div>
                <button className="text-xs font-bold text-primary">See all</button>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {STARTERS.map((s, i) => (
                  <button key={i} onClick={() => send(s.text)} className="rounded-2xl border border-border bg-card p-3 text-left shadow-card">
                    <div className={cn("grid h-7 w-7 place-items-center rounded-lg", s.tone)}>{s.icon}</div>
                    <div className="mt-2 text-[11px] font-bold leading-snug">{s.text}</div>
                  </button>
                ))}
              </div>
            </section>
          </>
        )}

        {msgs.map((m, i) => m.role === "user" ? (
          <div key={i} className="flex justify-end">
            <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-sm text-primary-foreground shadow-soft">
              {m.text}
              <div className="mt-0.5 text-right text-[10px] opacity-80">{m.at} <Check className="ml-0.5 inline h-3 w-3" /></div>
            </div>
          </div>
        ) : (
          <div key={i} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-lavender/70 text-lg">🤖</div>
            <div className="rounded-2xl rounded-tl-sm border border-border bg-card p-3 text-sm shadow-card">
              <div className="whitespace-pre-wrap">{m.text}</div>
            </div>
            <div className="flex flex-col gap-1.5 text-muted-foreground">
              <button className="grid h-7 w-7 place-items-center rounded-lg bg-card shadow-card"><Copy className="h-3.5 w-3.5" /></button>
              <button className="grid h-7 w-7 place-items-center rounded-lg bg-card shadow-card"><ThumbsUp className="h-3.5 w-3.5" /></button>
              <button className="grid h-7 w-7 place-items-center rounded-lg bg-card shadow-card"><ThumbsDown className="h-3.5 w-3.5" /></button>
            </div>
          </div>
        ))}

        {thinking && (
          <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-lavender/70 text-lg">🤖</div>
            <div className="inline-flex items-center gap-1 rounded-2xl border border-border bg-card px-3 py-2 shadow-card">
              <Dot /><Dot delay={0.15} /><Dot delay={0.3} />
            </div>
          </div>
        )}
      </div>

      <div className="mx-5 mb-2">
        {msgs.length > 0 && (
          <div className="mb-2 flex gap-1.5 overflow-x-auto no-scrollbar">
            {["Can you give an example?", "Show me code", "Explain simpler", "What's next?"].map(s => (
              <button key={s} onClick={() => send(s)} className="shrink-0 rounded-full border border-primary/30 bg-lavender/40 px-3 py-1.5 text-[11px] font-bold text-primary">{s}</button>
            ))}
          </div>
        )}
        <div className="grid grid-cols-[1fr_auto] items-end gap-2 rounded-2xl border border-border bg-card p-2 shadow-card">
          <div>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              rows={1}
              placeholder={`Ask anything about ${set?.title || "this topic"}...`}
              className="max-h-32 w-full resize-none bg-transparent px-2 py-2 text-sm outline-none"
            />
            <button className="px-2 py-1 text-muted-foreground"><Paperclip className="h-4 w-4" /></button>
          </div>
          <button onClick={() => send()} disabled={!input.trim()} className="gradient-primary grid h-10 w-10 place-items-center rounded-full text-primary-foreground shadow-soft disabled:opacity-50"><ArrowUp className="h-4 w-4" /></button>
        </div>
        <p className="mt-1 text-center text-[10px] text-muted-foreground">AI can make mistakes. Please verify important information.</p>
      </div>
    </div>
  );
}

function Chip({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-1 text-[10px] font-bold">{icon} {children}</span>;
}
function Dot({ delay = 0 }: { delay?: number }) {
  return <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary" style={{ animationDelay: `${delay}s` }} />;
}
function mockAnswer(q: string) {
  return `Great question! Here's a quick explanation:\n\n${q}\n\nI'll expand this with concrete examples and code once your AI gateway is wired to this chat. For now, use this as a scratch space to organize what you want to ask.`;
}
