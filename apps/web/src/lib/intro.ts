"use client";

/** One-shot flag: the intro carousel is shown once per device, then never again. */

const INTRO_KEY = "padalock.intro.v1";

export function hasSeenIntro(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(INTRO_KEY) === "1";
}

export function markIntroSeen(): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(INTRO_KEY, "1");
}
