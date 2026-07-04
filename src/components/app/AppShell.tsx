import type { ReactNode } from "react";
import { BottomTabBar } from "./BottomTabBar";

/**
 * Mobile-first native-feeling app shell.
 * On mobile: fills the viewport with a fixed bottom tab bar.
 * On desktop: same UI centered inside a rounded "phone frame" on a soft
 * lavender backdrop — preserves the native mobile design language.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-[100dvh] w-full bg-gradient-to-br from-lavender/60 via-background to-background md:from-lavender md:via-background md:to-lavender/60">
      {/*
        Responsive phone-frame shell:
        - <=430px  (iPhone / Android phones): fills the viewport, no frame.
        - 431-767  (large phones, small foldables): still fills, adds side gutter.
        - 768-1023 (iPad portrait / tablets): centered phone frame ~440px.
        - >=1024   (iPad landscape / desktops): centered phone frame ~448px with glow.
        Content width is CAPPED so mobile components never stretch on tablet/desktop.
      */}
      <div
        className={[
          "mx-auto flex w-full flex-col bg-background",
          // Mobile: full-bleed, safe-area aware
          "min-h-[100dvh] max-w-[430px] pb-[env(safe-area-inset-bottom)]",
          // Tablet portrait: framed
          "md:my-6 md:min-h-[calc(100dvh-3rem)] md:max-w-[440px] md:overflow-hidden md:rounded-[40px] md:border md:border-border/60 md:shadow-card",
          // Desktop / iPad landscape: slightly wider frame + glow
          "lg:my-10 lg:min-h-[calc(100dvh-5rem)] lg:max-w-[448px] lg:rounded-[44px] lg:shadow-glow",
          // XL screens: keep frame, don't stretch
          "xl:max-w-[456px]",
        ].join(" ")}
      >
        <main className="no-scrollbar flex-1 overflow-y-auto pb-2">{children}</main>
        <BottomTabBar />
      </div>
    </div>
  );
}
