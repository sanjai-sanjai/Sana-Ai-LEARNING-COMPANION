import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText } from "ai";
import { getGroqModel } from "@/lib/ai-groq.server";
import { z } from "zod";

const GenInput = z.object({ threadId: z.string().uuid() });

type GenSet = {
  title: string;
  description: string;
  emoji: string;
  notes: { title: string; summary: string; content_md: string; topic: string }[];
  flashcards: {
    front: string;
    back: string;
    hint?: string;
    explanation?: string;
    difficulty: "easy" | "medium" | "hard";
    topic: string;
  }[];
  quiz: {
    question: string;
    options: string[];
    correct_index: number;
    explanation: string;
    topic: string;
    difficulty: "easy" | "medium" | "hard";
    code_snippet?: string;
  }[];
  weak_areas: { topic: string; accuracy_pct: number; notes: string }[];
};

function extractJson(text: string): GenSet {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON in AI output");
  return JSON.parse(raw.slice(start, end + 1));
}

export const generateSetFromThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => GenInput.parse(v))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Load thread + messages
    const { data: thread } = await supabase
      .from("chat_threads")
      .select("id,title")
      .eq("id", data.threadId)
      .maybeSingle();
    if (!thread) throw new Error("Thread not found");

    const { data: messages } = await supabase
      .from("chat_messages")
      .select("role,content,created_at")
      .eq("thread_id", data.threadId)
      .order("created_at", { ascending: true })
      .limit(200);

    const transcript = (messages ?? [])
      .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
      .join("\n\n")
      .slice(0, 18000);

    if (!transcript.trim()) {
      return {
        setId: null as string | null,
        empty: true as const,
        message: "This chat has no messages yet. Send a few messages first, then generate a revision set.",
        counts: { notes: 0, flashcards: 0, quiz: 0, weak: 0 },
      };
    }

    const prompt = `You are an expert study coach. Read this chat conversation between a student and an AI tutor. Extract the KEY LEARNINGS and return a revision set as strict JSON only (no prose, no markdown fences).

Chat title: ${thread.title}

Transcript:
${transcript}

Return JSON matching this exact TypeScript type:
{
  "title": string,               // short, e.g. "Python Programming"
  "description": string,         // one line
  "emoji": string,               // one emoji that fits the topic
  "notes": Array<{ "title": string, "summary": string, "content_md": string, "topic": string }>, // 4-8 notes
  "flashcards": Array<{ "front": string, "back": string, "hint"?: string, "explanation"?: string, "difficulty": "easy"|"medium"|"hard", "topic": string }>, // 8-16 cards
  "quiz": Array<{ "question": string, "options": string[], "correct_index": number, "explanation": string, "topic": string, "difficulty": "easy"|"medium"|"hard", "code_snippet"?: string }>, // 5-10 MCQs, options length 4
  "weak_areas": Array<{ "topic": string, "accuracy_pct": number, "notes": string }> // 0-4 topics the student seems shaky on
}

Rules:
- Only include content that was actually discussed in the chat.
- content_md may include markdown, short code blocks with \`\`\`.
- Every quiz item must have exactly 4 options and correct_index in [0,3].
- Output JSON only.`;

    const model = getGroqModel();
    const { text } = await generateText({ model, prompt, temperature: 0.4 });
    let parsed: GenSet;
    try {
      parsed = extractJson(text);
    } catch (e) {
      throw new Error("AI returned invalid JSON. Try again.");
    }

    // Upsert set (one per thread)
    const { data: existing } = await supabase
      .from("revision_sets")
      .select("id")
      .eq("thread_id", data.threadId)
      .maybeSingle();

    let setId: string;
    if (existing) {
      setId = existing.id;
      await supabase
        .from("revision_sets")
        .update({
          title: parsed.title || thread.title,
          description: parsed.description,
          emoji: parsed.emoji || "📘",
          source: "chat",
          generated_at: new Date().toISOString(),
          last_revised_at: new Date().toISOString(),
        })
        .eq("id", setId);
      // Wipe old generated content, keep the set container
      await supabase.from("notes").delete().eq("set_id", setId);
      await supabase.from("flashcards").delete().eq("set_id", setId);
      await supabase.from("quiz_questions").delete().eq("set_id", setId);
      await supabase.from("weak_areas").delete().eq("set_id", setId);
    } else {
      const { data: created, error: cErr } = await supabase
        .from("revision_sets")
        .insert({
          user_id: userId,
          thread_id: data.threadId,
          title: parsed.title || thread.title,
          description: parsed.description,
          emoji: parsed.emoji || "📘",
          progress_pct: 0,
          source: "chat",
          generated_at: new Date().toISOString(),
          last_revised_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (cErr || !created) throw new Error(cErr?.message ?? "Failed to create set");
      setId = created.id;
    }

    // Insert notes
    if (parsed.notes?.length) {
      await supabase.from("notes").insert(
        parsed.notes.map((n, i) => ({
          user_id: userId,
          set_id: setId,
          title: n.title,
          content_md: `${n.summary ? `> ${n.summary}\n\n` : ""}${n.content_md ?? ""}`,
          position: i,
          progress_pct: 0,
        })),
      );
    }
    if (parsed.flashcards?.length) {
      await supabase.from("flashcards").insert(
        parsed.flashcards.map((c) => ({
          user_id: userId,
          set_id: setId,
          front: c.front,
          back: c.back,
          hint: c.hint ?? null,
          explanation: c.explanation ?? null,
          difficulty: c.difficulty,
          topic: c.topic,
          mastery: 0,
          status: "new",
        })),
      );
    }
    if (parsed.quiz?.length) {
      await supabase.from("quiz_questions").insert(
        parsed.quiz
          .filter((q) => Array.isArray(q.options) && q.options.length === 4)
          .map((q) => ({
            user_id: userId,
            set_id: setId,
            question: q.question,
            options: q.options,
            correct_index: Math.max(0, Math.min(3, q.correct_index ?? 0)),
            explanation: q.explanation,
            topic: q.topic,
            difficulty: q.difficulty,
            code_snippet: q.code_snippet ?? null,
          })),
      );
    }
    if (parsed.weak_areas?.length) {
      await supabase.from("weak_areas").insert(
        parsed.weak_areas.map((w) => ({
          user_id: userId,
          set_id: setId,
          topic: w.topic,
          accuracy_pct: Math.max(0, Math.min(100, w.accuracy_pct ?? 0)),
          notes: w.notes,
        })),
      );
    }

    return { setId, counts: {
      notes: parsed.notes?.length ?? 0,
      flashcards: parsed.flashcards?.length ?? 0,
      quiz: parsed.quiz?.length ?? 0,
      weak: parsed.weak_areas?.length ?? 0,
    } };
  });
