"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  buildCancelRecurring,
  buildExecuteDue,
  getRecurring,
  pollFinality,
  submitSignedXdr,
  type RecurringView,
} from "@padalock/sdk";
import { useWallet } from "@/lib/wallet-context";
import { fmtStroops, fmtStroopsPhp } from "@/lib/balance";
import { Button, Card, PageShell, StatusBadge, TopAppBar } from "@/components/ui";

const CAT_EMOJI: Record<string, string> = {
  Tuition: "🎓",
  Utility: "💡",
  Medical: "🏥",
  Groceries: "🛒",
  FreeCash: "💵",
};

function shorten(a: string): string {
  return `${a.slice(0, 6)}…${a.slice(-6)}`;
}

export default function RecurringPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { state, signTxXdr } = useWallet();
  const [rec, setRec] = useState<RecurringView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const load = useCallback(
    async (caller: string) => {
      setLoading(true);
      setError(null);
      try {
        setRec(await getRecurring(caller, id));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load schedule.");
      } finally {
        setLoading(false);
      }
    },
    [id]
  );

  useEffect(() => {
    if (state.status === "no-wallet") {
      router.replace(`/onboard?next=/recurring/${id}`);
      return;
    }
    if (state.status === "locked") {
      router.replace(`/login?next=/recurring/${id}`);
      return;
    }
    if (state.status === "unlocked") void load(state.publicKey);
  }, [state, id, router, load]);

  if (state.status !== "unlocked") return null;
  const publicKey = state.publicKey;
  const isSender = rec && rec.sender === publicKey;
  const nowSec = Math.floor(Date.now() / 1000);
  const due = rec ? rec.active && rec.remaining > 0 && nowSec >= rec.nextRun : false;

  async function run(
    build: () => Promise<{ tx: { toXDR(): string } }>,
    working: string,
    ok: string
  ) {
    setBusy(true);
    setStatus(working);
    try {
      const { tx } = await build();
      const signed = await signTxXdr(tx.toXDR());
      const hash = await submitSignedXdr(signed);
      const r = await pollFinality(hash);
      if (r.status === "SUCCESS") {
        setStatus(ok);
        await load(publicKey);
      } else {
        setStatus(`Failed: ${r.status}`);
      }
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageShell>
      <TopAppBar title="Recurring Padala" back={() => router.back()} />
      <main className="flex flex-1 flex-col gap-gutter px-margin-mobile pb-[120px] pt-md">
        {loading && (
          <Card>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Loading schedule…
            </p>
          </Card>
        )}

        {error && (
          <Card>
            <p className="font-body-sm text-body-sm text-error">{error}</p>
            <button
              onClick={() => load(publicKey)}
              className="mt-2 font-label-caps text-label-caps uppercase text-primary"
            >
              Retry
            </button>
          </Card>
        )}

        {rec && (
          <>
            <section className="flex flex-col items-center py-md text-center">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-secondary-fixed/30 px-3 py-1">
                <span className="material-symbols-outlined text-secondary text-sm" data-weight="fill">
                  event_repeat
                </span>
                <span className="font-label-caps text-label-caps uppercase text-on-secondary-fixed-variant">
                  Monthly schedule #{rec.id}
                </span>
              </div>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="font-currency-md text-currency-md text-on-surface">₱</span>
                <span className="font-currency-lg text-[40px] font-bold leading-[48px] tracking-tight text-on-surface">
                  {fmtStroopsPhp(rec.perRunTotal)}
                </span>
                <span className="ml-1 font-body-md text-body-md text-on-surface-variant">/mo</span>
              </div>
              <p className="mt-1 font-currency-md text-[12px] text-on-surface-variant/60">
                {fmtStroops(rec.perRunTotal)} USDC each run
              </p>
            </section>

            <Card className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-label-caps text-label-caps uppercase text-on-surface-variant">
                  Status
                </span>
                {rec.active ? (
                  <StatusBadge variant="ready">Active</StatusBadge>
                ) : (
                  <StatusBadge variant="claimed">Finished</StatusBadge>
                )}
              </div>
              <Row label="Runs left" value={String(rec.remaining)} />
              <Row label="Still escrowed" value={`₱ ${fmtStroopsPhp(rec.prefunded)}`} />
              <Row
                label="Next run"
                value={
                  !rec.active
                    ? "—"
                    : due
                      ? "Due now"
                      : new Date(rec.nextRun * 1000).toLocaleString()
                }
              />
              <Row label="Sender" value={shorten(rec.sender)} mono />
            </Card>

            <Card className="space-y-2">
              <span className="font-label-caps text-label-caps uppercase text-on-surface-variant">
                Each run releases
              </span>
              {rec.template.map((t, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="flex items-center gap-2 font-body-sm text-body-sm text-on-surface">
                    <span>{CAT_EMOJI[t.category] ?? "💵"}</span>
                    {t.category}
                    <span className="text-on-surface-variant/60">→ {shorten(t.recipient)}</span>
                  </span>
                  <span className="font-currency-md text-[13px] text-on-surface">
                    ₱ {fmtStroopsPhp(t.amount)}
                  </span>
                </div>
              ))}
            </Card>

            {status && (
              <Card>
                <p className="font-body-sm text-body-sm text-on-surface">{status}</p>
              </Card>
            )}

            {rec.active && (
              <div className="flex flex-col gap-sm">
                <Button
                  variant="golden"
                  disabled={busy || !due}
                  onClick={() =>
                    run(
                      () => buildExecuteDue({ callerPub: publicKey, recId: rec.id }),
                      "Releasing this month's run…",
                      "Released. A new padala was minted for the family."
                    )
                  }
                >
                  <span className="material-symbols-outlined" data-weight="fill">
                    play_circle
                  </span>
                  {due ? "Release next run now" : "Next run not due yet"}
                </Button>

                {isSender && (
                  <Button
                    variant="ghost"
                    disabled={busy}
                    onClick={() =>
                      run(
                        () => buildCancelRecurring({ senderPub: publicKey, recId: rec.id }),
                        "Cancelling and refunding…",
                        "Cancelled. Unspent prefund refunded to your wallet."
                      )
                    }
                  >
                    <span className="material-symbols-outlined">cancel</span>
                    Cancel & refund remaining
                  </Button>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </PageShell>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="font-body-sm text-body-sm text-on-surface-variant">{label}</span>
      <span
        className={`text-right font-body-sm text-body-sm text-on-surface ${
          mono ? "font-currency-md text-[12px]" : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}
