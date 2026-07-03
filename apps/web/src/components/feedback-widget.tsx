"use client";

/**
 * Floating feedback widget (Level 4 "basic user feedback collection").
 * Star rating + optional message. Submits to /api/feedback and fires the
 * `feedback_submitted` analytics event so ratings show up in Vercel Analytics.
 * App-wide; dismissible; localStorage remembers a submit so we don't nag.
 */

import { useEffect, useState } from "react";
import { track } from "@/lib/analytics";
import { useWallet } from "@/lib/wallet-context";

const DONE_KEY = "padalock.feedback.done.v1";

export function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [hidden, setHidden] = useState(true);

  const { state } = useWallet();
  const address = state.status === "unlocked" ? state.publicKey : undefined;

  useEffect(() => {
    // Hide the launcher entirely once the user has given feedback.
    setHidden(localStorage.getItem(DONE_KEY) === "1");
  }, []);

  async function submit() {
    if (rating < 1) return;
    setBusy(true);
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, message, address }),
      });
    } catch {
      // best-effort; still record locally + in analytics
    }
    track("feedback_submitted", { rating });
    localStorage.setItem(DONE_KEY, "1");
    setBusy(false);
    setDone(true);
    setTimeout(() => {
      setOpen(false);
      setHidden(true);
    }, 1400);
  }

  if (hidden && !open) return null;

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
            className="w-full max-w-sm rounded-2xl border border-surface-variant/50 bg-surface-container-lowest p-lg shadow-[0_16px_40px_rgba(0,0,0,0.18)]"
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
                <div className="mb-sm flex items-center justify-between">
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

                <div className="mb-md flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      aria-label={`${n} star${n > 1 ? "s" : ""}`}
                      onClick={() => setRating(n)}
                      className="transition-transform active:scale-90"
                    >
                      <span
                        className={`material-symbols-outlined text-[32px] ${
                          n <= rating
                            ? "text-secondary"
                            : "text-outline-variant"
                        }`}
                        data-weight={n <= rating ? "fill" : undefined}
                      >
                        star
                      </span>
                    </button>
                  ))}
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
                  disabled={rating < 1 || busy}
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
