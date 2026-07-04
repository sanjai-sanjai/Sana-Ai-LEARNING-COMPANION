import { useMemo, useState, useRef, useEffect } from "react";
import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import { ChevronLeft, ChevronRight, List, Loader2 } from "lucide-react";
import type { NotebookDoc } from "@/lib/study-notes.schema";
import { paginateNotebook, extractSections } from "./paginate";
import { BlockRenderer } from "./blocks";

export function NotebookViewerSkeleton() {
  return (
    <div className="notebook-page notebook-ruled min-h-[480px]">
      <div className="notebook-holes" aria-hidden />
      <div className="relative flex flex-col items-center justify-center gap-3 py-24 text-[#6d28d9]/80">
        <Loader2 className="h-6 w-6 animate-spin" />
        <div className="font-handwriting text-sm">Sana is writing your notes…</div>
      </div>
    </div>
  );
}

export function NotebookViewer({ doc }: { doc: NotebookDoc }) {
  const pages = useMemo(() => paginateNotebook(doc), [doc]);
  const sections = useMemo(() => extractSections(pages), [pages]);
  const [idx, setIdx] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const [tocOpen, setTocOpen] = useState(false);
  const total = pages.length;

  // Auto-flip to new pages while streaming
  useEffect(() => {
    // If we were on the previous last page and a new one generated, automatically flip to it.
    if (idx === total - 2 && total > 1) {
      setDir(1);
      setIdx(total - 1);
    }
  }, [total, idx]);

  const go = (n: number) => {
    const next = Math.max(0, Math.min(total - 1, n));
    setDir(next > idx ? 1 : -1);
    setIdx(next);
  };

  const dateStr = useMemo(
    () =>
      new Date().toLocaleDateString(undefined, {
        month: "numeric",
        day: "numeric",
        year: "numeric",
      }),
    [],
  );

  // keyboard arrows
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      if (document.activeElement && el.contains(document.activeElement)) {
        if (e.key === "ArrowRight") go(idx + 1);
        if (e.key === "ArrowLeft") go(idx - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  
  // Auto-scroll to bottom of the current page as content streams in
  const pageRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (idx === total - 1 && pageRef.current) {
      const scrollParent = pageRef.current.closest(".overflow-y-auto");
      if (scrollParent) {
        // Smoothly scroll the container to the bottom
        scrollParent.scrollTo({
          top: scrollParent.scrollHeight,
          behavior: "smooth"
        });
      } else {
        pageRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
      }
    }
  }, [pages[idx], idx, total]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -60 || info.velocity.x < -400) go(idx + 1);
    else if (info.offset.x > 60 || info.velocity.x > 400) go(idx - 1);
  };

  return (
    <div ref={rootRef} tabIndex={-1} className="relative">
      {/* Title header */}
      <div className="mb-4 px-2 text-center mt-2">
        <h1 className="font-handwriting-bold text-[32px] leading-tight text-black underline underline-offset-4 decoration-[2px]">
          {doc.title}
        </h1>
        {doc.subtitle && (
          <div className="text-[15px] font-handwriting text-[#64748b] mt-1">
            {doc.subtitle}
          </div>
        )}
      </div>

      {/* Page stack */}
      <div className="relative overflow-hidden">
        <AnimatePresence mode="wait" initial={false} custom={dir}>
          <motion.article
            key={idx}
            custom={dir}
            initial={{ opacity: 0, x: dir * 80, rotateY: dir * -10, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, rotateY: 0, scale: 1 }}
            exit={{ opacity: 0, x: dir * -80, rotateY: dir * 10, scale: 0.95 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.15}
            onDragEnd={onDragEnd}
            className="notebook-page notebook-ruled min-h-[520px] touch-pan-y"
          >
            <div ref={pageRef} className="notebook-holes" aria-hidden />
            <div className="notebook-date font-handwriting">{dateStr}</div>
            <div className="notebook-body pt-4">
              {/* Auto-TOC for large notebooks on page 1 */}
              {idx === 0 && total > 5 && sections.length > 1 && (
                <div className="mb-6 rounded-lg border-2 border-dashed border-[#cbd5e1] bg-white/50 p-4">
                  <h3 className="mb-3 font-handwriting-bold text-[18px] text-[#4c1d95]">Table of Contents</h3>
                  <ul className="space-y-2">
                    {sections.map((s) => (
                      <li key={s.index}>
                        <button
                          type="button"
                          onClick={() => go(s.index)}
                          className="flex w-full items-center gap-3 text-left hover:text-[#6d28d9] transition-colors"
                        >
                          <span className="font-handwriting font-bold text-[#94a3b8]">Pg.{s.index + 1}</span>
                          <span className="text-[14.5px] text-[#334155] border-b border-dotted border-slate-300 flex-1">{s.title}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {pages[idx].map((b, i) => (
                <BlockRenderer key={i} block={b} />
              ))}
            </div>
            <div className="notebook-page-number font-handwriting font-bold text-[#1e293b] text-[15px]">
              {idx + 1} / {total}
            </div>
          </motion.article>
        </AnimatePresence>
      </div>

      {/* Controls: Thumbnail Nav */}
      <div className="mt-6 flex flex-col items-center justify-center">
        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar max-w-full px-2 py-2">
          {pages.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => go(i)}
              aria-label={`Page ${i + 1}`}
              className="flex flex-col items-center gap-1.5 group"
            >
              <div 
                className={`w-14 h-10 rounded-sm border ${
                  i === idx ? "border-[#7C4DFF] shadow-sm shadow-[#7C4DFF]/20" : "border-slate-200 opacity-60 group-hover:opacity-100"
                } bg-[#FEFEF6] flex items-center justify-center overflow-hidden transition-all`}
              >
                 <div className="w-full h-full relative">
                    <div className="absolute top-0 bottom-0 left-1 w-0.5 bg-red-400/50" />
                    <div className="absolute top-3 left-0 right-0 h-px bg-blue-400/20" />
                    <div className="absolute top-5 left-0 right-0 h-px bg-blue-400/20" />
                    <div className="absolute top-7 left-0 right-0 h-px bg-blue-400/20" />
                 </div>
              </div>
              <span className={`text-[11px] font-bold ${i === idx ? "text-[#7C4DFF]" : "text-slate-400 group-hover:text-slate-600"}`}>
                {i + 1}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* TOC popover */}
      <AnimatePresence>
        {tocOpen && sections.length > 1 && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="mt-2 rounded-xl border border-border bg-card p-3 shadow-lg"
          >
            <div className="mb-2 font-handwriting-bold text-[15px] text-[#6d28d9]">
              Contents
            </div>
            <ul className="space-y-1">
              {sections.map((s) => (
                <li key={s.index}>
                  <button
                    type="button"
                    onClick={() => {
                      go(s.index);
                      setTocOpen(false);
                    }}
                    className={
                      "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-[13px] " +
                      (s.index === idx
                        ? "bg-[#f5f3ff] text-[#4c1d95]"
                        : "hover:bg-muted text-foreground")
                    }
                  >
                    <span className="truncate">
                      <span className="mr-2 text-muted-foreground">
                        {String(s.index + 1).padStart(2, "0")}
                      </span>
                      {s.title}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
