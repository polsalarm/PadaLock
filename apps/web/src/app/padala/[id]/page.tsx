"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  contractIdFor,
  getPadala,
  parseAsset,
  type PadalaView,
} from "@padalock/sdk";
import { useWallet } from "@/lib/wallet-context";
import { fmtStroops, fmtStroopsPhp } from "@/lib/balance";
import {
  Card,
  PageShell,
  StatusBadge,
  TopAppBar,
} from "@/components/ui";

const CATEGORY_EMOJI: Record<string, string> = {
  Tuition: "🎓",
  Utility: "💡",
  Medical: "🏥",
  Groceries: "🛒",
  FreeCash: "💵",
};

function shorten(a: string): string {
  return `${a.slice(0, 6)}…${a.slice(-6)}`;
}

export default function PadalaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const asset = parseAsset(searchParams.get("asset"));
  const contractId = contractIdFor(asset);
  const isXlm = asset === "XLM";
  const { state } = useWallet();
  const [padala, setPadala] = useState<PadalaView | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (caller: string) => {
      setError(null);
      try {
        setPadala(await getPadala(caller, id, contractId));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load.");
      }
    },
    [id, contractId]
  );

  useEffect(() => {
    if (state.status !== "unlocked") {
      router.replace("/");
      return;
    }
    void load(state.publicKey);
  }, [state, router, load]);

  if (state.status !== "unlocked") return null;

  const totalUsdc = padala
    ? padala.buckets.reduce((acc, b) => acc + BigInt(b.amount), 0n).toString()
    : "0";
  const claimedUsdc = padala
    ? padala.buckets
        .filter((b) => b.claimed)
        .reduce((acc, b) => acc + BigInt(b.amount), 0n)
        .toString()
    : "0";
  const showAmt = (stroops: string) =>
    isXlm ? `${fmtStroops(stroops)} XLM` : `₱${fmtStroopsPhp(stroops)}`;
  const pct =
    BigInt(totalUsdc) > 0n
      ? Number((BigInt(claimedUsdc) * 1000n) / BigInt(totalUsdc)) / 10
      : 0;
  const circumference = 2 * Math.PI * 60;
  const dashOffset = circumference * (1 - pct / 100);

  return (
    <PageShell>
      <TopAppBar title={`Padala #${id}`} back={() => router.back()} />
      <main className="flex flex-1 flex-col gap-gutter px-margin-mobile py-md">
        {error && (
          <Card>
            <p className="font-body-sm text-body-sm text-error">{error}</p>
          </Card>
        )}

        {padala && (
          <>
            <Card className="flex flex-col items-center py-lg text-center">
              <div className="relative h-[140px] w-[140px]">
                <svg
                  className="absolute inset-0 -rotate-90"
                  viewBox="0 0 140 140"
                >
                  <circle
                    cx="70"
                    cy="70"
                    r="60"
                    fill="none"
                    stroke="var(--color-surface-variant)"
                    strokeWidth="10"
                  />
                  <circle
                    cx="70"
                    cy="70"
                    r="60"
                    fill="none"
                    stroke="var(--color-tertiary-container)"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={dashOffset}
                    style={{ transition: "stroke-dashoffset 0.8s ease" }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-display-lg text-[28px] font-bold text-on-surface">
                    {pct.toFixed(0)}%
                  </span>
                  <span className="font-label-caps text-label-caps uppercase text-on-surface-variant">
                    Claimed
                  </span>
                </div>
              </div>
              <div className="mt-md flex w-full items-end justify-between px-md">
                <div>
                  <div className="font-label-caps text-label-caps uppercase text-on-surface-variant">
                    Sent
                  </div>
                  <div className="font-currency-lg text-currency-lg text-on-surface">
                    {showAmt(totalUsdc)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-label-caps text-label-caps uppercase text-on-surface-variant">
                    Claimed
                  </div>
                  <div className="font-currency-lg text-currency-lg text-tertiary-container">
                    {showAmt(claimedUsdc)}
                  </div>
                </div>
              </div>
              <p className="mt-sm font-body-sm text-body-sm text-on-surface-variant">
                {(() => {
                  const rs = [...new Set(padala.buckets.map((b) => b.recipient))];
                  return `To ${shorten(rs[0] ?? "")}${
                    rs.length > 1 ? ` +${rs.length - 1} more` : ""
                  }`;
                })()}
                {padala.recurringId > 0 && (
                  <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-secondary-fixed/30 px-2 py-0.5 font-label-caps text-[10px] uppercase text-on-secondary-fixed-variant">
                    <span className="material-symbols-outlined text-[12px]">event_repeat</span>
                    recurring #{padala.recurringId}
                  </span>
                )}
              </p>
            </Card>

            <h2 className="px-xs font-headline-sm text-headline-sm text-on-surface">
              Per-bucket release log
            </h2>

            <div className="flex flex-col gap-sm">
              {padala.buckets.map((b) => (
                <Card key={b.id}>
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-sm">
                      <span className="text-[24px]">
                        {CATEGORY_EMOJI[b.category]}
                      </span>
                      <span className="font-headline-sm text-[16px] text-on-surface">
                        {b.category}
                      </span>
                    </div>
                    {b.claimed ? (
                      <StatusBadge variant="claimed">
                        <span
                          className="material-symbols-outlined text-[14px]"
                          data-weight="fill"
                        >
                          check
                        </span>
                        Claimed
                      </StatusBadge>
                    ) : (
                      <StatusBadge variant="neutral">
                        <span className="material-symbols-outlined text-[14px]">
                          lock
                        </span>
                        Locked
                      </StatusBadge>
                    )}
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="font-currency-lg text-currency-lg text-on-surface">
                      {showAmt(b.amount)}
                    </span>
                    {!isXlm && (
                      <span className="ml-2 font-currency-md text-[12px] text-on-surface-variant/60">
                        {fmtStroops(b.amount)} USDC
                      </span>
                    )}
                  </div>
                  {b.claimed && (
                    <p className="mt-2 font-currency-md text-[12px] text-tertiary-container">
                      → Released to {shorten(b.claimedBy ?? "")}
                    </p>
                  )}
                </Card>
              ))}
            </div>

            <button
              onClick={() => load(state.publicKey)}
              className="mt-md font-label-caps text-label-caps uppercase text-primary"
            >
              Refresh
            </button>
          </>
        )}
      </main>
    </PageShell>
  );
}
