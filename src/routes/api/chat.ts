import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, smoothStream, streamText, type UIMessage } from "ai";
import { getGroqModel } from "@/lib/ai-groq.server";
import { systemPromptFor, type AiPersonality } from "@/lib/sana";

type Body = {
  messages?: UIMessage[];
  personality?: AiPersonality;
  displayName?: string | null;
  videoContext?: string | null;
  classroomContext?: string | null;
};

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { messages, personality, displayName, videoContext, classroomContext } =
            (await request.json()) as Body;
          if (!Array.isArray(messages)) return new Response("messages required", { status: 400 });

          const baseSystem = systemPromptFor(personality ?? "friendly_coach", displayName ?? null);
          let system = baseSystem;
          if (videoContext) {
            system += `

You have access to transcript excerpts from the YouTube video(s) the user is currently studying. Use them as your primary source of truth. When you reference a fact from the video, cite the timestamp inline using the exact markdown link format provided (e.g. [02:14](https://youtu.be/ID?t=134)). If the answer is not in the excerpts, say so clearly and offer the closest related context.

--- VIDEO TRANSCRIPT EXCERPTS ---
${videoContext}
--- END EXCERPTS ---`;
          }
          if (classroomContext === "__NO_MATCHES__") {
            system += `

The student asked a question that may relate to their Google Classroom, but a vector search over their indexed classroom content returned NO relevant excerpts. Do NOT invent classroom-specific facts (assignment titles, due dates, teacher instructions, document contents). Tell the student plainly that you couldn't find anything matching in their connected classroom, suggest they broaden the question or check the classroom filter, and only then offer general knowledge clearly labelled as "general" — never as if it came from their course.`;
          } else if (classroomContext) {
            system += `

You have retrieved excerpts from the student's Google Classroom (assignments, announcements, materials, and course documents). These are your ONLY authoritative source for anything about the student's specific classes, homework, deadlines, teacher instructions, or lecture content.

Grounding rules — follow strictly:
1. Only claim classroom-specific facts that are directly supported by the excerpts below. Do not invent titles, dates, numbers, names, or instructions.
2. Cite every classroom claim inline as a markdown link using the exact title and URL provided, e.g. [Unit 5 Notes](https://docs.google.com/...). If a source has no URL, cite the title in bold.
3. If the excerpts partially answer the question, answer only the supported part and say clearly what is missing.
4. If the excerpts are irrelevant to the question, say so explicitly ("I couldn't find this in your classroom materials") before offering general knowledge, and label that general knowledge as such.
5. Never mix general knowledge with a classroom citation.

--- CLASSROOM EXCERPTS ---
${classroomContext}
--- END EXCERPTS ---`;
          }

          const model = getGroqModel();
          const result = streamText({
            model,
            system,
            messages: await convertToModelMessages(messages),
            abortSignal: request.signal,
            experimental_transform: smoothStream({ delayInMs: 22, chunking: "word" }),
          });
          return result.toUIMessageStreamResponse({
            originalMessages: messages,
            sendReasoning: false,
            headers: {
              "Content-Type": "text/event-stream; charset=utf-8",
              "Cache-Control": "no-cache, no-transform",
              "X-Accel-Buffering": "no",
              Connection: "keep-alive",
            },
          });
        } catch (err) {
          console.error("chat api error", err);
          const msg = err instanceof Error ? err.message : "unknown error";
          return new Response(`AI error: ${msg}`, { status: 500 });
        }
      },
    },
  },
});
