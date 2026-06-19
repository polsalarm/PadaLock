"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

/**
 * Shareable claim deep-link for a padala.
 *
 * Why a plain https deep-link (not a SEP-7 `web+stellar:` tx URI): the on-chain
 * `claim` call requires the *recipient's* own `require_auth`. A SEP-7 tx URI is
 * built + signed by whoever opens it, so it cannot carry a claim the family must
 * authorize with their key. The correct "deep link" is the claim page URL — the
 * family opens it, logs into their own wallet, then claims. We pair it with a QR
 * (scan on the family phone) and the native Share sheet (send via Messenger/SMS),
 * which is what actually gets a low-tech recipient into the flow.
 */
export function ClaimShare({ padalaId }: { padalaId: string }) {
  const [copied, setCopied] = useState(false);
  const [qrSvg, setQrSvg] = useState<string | null>(null);
  const [canShare, setCanShare] = useState(false);

  const claimUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/claim/${padalaId}`
      : `/claim/${padalaId}`;

  useEffect(() => {
    setCanShare(
      typeof navigator !== "undefined" && typeof navigator.share === "function"
    );
    QRCode.toString(claimUrl, {
      type: "svg",
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#5d0518", light: "#00000000" },
    })
      .then(setQrSvg)
      .catch(() => setQrSvg(null));
  }, [claimUrl]);

  async function share() {
    try {
      await navigator.share({
        title: "PadaLock",
        text: "May padala ka! I-claim mo dito:",
        url: claimUrl,
      });
    } catch {
      /* user dismissed share sheet — ignore */
    }
  }

  return (
    <div className="mt-sm rounded-lg bg-surface-container-low p-sm">
      <div className="font-label-caps text-label-caps uppercase text-on-surface-variant">
        Share this claim link with your family
      </div>

      {/* QR — family scans on their phone to open the claim page */}
      {qrSvg && (
        <div className="mt-sm flex flex-col items-center gap-1">
          <div
            className="h-40 w-40 rounded-lg bg-surface-container-lowest p-2"
            // qrcode emits a self-contained <svg>; safe, locally generated markup
            dangerouslySetInnerHTML={{ __html: qrSvg }}
          />
          <span className="font-label-caps text-[10px] uppercase text-on-surface-variant/60">
            Scan to open
          </span>
        </div>
      )}

      <div className="mt-1 break-all font-currency-md text-[12px] text-primary">
        {claimUrl}
      </div>

      <div className="mt-sm flex flex-wrap gap-sm">
        <button
          onClick={async () => {
            await navigator.clipboard.writeText(claimUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="flex items-center gap-1 rounded-full bg-primary px-md py-xs font-label-caps text-label-caps uppercase text-on-primary"
        >
          <span className="material-symbols-outlined text-[16px]">
            {copied ? "check" : "content_copy"}
          </span>
          {copied ? "Copied" : "Copy link"}
        </button>

        {canShare && (
          <button
            onClick={share}
            className="flex items-center gap-1 rounded-full bg-secondary-container px-md py-xs font-label-caps text-label-caps uppercase text-on-secondary-container"
          >
            <span className="material-symbols-outlined text-[16px]">share</span>
            Share
          </button>
        )}

        <a
          href={`/padala/${padalaId}`}
          className="flex items-center gap-1 rounded-full border border-outline-variant px-md py-xs font-label-caps text-label-caps uppercase text-on-surface"
        >
          <span className="material-symbols-outlined text-[16px]">
            visibility
          </span>
          Track releases
        </a>
      </div>
    </div>
  );
}
