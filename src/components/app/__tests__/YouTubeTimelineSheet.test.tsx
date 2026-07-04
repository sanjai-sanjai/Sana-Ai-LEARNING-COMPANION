/**
 * Automated accessibility + keyboard navigation tests for the YouTube
 * timeline sheet. Runs under jsdom via vitest (React + web DOM). The
 * component itself is a plain React web component; on React Native Web
 * the same DOM primitives are produced, so these tests cover both.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe, toHaveNoViolations } from "jest-axe";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

expect.extend(toHaveNoViolations);

// --- Mocks --------------------------------------------------------------

// Mock server functions BEFORE importing the component.
const sections = [
  { index: 0, title: "Introduction", start_seconds: 0,   end_seconds: 60,  source: "chapters" as const },
  { index: 1, title: "Core Concepts", start_seconds: 60,  end_seconds: 180, source: "auto"     as const },
  { index: 2, title: "Advanced Tips", start_seconds: 180, end_seconds: 305, source: "chapters" as const },
];

vi.mock("@/lib/youtube-processing.functions", () => ({
  listYouTubeSections: vi.fn(),
  processYouTubeVideo: vi.fn(),
}));

vi.mock("@/lib/youtube.functions", () => ({
  extractVideoId: vi.fn(),
  fetchYouTubeMetadata: vi.fn(),
  listRecentYouTubeVideos: vi.fn(),
}));

vi.mock("@tanstack/react-start", () => ({
  // useServerFn just returns a function that resolves to our fixture list.
  useServerFn: () => async () => sections,
}));

// framer-motion animates via requestAnimationFrame; we don't need real
// animations in tests — swap for plain divs so exit animations resolve
// synchronously and don't leak state between tests.
vi.mock("framer-motion", async () => {
  const React = await import("react");
  const passthrough = (tag: string) =>
    React.forwardRef<HTMLElement, Record<string, unknown>>((props, ref) => {
      const {
        initial: _i, animate: _a, exit: _e, transition: _t,
        whileHover: _wh, whileTap: _wt, whileFocus: _wf, layout: _l,
        ...rest
      } = props as Record<string, unknown>;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return React.createElement(tag, { ref, ...(rest as any) });
    });
  return {
    motion: new Proxy({}, { get: (_t, key: string) => passthrough(key) }),
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  };
});

// Silence sonner toast noise if imported transitively.
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));

// Import AFTER mocks are in place.
import {
  YouTubeTimelineSheet,
  timelineSectionAriaLabel,
  fmtDuration,
  type PinnedSection,
} from "../YouTubeConnector";

// --- Helpers ------------------------------------------------------------

function renderSheet(overrides: {
  open?: boolean;
  videoId?: string | null;
  pinned?: PinnedSection | null;
  onPick?: (s: PinnedSection | null) => void;
  onClose?: () => void;
} = {}) {
  const onPick = overrides.onPick ?? vi.fn();
  const onClose = overrides.onClose ?? vi.fn();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const utils = render(
    <QueryClientProvider client={client}>
      <YouTubeTimelineSheet
        open={overrides.open ?? true}
        videoId={overrides.videoId ?? "abc123"}
        pinned={overrides.pinned ?? null}
        onPick={onPick}
        onClose={onClose}
      />
    </QueryClientProvider>
  );
  return { ...utils, onPick, onClose };
}

async function waitForSections() {
  // useQuery resolves on the next tick; the fixture list is async.
  await screen.findByRole("button", { name: /Section 1 of 3/ });
}

// --- Label consistency --------------------------------------------------

describe("timelineSectionAriaLabel", () => {
  it("always includes section title and start-end range", () => {
    const label = timelineSectionAriaLabel({
      index: 0, total: 3, title: "Introduction",
      start_seconds: 0, end_seconds: 60, source: "chapters",
    });
    expect(label).toContain("Introduction");
    expect(label).toContain("0:00 to 1:00");
    expect(label).toContain("Section 1 of 3");
    expect(label).toContain("official chapter");
  });

  it("marks pinned sections as currently focused", () => {
    const label = timelineSectionAriaLabel({
      index: 1, total: 3, title: "Core Concepts",
      start_seconds: 60, end_seconds: 180, isPinned: true,
    });
    expect(label).toContain("currently focused");
    expect(label).toContain("1:00 to 3:00");
  });

  it("uses hours format for long videos", () => {
    expect(fmtDuration(3725)).toBe("1:02:05");
  });
});

// --- A11y audit ---------------------------------------------------------

describe("YouTubeTimelineSheet — accessibility", () => {
  it("has no axe violations when populated", async () => {
    const { container } = renderSheet();
    await waitForSections();
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("exposes a labelled modal dialog", async () => {
    renderSheet();
    const dialog = await screen.findByRole("dialog", { name: /Video Timeline/i });
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  it("renders a labelled listbox with one option per section", async () => {
    renderSheet();
    await waitForSections();
    const listbox = screen.getByRole("list", { name: /Video sections/i });
    const options = within(listbox).getAllByRole("button", { name: /Section \d+ of \d+/ });
    expect(options).toHaveLength(3);
    // Every option label consistently contains title + "start to end".
    options.forEach((opt, i) => {
      const s = sections[i];
      const label = opt.getAttribute("aria-label") ?? "";
      expect(label).toContain(s.title);
      expect(label).toContain(`${fmtDuration(s.start_seconds)} to ${fmtDuration(s.end_seconds)}`);
    });
  });

  it("marks the pinned section with aria-pressed", async () => {
    renderSheet({
      pinned: { videoId: "abc123", index: 1, title: "Core Concepts", start_seconds: 60, end_seconds: 180 },
    });
    await waitForSections();
    const options = screen.getAllByRole("button", { name: /Section \d+ of \d+/ });
    expect(options[0]).toHaveAttribute("aria-pressed", "false");
    expect(options[1]).toHaveAttribute("aria-pressed", "true");
    expect(options[1].getAttribute("aria-label")).toMatch(/currently focused/);
  });
});

// --- Keyboard navigation ------------------------------------------------

const getOptions = () =>
  screen.getAllByRole("button", { name: /Section \d+ of \d+/ });
const activeId = () => (document.activeElement as HTMLElement | null)?.id ?? "";

describe("YouTubeTimelineSheet — keyboard navigation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("focuses the first option on open (roving tabindex)", async () => {
    renderSheet();
    await waitForSections();
    const options = getOptions();
    expect(document.activeElement?.id).toBe("yt-section-0");
    expect(options[0]).toHaveAttribute("tabindex", "0");
    expect(options[1]).toHaveAttribute("tabindex", "-1");
    expect(options[2]).toHaveAttribute("tabindex", "-1");
  });

  it("ArrowDown / ArrowUp move focus and wrap", async () => {
    const user = userEvent.setup();
    renderSheet();
    await waitForSections();

    await user.keyboard("{ArrowDown}");
    expect(activeId()).toBe("yt-section-1");

    await user.keyboard("{ArrowDown}");
    expect(activeId()).toBe("yt-section-2");

    // wraps to top
    await user.keyboard("{ArrowDown}");
    expect(activeId()).toBe("yt-section-0");

    // wraps to bottom
    await user.keyboard("{ArrowUp}");
    expect(activeId()).toBe("yt-section-2");
  });

  it("Home / End jump to first and last option", async () => {
    const user = userEvent.setup();
    renderSheet();
    await waitForSections();

    await user.keyboard("{End}");
    expect(activeId()).toBe("yt-section-2");

    await user.keyboard("{Home}");
    expect(activeId()).toBe("yt-section-0");
  });


  it("Enter picks the focused section and closes the sheet", async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    const onClose = vi.fn();
    renderSheet({ onPick, onClose });
    await waitForSections();

    await user.keyboard("{ArrowDown}"); // focus section index 1
    await user.keyboard("{Enter}");

    expect(onPick).toHaveBeenCalledTimes(1);
    expect(onPick).toHaveBeenCalledWith(
      expect.objectContaining({
        videoId: "abc123",
        index: 1,
        title: "Core Concepts",
        start_seconds: 60,
        end_seconds: 180,
      })
    );
    expect(onClose).toHaveBeenCalled();
  });

  it("O jumps to the YouTube timestamp in a new tab", async () => {
    const user = userEvent.setup();
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    renderSheet();
    await waitForSections();

    await user.keyboard("{ArrowDown}{ArrowDown}"); // focus index 2 (start 180s)
    await user.keyboard("o");

    expect(openSpy).toHaveBeenCalledWith(
      "https://youtu.be/abc123?t=180",
      "_blank",
      "noopener,noreferrer"
    );
    openSpy.mockRestore();
  });

  it("Escape closes the sheet without picking", async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    const onClose = vi.fn();
    renderSheet({ onPick, onClose });
    await waitForSections();

    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onPick).not.toHaveBeenCalled();
  });

  it("C clears an existing pinned focus", async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    const onClose = vi.fn();
    renderSheet({
      onPick, onClose,
      pinned: { videoId: "abc123", index: 1, title: "Core Concepts", start_seconds: 60, end_seconds: 180 },
    });
    await waitForSections();

    await user.keyboard("c");
    expect(onPick).toHaveBeenCalledWith(null);
    expect(onClose).toHaveBeenCalled();
  });

  it("Timestamp jump link exposes an accessible label with the section title and start time", async () => {
    renderSheet();
    await waitForSections();
    const links = screen.getAllByRole("link", { name: /Open section .* in YouTube/i });
    expect(links).toHaveLength(3);
    expect(links[2]).toHaveAttribute("href", "https://youtu.be/abc123?t=180");
    expect(links[2].getAttribute("aria-label")).toContain("Advanced Tips");
    expect(links[2].getAttribute("aria-label")).toContain("3:00 to 5:05");
  });
});

// Avoid unused-var lint on act (kept available for future async flushes).
void act;
