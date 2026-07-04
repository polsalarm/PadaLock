import type { ReactNode } from "react";

/**
 * Wraps the entire app. On phones (< lg) it's a passthrough — the PWA renders
 * full-bleed as normal. On desktop (>= lg) it renders the app inside a device
 * mockup (black bezel, side buttons, shadow) centered on a backdrop, so the
 * mobile-first UI doesn't sprawl across a wide browser window.
 *
 * The "screen" carries `transform: translateZ(0)`, which makes it the
 * containing block for `position: fixed` descendants (bottom nav, feedback
 * widget) — so they pin to the frame instead of the browser viewport.
 */
export function DesktopFrame({ children }: { children: ReactNode }) {
  return (
    <div className="lg:flex lg:min-h-[100dvh] lg:items-center lg:justify-center lg:bg-[#e7e7f3] lg:p-6">
      {/* device body */}
      <div className="relative lg:h-[calc(100dvh-3rem)] lg:max-h-[900px] lg:w-[420px] lg:shrink-0 lg:rounded-[3rem] lg:bg-neutral-900 lg:p-[12px] lg:shadow-[0_30px_70px_-20px_rgba(31,31,60,0.55)] lg:ring-1 lg:ring-black/50">
        {/* side buttons (desktop only) */}
        <span className="hidden lg:absolute lg:-left-[3px] lg:top-[110px] lg:block lg:h-8 lg:w-[3px] lg:rounded-l lg:bg-neutral-800" />
        <span className="hidden lg:absolute lg:-left-[3px] lg:top-[160px] lg:block lg:h-16 lg:w-[3px] lg:rounded-l lg:bg-neutral-800" />
        <span className="hidden lg:absolute lg:-right-[3px] lg:top-[150px] lg:block lg:h-24 lg:w-[3px] lg:rounded-r lg:bg-neutral-800" />

        {/* screen — scroll viewport + containing block for fixed children */}
        <div className="relative bg-surface lg:h-full lg:w-full lg:overflow-hidden lg:rounded-[2.3rem] lg:[transform:translateZ(0)]">
          <div className="no-scrollbar lg:h-full lg:overflow-y-auto lg:overscroll-contain">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
