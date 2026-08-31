"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useT } from "@/lib/prefs";
import type { MsgKey } from "@/lib/i18n";

type Tab = { href: string; icon: string; label: MsgKey };

const TABS: Tab[] = [
  { href: "/dashboard", icon: "home", label: "nav.home" },
  { href: "/history", icon: "receipt_long", label: "nav.padala" },
  { href: "/family", icon: "groups", label: "nav.family" },
  { href: "/settings", icon: "settings", label: "nav.settings" },
];

/** Lens diameter — deliberately taller than the 68px bar so it bulges out top + bottom. */
const LENS = 96;

/**
 * Routes that carry the bottom nav. Exact matches only — detail routes
 * (/claim/[id], /padala/[id]) and the onboarding flow stay chrome-free.
 */
const NAV_ROUTES = new Set<string>([
  "/dashboard",
  "/history",
  "/family",
  "/settings",
  "/send",
  "/send-xlm",
]);

function tabIndexFor(path: string | null) {
  if (!path) return 0;
  if (path === "/" || path.startsWith("/dashboard")) return 0;
  const i = TABS.findIndex((t) => t.href !== "/dashboard" && path.startsWith(t.href));
  return i === -1 ? 0 : i;
}

/**
 * Floating liquid-glass bottom nav.
 *
 * Two borrowed behaviours:
 *  - the bar itself fades/expands in on mount, icons staggering behind it
 *  - a circular glass lens tracks the active tab, sliding between items with a
 *    spring curve. On pointer devices it previews the hovered tab instead.
 */
export function GlassNav() {
  const path = usePathname();
  const t = useT();
  const active = tabIndexFor(path);

  const barRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const [hovered, setHovered] = useState<number | null>(null);
  const [lensX, setLensX] = useState<number | null>(null);

  const focus = hovered ?? active;
  /** The lens is only drawn while a tab is actually hovered or pressed. */
  const lit = hovered !== null;

  // offsetLeft/offsetWidth are layout values — unlike getBoundingClientRect they
  // ignore the entrance animation's scale, so the lens lands correctly even when
  // it is measured while the items are still animating in.
  const positionLens = useCallback(() => {
    const item = itemRefs.current[focus];
    if (!barRef.current || !item) return;
    setLensX(item.offsetLeft + item.offsetWidth / 2 - LENS / 2);
  }, [focus]);

  useLayoutEffect(positionLens, [positionLens]);

  useEffect(() => {
    window.addEventListener("resize", positionLens);
    return () => window.removeEventListener("resize", positionLens);
  }, [positionLens]);

  if (!path || !NAV_ROUTES.has(path)) return null;

  return (
    <>
      <div className="glass-nav-bloom" aria-hidden="true" />
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-50 mx-auto flex w-full max-w-[480px] justify-center px-margin-mobile pb-safe"
      >
        <div
          ref={barRef}
          className="glass-nav relative mb-md flex h-[68px] w-full items-center gap-1 rounded-full px-1.5"
          onMouseLeave={() => setHovered(null)}
          onPointerLeave={() => setHovered(null)}
        >
          {/* Lens sits above the bar surface but below the icons. It only
              exists while a tab is hovered/pressed — the active tab is marked
              by its filled icon and label instead. */}
          {lensX !== null && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-0 z-10"
              style={{
                width: LENS,
                height: LENS,
                transform: `translate(${lensX}px, -50%)`,
                transition: "transform 520ms cubic-bezier(0.34, 1.32, 0.5, 1)",
              }}
            >
              {/* Scale/fade lives on an inner node: the positioning transform
                  above must not fight the reveal transform. */}
              <span
                className="glass-lens block h-full w-full rounded-full"
                style={{
                  opacity: lit ? 1 : 0,
                  transform: lit ? "scale(1)" : "scale(0.5)",
                  transition:
                    "opacity 240ms ease, transform 420ms cubic-bezier(0.34, 1.45, 0.5, 1)",
                }}
              />
            </span>
          )}

          {TABS.map((tab, i) => {
            const isActive = i === active;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                ref={(el) => {
                  itemRefs.current[i] = el;
                }}
                aria-current={isActive ? "page" : undefined}
                onMouseEnter={() => setHovered(i)}
                onPointerDown={(e) => {
                  setHovered(i);
                  // Touch/pen never fire a leave event — let the lens flash, then fade.
                  if (e.pointerType !== "mouse") {
                    window.setTimeout(() => setHovered(null), 700);
                  }
                }}
                onFocus={() => setHovered(i)}
                onBlur={() => setHovered(null)}
                className="glass-nav-item relative z-20 flex h-[60px] min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-full text-white transition-transform duration-200 active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                style={{ animationDelay: `${240 + i * 70}ms` }}
              >
                <span
                  className={`material-symbols-outlined text-[23px] leading-none transition-all duration-300 ${
                    i === focus ? "text-white" : "text-white/55"
                  }`}
                  data-weight={i === focus ? "fill" : undefined}
                  aria-hidden="true"
                >
                  {tab.icon}
                </span>
                <span
                  className={`font-label-caps text-[10px] leading-3 transition-all duration-300 ${
                    i === focus
                      ? "translate-y-0 text-white opacity-100"
                      : "-translate-y-1 text-white/0 opacity-0"
                  }`}
                >
                  {t(tab.label)}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
