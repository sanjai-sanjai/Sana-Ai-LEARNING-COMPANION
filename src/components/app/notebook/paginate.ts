import type { NotebookBlock, NotebookDoc } from "@/lib/study-notes.schema";

export type NotebookPageBlocks = NotebookBlock[];

/**
 * Split a NotebookDoc into pages so each page fits roughly one mobile screen.
 * Rules:
 *  - a `section` block starts a new page (unless the current page is empty)
 *  - atomic blocks (code, formula, quiz_*, analogy) are never split
 *  - pages have a soft weight budget; overflow moves the current block to a new page
 */
export function paginateNotebook(doc: NotebookDoc): NotebookPageBlocks[] {
  const BUDGET = 100; // per page weight budget (tuned for ~mobile screen)
  const pages: NotebookPageBlocks[] = [];
  let current: NotebookBlock[] = [];
  let weight = 0;

  const flush = () => {
    if (current.length > 0) {
      pages.push(current);
      current = [];
      weight = 0;
    }
  };

  for (const block of doc.blocks) {
    const w = blockWeight(block);

    // section starts a new page (unless page is empty)
    if (block.kind === "section" && current.length > 0) {
      flush();
    }

    // overflow → new page (but never leave a page with just a section heading)
    if (weight + w > BUDGET && current.length > 0) {
      const lastIsLoneSection =
        current.length === 1 && current[0].kind === "section";
      if (!lastIsLoneSection) flush();
    }

    current.push(block);
    weight += w;
  }
  flush();

  // Never return zero pages
  if (pages.length === 0) pages.push([{ kind: "paragraph", text: "" }]);
  return pages;
}

function blockWeight(b: NotebookBlock): number {
  if (!b) return 0;
  switch (b.kind) {
    case "section":
      return 18;
    case "paragraph":
      return Math.min(60, 14 + Math.floor((b.text?.length || 0) / 40) * 6);
    case "definition":
      return 30 + Math.floor((b.text?.length || 0) / 60) * 4;
    case "why":
    case "analogy":
    case "example":
    case "real_world":
    case "warning":
    case "summary":
      return 26 + Math.floor((b.text?.length || 0) / 60) * 4;
    case "memory":
      return 28;
    case "checklist":
      return 12 + (b.items?.length || 0) * 10;
    case "revision":
      return 14 + (b.items?.length || 0) * 9;
    case "mistake":
      return 14 + (b.items?.length || 0) * 10;
    case "formula":
      return 34;
    case "code":
      return 40 + Math.min(60, (b.code?.split("\n").length || 0) * 6);
    case "quiz_mcq":
      return 44 + (b.options?.length || 0) * 6;
    case "quiz_tf":
      return 30;
    case "quiz_fill":
      return 30;
  }
}

export function extractSections(pages: NotebookPageBlocks[]): {
  index: number;
  title: string;
}[] {
  const out: { index: number; title: string }[] = [];
  pages.forEach((page, i) => {
    const s = page.find((b) => b?.kind === "section");
    if (s && s.kind === "section" && s.text) {
      out.push({ index: i, title: s.text });
    }
  });
  return out;
}
