import { AnimatePresence, motion } from "framer-motion";
import { Check, BookMarked, X } from "lucide-react";
import { STYLE_META, type StudyStyleT } from "@/lib/study-notes.schema";

export function StyleBottomSheet({
  open,
  onClose,
  currentStyle,
  onPick,
  firstTime,
}: {
  open: boolean;
  onClose: () => void;
  currentStyle: StudyStyleT;
  onPick: (style: StudyStyleT) => void;
  firstTime?: boolean;
}) {
  const styles = Object.entries(STYLE_META) as [
    StudyStyleT,
    (typeof STYLE_META)[StudyStyleT],
  ][];
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
            className="no-scrollbar absolute inset-x-0 bottom-0 max-h-[85%] overflow-y-auto rounded-t-[32px] bg-card p-5 pb-6 shadow-glow"
          >
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-muted" />
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-black">
                  {firstTime
                    ? "Choose your preferred learning style"
                    : "Notebook style"}
                </h3>
                <p className="mt-1 text-[12px] text-muted-foreground">
                  {firstTime
                    ? "Sana will transform every explanation into structured study material."
                    : "Switch anytime — Sana won't regenerate the answer."}
                </p>
              </div>
              <button
                onClick={onClose}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-border"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              {styles.map(([key, meta]) => {
                const active = currentStyle === key;
                return (
                  <button
                    key={key}
                    type="button"
                    disabled={!meta.ready}
                    onClick={() => {
                      onPick(key);
                      onClose();
                    }}
                    className={
                      "group relative flex flex-col overflow-hidden rounded-2xl border-2 bg-card p-3 text-left shadow-card transition " +
                      (active
                        ? "border-primary"
                        : "border-border hover:border-primary/40") +
                      (!meta.ready ? " opacity-60" : "")
                    }
                  >
                    <StylePreview style={key} />
                    <div className="mt-2 flex items-center gap-1.5">
                      <div className="text-[13px] font-black">{meta.label}</div>
                      {active && (
                        <span className="grid h-4 w-4 place-items-center rounded-full bg-primary text-primary-foreground">
                          <Check className="h-2.5 w-2.5" />
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] leading-tight text-muted-foreground">
                      {meta.description}
                    </div>
                    {!meta.ready && (
                      <span className="absolute right-2 top-2 rounded-full bg-muted px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                        Soon
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex items-center gap-2 rounded-xl bg-primary/5 px-3 py-2 text-[11px] text-primary">
              <BookMarked className="h-3.5 w-3.5" />
              You can switch styles anytime — the same conversation re-renders instantly.
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function StylePreview({ style }: { style: StudyStyleT }) {
  if (style === "ruled") {
    return (
      <div
        className="h-16 w-full rounded-md border border-border"
        style={{
          background:
            "repeating-linear-gradient(to bottom, #fff 0 11px, #cfe0ff 11px 12px), linear-gradient(to right, transparent 12px, #ff9aa2 12px 13px, transparent 13px)",
        }}
      />
    );
  }
  if (style === "unruled") {
    return <div className="h-16 w-full rounded-md border border-border bg-[#fdfaf3]" />;
  }
  if (style === "book") {
    return (
      <div className="flex h-16 w-full flex-col justify-center gap-1 rounded-md border border-border bg-white px-2">
        <div className="text-[10px] font-black">Chapter 1</div>
        <div className="h-1 w-3/4 rounded bg-neutral-300" />
        <div className="h-1 w-1/2 rounded bg-neutral-300" />
      </div>
    );
  }
  if (style === "cornell") {
    return (
      <div className="grid h-16 w-full grid-cols-[1fr_2fr] overflow-hidden rounded-md border border-border bg-white">
        <div className="border-r border-border p-1 text-[8px] font-bold">Keywords</div>
        <div className="p-1 text-[8px]">Notes</div>
      </div>
    );
  }
  return (
    <div className="grid h-16 w-full place-items-center rounded-md border border-border bg-white">
      <div className="text-[10px] font-bold text-primary">◉ → ◯ ◯ ◯</div>
    </div>
  );
}
