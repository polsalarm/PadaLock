"use client";

/**
 * Floating feedback widget (Level 4 "basic user feedback collection").
 * Rates four dimensions (technical complexity, product quality, architecture
 * quality, real-world usefulness) plus an overall score, with an optional
 * message. Submits to /api/feedback and fires the `feedback_submitted`
 * analytics event so ratings show up in Vercel Analytics.
 * App-wide but dashboard-only; dismissible; localStorage remembers a submit
 * so we don't nag.
 */

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { track } from "@/lib/analytics";
import { useWallet } from "@/lib/wallet-context";

// Scoped per wallet address so each wallet is asked once (localStorage is
// shared across wallets in the same browser, so a single flag would suppress
// the widget for every other wallet too).
const doneKey = (address: string) => `padalock.feedback.done.v1:${address}`;

const CATEGORIES = [
  { key: "technical", label: "Technical complexity" },
  { key: "product", label: "Product quality" },
  { key: "architecture", label: "Architecture quality" },
  { key: "usefulness", label: "Real-world usefulness" },
  { key: "overall", label: "Overall" },
] as const;

type CategoryKey = (typeof CATEGORIES)[number]["key"];
type Ratings = Record<CategoryKey, number>;

const EMPTY_RATINGS: Ratings = {
  technical: 0,
  product: 0,
  architecture: 0,
  usefulness: 0,
  overall: 0,
};

export function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [ratings, setRatings] = useState<Ratings>(EMPTY_RATINGS);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [hidden, setHidden] = useState(true);

  const { state } = useWallet();
  const address = state.status === "unlocked" ? state.publicKey : undefined;
  const pathname = usePathname();
  // "/" is the splash/loading screen (redirects to /dashboard once wallet
  // state resolves). Never surface the launcher there or on auth screens.
  const onAppScreen =
    pathname !== "/" && pathname !== "/login" && pathname !== "/onboard";

  useEffect(() => {
    // Re-evaluate per wallet: hide only if *this* address already submitted.
    // Reset the transient form so a freshly-switched wallet gets a clean sheet.
    if (!address) {
      setHidden(true);
      return;
    }
    setHidden(localStorage.getItem(doneKey(address)) === "1");
    setDone(false);
    setRatings(EMPTY_RATINGS);
    setMessage("");
  }, [address]);

  function setRating(key: CategoryKey, value: number) {
    setRatings((prev) => ({ ...prev, [key]: value }));
  }

  async function submit() {
    if (ratings.overall < 1) return;
    setBusy(true);
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // `rating` kept as overall for backward compatibility.
        body: JSON.stringify({
          rating: ratings.overall,
          ratings,
          message,
          address,
        }),
      });
    } catch {
      // best-effort; still record locally + in analytics
    }
    track("feedback_submitted", {
      rating: ratings.overall,
      technical: ratings.technical,
      product: ratings.product,
      architecture: ratings.architecture,
      usefulness: ratings.usefulness,
    });
    if (address) localStorage.setItem(doneKey(address), "1");
    setBusy(false);
    setDone(true);
    setTimeout(() => {
      setOpen(false);
      setHidden(true);
    }, 1400);
  }

  // Only surface the launcher on the dashboard (unlocked). Keep off the
  // loading / onboarding screens. Stay mounted while the sheet is open.
  if (
    (hidden || state.status !== "unlocked" || !onAppScreen) &&
    !open
  )
    return null;

  return (
    <>
      {!open && (
        <button
          aria-label="Send feedback"
          onClick={() => setOpen(true)}
          className="fixed bottom-24 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-secondary-container text-on-secondary-container shadow-[0_8px_20px_rgba(93,5,24,0.18)] transition-transform active:scale-90"
        >
          <span className="material-symbols-outlined" data-weight="fill">
            reviews
          </span>
        </button>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          onClick={() => !busy && setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] w-full max-w-[400px] overflow-y-auto rounded-2xl border border-surface-variant/50 bg-surface-container-lowest p-lg shadow-[0_16px_40px_rgba(0,0,0,0.18)]"
          >
            {done ? (
              <div className="flex flex-col items-center gap-sm py-md text-center">
                <span
                  className="material-symbols-outlined text-[40px] text-primary"
                  data-weight="fill"
                >
                  favorite
                </span>
                <p className="font-headline-sm text-headline-sm text-on-surface">
                  Salamat! 🙏
                </p>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Your feedback helps us build PadaLock.
                </p>
              </div>
            ) : (
              <>
                <div className="mb-md flex items-center justify-between">
                  <h2 className="font-headline-sm text-headline-sm text-on-surface">
                    How was it?
                  </h2>
                  <button
                    aria-label="Close"
                    onClick={() => setOpen(false)}
                    className="text-on-surface-variant"
                  >
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>

                <div className="mb-md flex flex-col gap-sm">
                  {CATEGORIES.map(({ key, label }) => {
                    const value = ratings[key];
                    const isOverall = key === "overall";
                    return (
                      <div
                        key={key}
                        className={`flex items-center justify-between gap-sm ${
                          isOverall
                            ? "mt-xs border-t border-outline-variant/50 pt-sm"
                            : ""
                        }`}
                      >
                        <span
                          className={`font-body-sm text-body-sm ${
                            isOverall
                              ? "font-headline-sm text-on-surface"
                              : "text-on-surface-variant"
                          }`}
                        >
                          {label}
                        </span>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <button
                              key={n}
                              aria-label={`${label}: ${n} star${
                                n > 1 ? "s" : ""
                              }`}
                              onClick={() => setRating(key, n)}
                              className="transition-transform active:scale-90"
                            >
                              <span
                                className={`material-symbols-outlined text-[26px] ${
                                  n <= value
                                    ? "text-secondary"
                                    : "text-outline-variant"
                                }`}
                                data-weight={n <= value ? "fill" : undefined}
                              >
                                star
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Anything we should fix or add? (optional)"
                  rows={3}
                  maxLength={1000}
                  className="mb-md w-full resize-none rounded-lg border border-outline-variant bg-surface px-md py-sm font-body-md text-body-md text-on-surface outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
                />

                <button
                  disabled={ratings.overall < 1 || busy}
                  onClick={submit}
                  className="flex h-[52px] w-full items-center justify-center gap-sm rounded-full bg-primary font-headline-sm text-headline-sm text-on-primary transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busy ? "Sending…" : "Send feedback"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
