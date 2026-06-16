"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@/lib/wallet-context";
import {
  buildCreatePadala,
  pollFinality,
  submitSignedXdr,
  type BucketCategory,
} from "@padalock/sdk";
import { phpToUsdcHuman, toStroops } from "@/lib/balance";
import { recordSentPadala } from "@/lib/history";
import {
  BottomNav,
  Card,
  PageShell,
  TopAppBar,
} from "@/components/ui";

const CATEGORIES: {
  key: BucketCategory;
  emoji: string;
  en: string;
  tl: string;
}[] = [
  { key: "Tuition", emoji: "🎓", en: "Tuition", tl: "Pang-aral" },
  { key: "Utility", emoji: "💡", en: "Utility", tl: "Bayarin" },
  { key: "Medical", emoji: "🏥", en: "Medical", tl: "Medikal" },
  { key: "Groceries", emoji: "🛒", en: "Groceries", tl: "Pamilihan" },
  { key: "FreeCash", emoji: "💵", en: "Free Cash", tl: "Allowance" },
];

type Allocations = Record<BucketCategory, string>;

const EMPTY: Allocations = {
  Tuition: "",
  Utility: "",
  Medical: "",
  Groceries: "",
  FreeCash: "",
};

function ClaimLinkShare({ padalaId }: { padalaId: string }) {
  const [copied, setCopied] = useState(false);
  const claimUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/claim/${padalaId}`
      : `/claim/${padalaId}`;

  return (
    <div className="mt-sm rounded-lg bg-surface-container-low p-sm">
      <div className="font-label-caps text-label-caps uppercase text-on-surface-variant">
        Share this claim link with your family
      </div>
      <div className="mt-1 break-all font-currency-md text-[12px] text-primary">
        {claimUrl}
      </div>
      <div className="mt-sm flex gap-sm">
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

export default function SendPage() {
  const router = useRouter();
  const { state, signTxXdr } = useWallet();
  const [recipient, setRecipient] = useState("");
  const [alloc, setAlloc] = useState<Allocations>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [resultId, setResultId] = useState<string | null>(null);

  if (state.status !== "unlocked") {
    if (typeof window !== "undefined") router.replace("/");
    return null;
  }

  const totalPhp = CATEGORIES.reduce((acc, c) => {
    const n = parseFloat(alloc[c.key] || "0");
    return acc + (isNaN(n) ? 0 : n);
  }, 0);

  function setAmt(key: BucketCategory, v: string) {
    setAlloc({ ...alloc, [key]: v });
  }

  async function submit() {
    if (state.status !== "unlocked") return;
    const buckets = CATEGORIES.filter(
      (c) => parseFloat(alloc[c.key] || "0") > 0
    ).map((c) => ({
      category: c.key,
      amount: toStroops(String(phpToUsdcHuman(alloc[c.key]))),
    }));
    if (buckets.length === 0) {
      setStatus("Allocate at least one bucket.");
      return;
    }
    if (!recipient.startsWith("G") || recipient.length !== 56) {
      setStatus("Recipient must be a valid Stellar public key (G...).");
      return;
    }

    setBusy(true);
    setStatus("Simulating…");
    setResultId(null);
    try {
      const { tx } = await buildCreatePadala({
        senderPub: state.publicKey,
        recipientPub: recipient,
        buckets,
      });
      setStatus("Signing with your wallet…");
      const signedXdr = await signTxXdr(tx.toXDR());
      setStatus("Submitting…");
      const hash = await submitSignedXdr(signedXdr);
      setStatus("Polling for finality…");
      const r = await pollFinality(hash);
      if (r.status === "SUCCESS") {
        // Contract returns the padala id (u64 -> bigint). Decode robustly.
        const native = r.returnNative;
        const id =
          typeof native === "bigint"
            ? native.toString()
            : typeof native === "number"
              ? String(native)
              : typeof native === "string" && /^\d+$/.test(native)
                ? native
                : null;
        if (id) {
          setStatus("Padala sent and locked in escrow.");
          setResultId(id);
          recordSentPadala(state.publicKey, id);
        } else {
          setStatus(`Sent (tx ${hash.slice(0, 8)}…) — open Track releases to find it.`);
          setResultId(null);
        }
      } else {
        setStatus(`Failed: ${r.status}`);
      }
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageShell>
      <TopAppBar title="Send Padala" back={() => router.back()} />
      <main className="flex flex-1 flex-col gap-lg overflow-y-auto px-margin-mobile pb-[240px] pt-md">
        {/* Recipient */}
        <section>
          <label className="mb-xs block font-label-caps text-label-caps uppercase text-on-surface-variant">
            Send to
          </label>
          <div className="flex items-center rounded-xl border border-surface-variant bg-surface-container-lowest p-sm shadow-[0_4px_12px_rgba(0,0,0,0.04)] focus-within:border-primary-container">
            <div className="mr-sm flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary-container text-on-secondary-container">
              <span className="material-symbols-outlined">person</span>
            </div>
            <input
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="G… (Stellar public key)"
              className="flex-1 border-none bg-transparent font-currency-md text-[14px] text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none"
            />
          </div>
        </section>

        {/* Allocator */}
        <div className="flex items-end justify-between px-xs">
          <h2 className="font-headline-sm text-headline-sm text-on-surface">
            Allocate Funds
          </h2>
          <span className="font-label-caps text-label-caps uppercase text-on-surface-variant">
            Total ₱{totalPhp.toFixed(2)}
          </span>
        </div>

        <div className="flex flex-col gap-gutter">
          {CATEGORIES.map((c) => {
            const usdc = phpToUsdcHuman(alloc[c.key] || "0").toFixed(4);
            return (
              <Card key={c.key} className="flex flex-col gap-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-sm">
                    <span className="text-[32px] leading-none">{c.emoji}</span>
                    <div>
                      <h3 className="font-headline-sm text-headline-sm text-on-surface">
                        {c.en}
                      </h3>
                      <span className="font-body-sm text-body-sm text-on-surface-variant">
                        {c.tl}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-surface-container-low p-sm focus-within:ring-2 focus-within:ring-primary/20">
                  <span className="pl-xs font-currency-md text-currency-md text-on-surface-variant">
                    ₱
                  </span>
                  <input
                    inputMode="decimal"
                    placeholder="0.00"
                    value={alloc[c.key]}
                    onChange={(e) => setAmt(c.key, e.target.value)}
                    className="mx-xs w-full border-none bg-transparent p-0 text-right font-currency-lg text-currency-lg text-on-surface focus:outline-none"
                  />
                </div>
                <div className="text-right font-currency-md text-[12px] text-on-surface-variant/70">
                  ≈ {usdc} USDC
                </div>
              </Card>
            );
          })}
        </div>

        {/* Trust disclosure */}
        <details className="rounded-xl border border-outline-variant bg-surface-container-low p-md">
          <summary className="flex cursor-pointer list-none items-center justify-between font-body-md text-body-md text-on-surface [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-xs">
              <span
                className="material-symbols-outlined text-tertiary-container"
                data-weight="fill"
              >
                shield
              </span>
              <span className="font-headline-sm text-[16px]">Why this is safe</span>
            </span>
            <span className="material-symbols-outlined text-on-surface-variant transition-transform group-open:rotate-180">
              expand_more
            </span>
          </summary>
          <p className="mt-sm border-t border-outline-variant/30 pt-xs font-body-sm text-body-sm text-on-surface-variant">
            Ang pera mo ay naka-lock sa layunin nito at protektado ng smart
            contract. Restricted bucket ay para lamang sa whitelisted na
            merchants — paaralan, klinika, biller. Free Cash ay walang
            restriction.
          </p>
        </details>

        {status && (
          <Card>
            <p className="font-body-sm text-body-sm text-on-surface">{status}</p>
            {resultId && <ClaimLinkShare padalaId={resultId} />}
          </Card>
        )}
      </main>

      {/* Action footer — sits ABOVE the bottom nav (nav h-72px) */}
      <div className="fixed inset-x-0 bottom-[72px] z-40 mx-auto w-full max-w-[480px] rounded-t-xl bg-surface-container shadow-[0_-8px_20px_rgba(93,5,24,0.08)] pt-xs">
        <div className="px-margin-mobile pb-sm">
          <div className="mb-sm flex items-center justify-between px-xs">
            <span className="font-body-md text-body-md text-on-surface-variant">
              Total Allocation
            </span>
            <span className="font-currency-lg text-currency-lg text-on-surface">
              ₱ {totalPhp.toFixed(2)}
            </span>
          </div>
          <button
            onClick={submit}
            disabled={busy || totalPhp <= 0}
            className="flex h-[56px] w-full items-center justify-center gap-xs rounded-full bg-secondary-container font-headline-md text-[18px] text-on-secondary-container transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="material-symbols-outlined" data-weight="fill">
              lock
            </span>
            {busy ? "Sending…" : "Lock & Send"}
          </button>
        </div>
      </div>
      <BottomNav />
    </PageShell>
  );
}
