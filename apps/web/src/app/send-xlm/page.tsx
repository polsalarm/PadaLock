"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@/lib/wallet-context";
import { getXlmBalance, sendXlm } from "@/lib/balance";
import {
  BottomNav,
  Button,
  Card,
  Input,
  PageShell,
  StatusBadge,
  TopAppBar,
} from "@/components/ui";

type TxState =
  | { kind: "idle" }
  | { kind: "working"; step: string }
  | { kind: "success"; hash: string }
  | { kind: "error"; message: string };

export default function SendXlmPage() {
  const router = useRouter();
  const { state, signTxXdr } = useWallet();
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [xlm, setXlm] = useState<string>("—");
  const [tx, setTx] = useState<TxState>({ kind: "idle" });

  useEffect(() => {
    if (state.status !== "unlocked") {
      router.replace("/");
      return;
    }
    void getXlmBalance(state.publicKey).then(setXlm);
  }, [state, router]);

  if (state.status !== "unlocked") return null;
  const from = state.publicKey;

  async function submit() {
    if (!to.startsWith("G") || to.length !== 56) {
      setTx({ kind: "error", message: "Enter a valid Stellar address (G…)." });
      return;
    }
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      setTx({ kind: "error", message: "Enter an amount greater than 0." });
      return;
    }
    try {
      setTx({ kind: "working", step: "Signing with your wallet…" });
      const hash = await sendXlm({
        fromPublicKey: from,
        toPublicKey: to,
        amount,
        sign: signTxXdr,
      });
      setTx({ kind: "success", hash });
      void getXlmBalance(from).then(setXlm);
    } catch (e) {
      setTx({
        kind: "error",
        message: e instanceof Error ? e.message : "Transaction failed",
      });
    }
  }

  const busy = tx.kind === "working";

  return (
    <PageShell>
      <TopAppBar title="Send XLM" back={() => router.back()} />
      <main className="flex flex-1 flex-col gap-gutter px-margin-mobile pb-[100px] pt-md">
        {/* Balance */}
        <Card>
          <div className="font-label-caps text-label-caps uppercase text-on-surface-variant">
            Your XLM balance
          </div>
          <div className="mt-1 flex items-baseline gap-xs">
            <span className="font-currency-lg text-display-lg-mobile text-on-surface">
              {xlm}
            </span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              XLM
            </span>
          </div>
          <div className="mt-1 break-all font-currency-md text-[11px] text-on-surface-variant/60">
            {from}
          </div>
        </Card>

        {/* Form */}
        <Card className="flex flex-col gap-md">
          <Input
            label="Destination address"
            placeholder="G…"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
          <Input
            label="Amount (XLM)"
            inputMode="decimal"
            placeholder="0.0000000"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <Button onClick={submit} disabled={busy}>
            <span className="material-symbols-outlined" data-weight="fill">
              send
            </span>
            {busy ? "Sending…" : "Send XLM"}
          </Button>
        </Card>

        {/* Feedback */}
        {tx.kind === "working" && (
          <Card>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              {tx.step}
            </p>
          </Card>
        )}

        {tx.kind === "success" && (
          <Card className="border-tertiary/30">
            <div className="mb-2 flex items-center gap-sm">
              <StatusBadge variant="claimed">
                <span
                  className="material-symbols-outlined text-[14px]"
                  data-weight="fill"
                >
                  check_circle
                </span>
                Success
              </StatusBadge>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface">
              Payment confirmed on testnet.
            </p>
            <div className="mt-2 font-label-caps text-label-caps uppercase text-on-surface-variant">
              Transaction hash
            </div>
            <div className="mt-1 break-all font-currency-md text-[12px] text-primary">
              {tx.hash}
            </div>
            <a
              href={`https://stellar.expert/explorer/testnet/tx/${tx.hash}`}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-1 font-label-caps text-label-caps uppercase text-primary underline"
            >
              <span className="material-symbols-outlined text-[16px]">
                open_in_new
              </span>
              View on Stellar Expert
            </a>
          </Card>
        )}

        {tx.kind === "error" && (
          <Card className="border-error/30">
            <div className="mb-2 flex items-center gap-sm">
              <StatusBadge variant="restricted">
                <span
                  className="material-symbols-outlined text-[14px]"
                  data-weight="fill"
                >
                  error
                </span>
                Failed
              </StatusBadge>
            </div>
            <p className="font-body-sm text-body-sm text-error">{tx.message}</p>
          </Card>
        )}
      </main>
      <BottomNav />
    </PageShell>
  );
}
