"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { markIntroSeen } from "@/lib/intro";
import { useT } from "@/lib/prefs";
import type { MsgKey } from "@/lib/i18n";

interface Slide {
  icon: string;
  /** Tile fill — solid for the first two, a brand gradient for the finale. */
  tile: string;
  title: MsgKey;
  body: MsgKey;
}

const SLIDES: Slide[] = [
  {
    icon: "lock",
    tile: "linear-gradient(140deg, #c62aa8 0%, #d63aa0 100%)",
    title: "intro.1.title",
    body: "intro.1.body",
  },
  {
    icon: "groups",
    tile: "linear-gradient(140deg, #e0763a 0%, #ef9d5c 100%)",
    title: "intro.2.title",
    body: "intro.2.body",
  },
  {
    icon: "bar_chart",
    tile: "linear-gradient(140deg, #d02fa2 0%, #ef8a55 100%)",
    title: "intro.3.title",
    body: "intro.3.body",
  },
];

export default function WelcomePage() {
  const router = useRouter();
  const t = useT();
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  const finish = useCallback(() => {
    markIntroSeen();
    router.replace("/onboard");
  }, [router]);

  // The track is a native scroll-snap carousel, so a swipe and the Next button
  // drive the same thing — scroll position is the single source of truth.
  const onScroll = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const next = Math.round(el.scrollLeft / el.clientWidth);
    setIndex(Math.max(0, Math.min(SLIDES.length - 1, next)));
  }, []);

  const goTo = useCallback((i: number) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  }, []);

  // Chrome restores scroll position on the track across navigations, which
  // would drop a returning user straight onto the last slide.
  useLayoutEffect(() => {
    const el = trackRef.current;
    if (el) el.scrollLeft = 0;
  }, []);

  const isLast = index === SLIDES.length - 1;

  return (
    // Fixed-height layout: the pager and CTA are pinned to the bottom rather
    // than scrolled to. `lg:h-full` keeps it inside the desktop phone frame.
    <div className="app-gradient relative flex h-[100dvh] w-full flex-col overflow-hidden lg:h-full">
      <div className="intro-bloom-warm" aria-hidden="true" />
      <div className="intro-bloom-rose" aria-hidden="true" />

      <div className="relative z-10 mx-auto flex w-full max-w-[480px] flex-1 flex-col">
        {/* Skip */}
        <div className="flex justify-end px-margin-mobile pt-md">
          <button
            onClick={finish}
            className="h-touch-target rounded-full px-sm font-body-md text-body-md text-on-surface-variant transition-colors hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {t("intro.skip")}
          </button>
        </div>

        {/* Slides */}
        <div
          ref={trackRef}
          onScroll={onScroll}
          className="no-scrollbar flex flex-1 snap-x snap-mandatory overflow-x-auto overscroll-x-contain"
        >
          {SLIDES.map((s, i) => (
            <section
              key={s.title}
              aria-roledescription="slide"
              aria-label={`${i + 1} / ${SLIDES.length}`}
              className="flex w-full shrink-0 snap-center flex-col items-center justify-center px-xl text-center"
            >
              <div
                className="flex h-[76px] w-[76px] items-center justify-center rounded-[24px] shadow-[0_14px_30px_-10px_rgba(176,31,146,0.45)]"
                style={{ background: s.tile }}
              >
                <span
                  className="material-symbols-outlined text-[36px] text-white"
                  data-weight="fill"
                  aria-hidden="true"
                >
                  {s.icon}
                </span>
              </div>
              <h1 className="mt-lg font-display-lg text-headline-md font-bold tracking-tight text-on-surface">
                {t(s.title)}
              </h1>
              <p className="mt-sm max-w-[320px] font-body-md text-body-md text-on-surface-variant">
                {t(s.body)}
              </p>
            </section>
          ))}
        </div>

        {/* Pager */}
        <div className="flex justify-center gap-2 pb-lg" role="tablist" aria-label="Slides">
          {SLIDES.map((s, i) => (
            <button
              key={s.title}
              role="tab"
              aria-selected={i === index}
              aria-label={`${i + 1} / ${SLIDES.length}`}
              onClick={() => goTo(i)}
              className={`h-1.5 rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                i === index ? "intro-dot-on w-6" : "w-1.5 bg-outline-variant"
              }`}
            />
          ))}
        </div>

        {/* CTA */}
        <div className="px-margin-mobile pb-xl">
          <button
            onClick={() => (isLast ? finish() : goTo(index + 1))}
            className="cta-gradient flex h-14 w-full items-center justify-center rounded-full font-headline-sm text-body-lg font-semibold text-white transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          >
            {isLast ? t("intro.getStarted") : t("intro.next")}
          </button>
        </div>
      </div>
    </div>
  );
}
