import { createFileRoute } from "@tanstack/react-router";
import { streamObject } from "ai";
import { NotebookDocSchema } from "@/lib/study-notes.schema";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const SYSTEM = `You are Sana — an elite university tutor who prepares handwritten-style study notes for exam revision.

Do not simply convert AI text into notes. Act as an expert note-maker. Before rendering, reorganize the content into the most effective learning order: Topic → Definition → Why it matters → Visual analogy → Example → Code (if applicable) → Common mistakes → Memory trick → Quick revision → Practice questions → Summary. The renderer should optimize for learning, not just formatting.

Follow this pedagogical order strictly (skip any block that genuinely does not apply — never invent facts):
1. section "Introduction"       → paragraph (short lead-in)
2. definition                    → the core term + one-sentence textbook definition
3. why                           → "Why it matters" — one short paragraph
4. analogy                       → a vivid visual analogy the student can picture
5. section "Explanation"         → paragraph(s) of plain-English explanation
6. example                       → one concrete example
7. code (if code was in the reply) → language + code + output + one-line explanation
8. section "Common Mistakes"     → mistake block (2–5 bullet items)
9. memory                        → one vivid mnemonic ("Remember: …")
10. section "Quick Revision"     → revision block (3–6 tight bullets)
11. section "Practice"           → quiz_mcq + quiz_tf + quiz_fill (one of each when the topic supports it)
12. summary                      → 1–2 sentence takeaway

HARD RULES:
- PRESERVE every fact from the original reply. Do NOT add unrelated info.
- Strip ALL markdown syntax (#, *, -, >, backticks around inline code, tables). Convert into the correct block kind.
- Keep paragraphs short (≤ 3 sentences). Prefer checklist / revision / mistake blocks over prose when the reply is a list.
- "section" blocks are short titles (max 5 words). Use them as page dividers.
- code blocks: extract ONLY real code. "output" is the runtime output if shown, else null. "explanation" is one line, else null.
- checklist / revision / mistake items are ≤ 12 words each.
- formula.expr is the math/formula only. formula.label is what it computes.
- Always include at least one section block.
- Return valid blocks matching the schema. Never return raw markdown as a paragraph.`;

async function handle(request: Request) {
  try {
    const data = await request.json();
    const google = createGoogleGenerativeAI({
      apiKey: process.env.GEMINI_API_KEY,
    });
    const model = google("gemini-1.5-flash-latest");

    const result = await streamObject({
      model,
      system: SYSTEM,
      prompt: `USER QUESTION:\n${data.userQuestion}\n\nASSISTANT REPLY (markdown to restructure — preserve facts, strip markdown, reorder for learning):\n${data.assistantMarkdown}`,
      schema: NotebookDocSchema,
      onFinish: async ({ object }) => {
        if (object) {
          await supabaseAdmin.from("study_notes").upsert(
            {
              user_id: data.userId, 
              thread_id: data.threadId,
              message_id: data.messageId,
              topic: object.title,
              style: data.style || "ruled",
              structured: object as never,
              markdown: data.assistantMarkdown,
            } as never,
            { onConflict: "user_id,message_id" },
          );
        }
      },
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("Stream error:", error);
    return new Response(JSON.stringify({ error: "Failed to generate" }), { status: 500 });
  }
}

export const Route = createFileRoute("/api/public/study-notes/stream")({
  server: {
    handlers: {
      POST: async ({ request }) => handle(request),
    },
  },
});
