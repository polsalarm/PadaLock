"use client";

import { useState } from "react";
import {
  authenticate,
  fetchAnchorInfo,
  pollWithdraw,
  startWithdraw,
  type AnchorInfo,
  type Sep24Transaction,
} from "@padalock/sdk";
import { Button } from "@/components/ui";

type Phase =
  | "idle"
  | "discovering"
  | "authenticating"
  | "starting"
  | "interactive"
  | "polling"
  | "ready"
  | "done"
  | "error";

const PHASE_LABEL: Record<Phase, string> = {
  idle: "",
  discovering: "Finding anchor…",
  authenticating: "Authenticating (SEP-10)…",
  starting: "Opening cash-out…",
  interactive: "Complete the form in the anchor window…",
  polling: "Waiting for the anchor…",
  ready: "Anchor is ready for your transfer",
  done: "Cash-out complete",
  error: "Something went wrong",
};

/**
 * Real SEP-24 withdraw off-ramp. The FreeCash bucket is first claimed to the
 * recipient's own wallet; this turns that USDC into a PHP pickup via the anchor.
 *
 * Flow: SEP-1 toml -> SEP-10 web auth (wallet signs challenge) -> SEP-24
 * interactive withdraw (anchor popup for amount + KYC) -> poll until the anchor
 * is ready, then show the anchor account / memo / payout amount.
 */
export function Sep24CashOut({
  account,
  signTxXdr,
}: {
  account: string;
  signTxXdr: (xdr: string) => Promise<string>;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [anchor, setAnchor] = useState<AnchorInfo | null>(null);
  const [tx, setTx] = useState<Sep24Transaction | null>(null);

  async function run() {
    setError(null);
    try {
      setPhase("discovering");
      const info = await fetchAnchorInfo();
      setAnchor(info);

      setPhase("authenticating");
      const token = await authenticate(info, account, signTxXdr);

      setPhase("starting");
      const { url, id } = await startWithdraw(info, token, account);

      // Open the anchor's interactive form. Popup may be blocked — fall back to
      // a same-tab link the user can click.
      setPhase("interactive");
      const popup = window.open(url, "padalock-sep24", "width=420,height=720");
      if (!popup) window.location.assign(url);

      setPhase("polling");
      const result = await pollWithdraw(info, token, id);
      setTx(result);
      setPhase(result.status === "completed" ? "done" : "ready");
    } catch (e) {
      setError(e instanceof Error ? e.message : "SEP-24 cash-out failed.");
      setPhase("error");
    }
  }

  if (phase === "idle") {
    return (
      <Button variant="golden" onClick={run}>
        <span className="material-symbols-outlined" data-weight="fill">
          account_balance
        </span>
        Cash out to GCash / bank
      </Button>
    );
  }

  const busy = ["discovering", "authenticating", "starting", "polling"].includes(
    phase
  );

  return (
    <div className="space-y-3 rounded-lg border border-secondary/30 bg-secondary-fixed/10 p-sm">
      <div className="flex items-center gap-2 font-label-caps text-label-caps uppercase text-on-secondary-fixed-variant">
        <span className="material-symbols-outlined text-[16px]" data-weight="fill">
          account_balance
        </span>
        SEP-24 off-ramp
      </div>

      <p className="font-body-sm text-body-sm text-on-surface-variant">
        {PHASE_LABEL[phase]}
        {busy && <span className="ml-1 animate-pulse">●</span>}
      </p>

      {anchor && (
        <p className="font-currency-md text-[11px] text-on-surface-variant/60">
          Anchor: {anchor.domain} · {anchor.asset.code}
        </p>
      )}

      {phase === "interactive" && (
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Finished the anchor form?{" "}
          <button
            onClick={() => setPhase("polling")}
            className="font-label-caps uppercase text-primary underline"
          >
            Check status
          </button>
        </p>
      )}

      {tx && (phase === "ready" || phase === "done") && (
        <div className="space-y-2 rounded-lg bg-surface-container-lowest p-sm">
          <Row label="Status" value={tx.status} />
          {tx.amount_in && <Row label="Amount in" value={`${tx.amount_in} ${anchor?.asset.code ?? ""}`} />}
          {tx.amount_out && <Row label="You receive" value={`₱ ${tx.amount_out}`} />}
          {tx.amount_fee && <Row label="Fee" value={tx.amount_fee} />}
          {tx.withdraw_anchor_account && (
            <Row label="Send to" value={short(tx.withdraw_anchor_account)} mono />
          )}
          {tx.withdraw_memo && (
            <Row
              label={`Memo${tx.withdraw_memo_type ? ` (${tx.withdraw_memo_type})` : ""}`}
              value={tx.withdraw_memo}
              mono
            />
          )}
          {tx.more_info_url && (
            <a
              href={tx.more_info_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-label-caps text-label-caps uppercase text-primary underline"
            >
              <span className="material-symbols-outlined text-[16px]">open_in_new</span>
              Pickup details
            </a>
          )}
          {phase === "ready" && (
            <p className="font-body-sm text-[12px] text-on-surface-variant/70">
              The anchor is ready. On mainnet PadaLock sends the USDC payment with
              the memo above to finish the PHP payout.
            </p>
          )}
        </div>
      )}

      {error && (
        <p className="font-body-sm text-body-sm text-error">{error}</p>
      )}

      {(phase === "error" || phase === "ready" || phase === "done") && (
        <button
          onClick={run}
          className="font-label-caps text-label-caps uppercase text-primary underline"
        >
          {phase === "error" ? "Retry" : "Start again"}
        </button>
      )}
    </div>
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
    <div className="flex justify-between gap-2 font-body-sm text-body-sm">
      <span className="text-on-surface-variant">{label}</span>
      <span
        className={`text-right text-on-surface ${mono ? "font-currency-md break-all text-[12px]" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}

function short(a: string): string {
  return a.length > 16 ? `${a.slice(0, 8)}…${a.slice(-6)}` : a;
}
