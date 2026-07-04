import { z } from "zod";

export const StudyStyle = z.enum(["ruled", "unruled", "book", "cornell", "mindmap"]);
export type StudyStyleT = z.infer<typeof StudyStyle>;

/* ------------------------------------------------------------------ */
/* Block schema — every AI response becomes an ordered list of blocks. */
/* Keep flat & strict-friendly (nullable, no bounds).                  */
/* ------------------------------------------------------------------ */

const McqBlock = z.object({
  kind: z.literal("quiz_mcq"),
  question: z.string(),
  options: z.array(z.string()),
  answer_index: z.number(),
  explanation: z.string().nullable(),
});
const TfBlock = z.object({
  kind: z.literal("quiz_tf"),
  statement: z.string(),
  answer: z.boolean(),
  explanation: z.string().nullable(),
});
const FillBlock = z.object({
  kind: z.literal("quiz_fill"),
  sentence: z.string(),
  answer: z.string(),
});

export const NotebookBlockSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("section"), text: z.string() }),
  z.object({ kind: z.literal("paragraph"), text: z.string() }),
  z.object({ kind: z.literal("definition"), term: z.string().nullable(), text: z.string() }),
  z.object({ kind: z.literal("why"), text: z.string() }),
  z.object({ kind: z.literal("analogy"), text: z.string() }),
  z.object({ kind: z.literal("example"), text: z.string() }),
  z.object({ kind: z.literal("real_world"), text: z.string() }),
  z.object({ kind: z.literal("checklist"), items: z.array(z.string()) }),
  z.object({
    kind: z.literal("formula"),
    label: z.string().nullable(),
    expr: z.string(),
    note: z.string().nullable(),
  }),
  z.object({
    kind: z.literal("code"),
    language: z.string(),
    filename: z.string().nullable(),
    code: z.string(),
    output: z.string().nullable(),
    explanation: z.string().nullable(),
  }),
  z.object({ kind: z.literal("warning"), text: z.string() }),
  z.object({ kind: z.literal("mistake"), items: z.array(z.string()) }),
  z.object({ kind: z.literal("memory"), text: z.string() }),
  z.object({ kind: z.literal("revision"), items: z.array(z.string()) }),
  z.object({ kind: z.literal("summary"), text: z.string() }),
  McqBlock,
  TfBlock,
  FillBlock,
]);

export type NotebookBlock = z.infer<typeof NotebookBlockSchema>;

export const NotebookDocSchema = z.object({
  title: z.string(),
  subtitle: z.string().nullable(),
  blocks: z.array(NotebookBlockSchema),
});
export type NotebookDoc = z.infer<typeof NotebookDocSchema>;

/* Legacy shape (pre-redesign) — kept for cached rows. */
export const LegacyStudyNoteSchema = z.object({
  topic: z.string(),
  explanation: z.string().nullable().optional(),
  key_points: z.array(z.string()).optional(),
});

export const STYLE_META: Record<
  StudyStyleT,
  { label: string; description: string; ready: boolean }
> = {
  ruled: {
    label: "Ruled Notes",
    description: "Real notebook paper — perfect for revision.",
    ready: true,
  },
  unruled: {
    label: "Unruled Notes",
    description: "Clean white paper for diagrams and math.",
    ready: false,
  },
  book: {
    label: "Book Style",
    description: "Premium textbook with beautiful typography.",
    ready: false,
  },
  cornell: {
    label: "Cornell Notes",
    description: "Keywords, details, summary — for deep review.",
    ready: false,
  },
  mindmap: {
    label: "Mind Map",
    description: "Central topic branching into subtopics.",
    ready: false,
  },
};
