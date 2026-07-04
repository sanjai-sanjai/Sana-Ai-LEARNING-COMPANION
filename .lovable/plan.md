# Study Notes Notebook — Complete Redesign

Rebuild the Study Notes rendering pipeline so AI answers become a paginated, component-based notebook — not markdown on ruled paper.

## Pipeline

```
AI markdown
   ↓
structureStudyNotebook (server fn, Lovable AI Gateway, Gemini 3 Flash)
   ↓
NotebookDoc JSON  (cached in study_notes.structured)
   ↓
Paginator (block-based, mobile-screen sized)
   ↓
NotebookViewer (swipe pages, TOC, page indicator)
   ↓
Block components (never raw markdown)
```

The AI is prompted as an **expert note-maker**: reorganize into Topic → Definition → Why it matters → Analogy → Example → Code → Common mistakes → Memory trick → Quick revision → Practice → Summary. Output is a typed block list, not prose.

## New schema (`study-notes.schema.ts`)

Replace flat `StudyNote` with a block-based `NotebookDoc`:

```ts
NotebookDoc = {
  title: string
  subtitle: string | null
  blocks: NotebookBlock[]   // ordered
}

NotebookBlock =
  | { kind: "section", text: string }              // purple handwritten heading
  | { kind: "paragraph", text: string }            // Inter body
  | { kind: "definition", term: string|null, text: string }   // blue card
  | { kind: "why", text: string }                  // "Why it matters" callout
  | { kind: "analogy", text: string }              // visual analogy card
  | { kind: "example", text: string }              // green card
  | { kind: "real_world", text: string }           // green notebook card
  | { kind: "checklist", items: string[] }         // ✓ bullets
  | { kind: "formula", label: string|null, expr: string, note: string|null }
  | { kind: "code", language: string, filename: string|null, code: string, output: string|null, explanation: string|null }
  | { kind: "warning", text: string }              // red note
  | { kind: "mistake", items: string[] }           // red mistakes card
  | { kind: "memory", text: string }               // orange sticky
  | { kind: "revision", items: string[] }          // quick revision bullets
  | { kind: "summary", text: string }
  | { kind: "quiz_mcq", question, options, answer_index, explanation? }
  | { kind: "quiz_tf", statement, answer, explanation? }
  | { kind: "quiz_fill", sentence, answer }
```

Zod schema stays flat/strict-compatible (no bounds, no `.optional()` — use `.nullable()`).

## Pagination

`paginateNotebook(doc)` groups blocks into pages using a weight budget (~mobile screen). Rules:
- New `section` starts a new page (unless page is empty).
- `code`, `formula`, `quiz_*`, `analogy` are atomic — never split, moved to next page if overflow.
- Aim for logical grouping (e.g. checklist stays with its section).
- Quiz blocks bucket together on trailing page(s).
- Final page always ends with `summary` if present.

Result: `NotebookPage[]`, each ~ one mobile viewport.

## New components (`src/components/app/notebook/`)

- `NotebookViewer.tsx` — horizontal swipe pager (framer-motion drag), page indicator "2 / 6", TOC drawer for >5 pages, keyboard arrows.
- `NotebookPage.tsx` — cream paper, red margin, blue ruled lines, holes, date, page number. Renders `blocks[]` via `<BlockRenderer />`.
- `BlockRenderer.tsx` — switch on `kind`.
- Block cards: `DefinitionCard`, `WhyCard`, `AnalogyCard`, `ExampleCard`, `RealWorldCard`, `ChecklistCard`, `FormulaCard`, `CodeCard`, `WarningCard`, `MistakeCard`, `MemoryStickyNote`, `RevisionCard`, `SummaryCard`, `QuizMCQCard`, `QuizTFCard`, `QuizFillCard`, `SectionHeading`, `Paragraph`.
- `TableOfContents.tsx` — auto-listed sections.

Typography (via existing `@utility font-handwriting`):
- Titles / section headings / labels / memory / formula labels → Patrick Hand / Caveat
- Body paragraphs, code, long text → Inter
- Never handwriting for long paragraphs.

## Server function

Rename to `structureStudyNotebook` in `study-notes.functions.ts`:
- New SYSTEM prompt: expert note-maker, reorder for learning, output typed blocks, strip all markdown.
- Uses `generateText` + `Output.object({ schema: NotebookDocSchema })` with the standard `NoObjectGeneratedError` fallback.
- Cache key stays `(user_id, message_id)`; `structured` jsonb now holds `NotebookDoc`.
- Migration: none needed — column is jsonb. Old rows become stale; renderer detects legacy shape and falls back to a single-page render, then can be regenerated.

## Renderer swap

`StudyNoteRenderer.tsx` now returns `<NotebookViewer doc={data.structured} />` instead of a single `NotebookPage`. Loading skeleton becomes a single blank notebook page with shimmer.

Cached JSON means style change = re-render only, no AI call.

## Out of scope (deferred, not in this phase)

To keep this shippable, the following are **not** in this change; noted for a later pass:
- Pinch-to-zoom, double-tap highlight, long-press personal notes, bookmarks, page-curl transitions, thumbnail strip, virtualization. Swipe navigation + TOC ship now; the rest is Phase 3+.
- Diagram/table cards ship as minimal (table = checklist-style grid; diagram = captioned analogy card) until we have a real diagram source.

## Files

- Edit: `src/lib/study-notes.schema.ts`, `src/lib/study-notes.functions.ts`, `src/components/app/StudyNoteRenderer.tsx`
- Create: `src/components/app/notebook/NotebookViewer.tsx`, `NotebookPage.tsx`, `BlockRenderer.tsx`, `blocks/*.tsx`, `paginate.ts`, `TableOfContents.tsx`
- Delete: old `src/components/app/NotebookPage.tsx` (replaced)
- CSS: extend `src/styles.css` with card tokens (definition/example/warning/memory/formula) using semantic tokens.

Reply **go** to build it, or tell me what to change.
