"use client";

import { Horizon } from "@stellar/stellar-sdk";
import { NETWORK, USDC_CODE, USDC_ISSUER } from "@padalock/sdk";

/**
 * Account activity for the Portfolio view.
 *
 * Source is Horizon's payments feed — classic value movements in and out of the
 * account (XLM sends, USDC transfers, the friendbot/create_account that opened
 * it). Padalas are Soroban contract calls and do NOT appear here; those live in
 * `lib/history.ts` and the /history screen.
 */

export type ActivityKind = "sent" | "received" | "created";

export interface ActivityRow {
  id: string;
  hash: string;
  createdAt: string;
  kind: ActivityKind;
  /** Human amount, e.g. "10.5000000". */
  amount: string;
  /** Display code: "XLM", "USDC", or the raw code for anything else. */
  asset: string;
  /** The other side of the transfer, when there is one. */
  counterparty: string | null;
}

export interface ActivitySummary {
  rows: ActivityRow[];
  /** Totals per asset code, human amounts. */
  totalIn: Record<string, number>;
  totalOut: Record<string, number>;
}

let _horizon: Horizon.Server | null = null;
function horizon(): Horizon.Server {
  if (!_horizon) _horizon = new Horizon.Server(NETWORK.horizonUrl);
  return _horizon;
}

type PaymentRecord = Horizon.ServerApi.PaymentOperationRecord;
type CreateAccountRecord = Horizon.ServerApi.CreateAccountOperationRecord;
type PathPaymentRecord =
  | Horizon.ServerApi.PathPaymentOperationRecord
  | Horizon.ServerApi.PathPaymentStrictSendOperationRecord;

type AnyRecord = PaymentRecord | CreateAccountRecord | PathPaymentRecord;

function assetLabel(r: PaymentRecord | PathPaymentRecord): string {
  if (r.asset_type === "native") return "XLM";
  const code = r.asset_code ?? "?";
  // Only the canonical issuer earns the plain "USDC" label; anything else keeps
  // a marker so a look-alike asset can't pass itself off as the real thing.
  if (code === USDC_CODE) {
    return r.asset_issuer === USDC_ISSUER ? "USDC" : `${code}*`;
  }
  return code;
}

function toRow(r: AnyRecord, pub: string): ActivityRow | null {
  if (r.type === "create_account") {
    const c = r as CreateAccountRecord;
    return {
      id: c.id,
      hash: c.transaction_hash,
      createdAt: c.created_at,
      kind: c.account === pub ? "created" : "sent",
      amount: c.starting_balance,
      asset: "XLM",
      counterparty: c.account === pub ? c.funder : c.account,
    };
  }

  if (
    r.type === "payment" ||
    r.type === "path_payment_strict_receive" ||
    r.type === "path_payment_strict_send"
  ) {
    const p = r as PaymentRecord | PathPaymentRecord;
    const received = p.to === pub;
    return {
      id: p.id,
      hash: p.transaction_hash,
      createdAt: p.created_at,
      kind: received ? "received" : "sent",
      amount: p.amount,
      asset: assetLabel(p),
      counterparty: received ? p.from : p.to,
    };
  }

  return null;
}

/**
 * Newest-first account activity plus per-asset in/out totals.
 * An unfunded account has no Horizon record — that surfaces as an empty list,
 * not an error.
 */
export async function getAccountActivity(
  publicKey: string,
  limit = 50
): Promise<ActivitySummary> {
  const empty: ActivitySummary = { rows: [], totalIn: {}, totalOut: {} };
  let page;
  try {
    page = await horizon()
      .payments()
      .forAccount(publicKey)
      .order("desc")
      .limit(limit)
      .call();
  } catch (e) {
    // 404 = account not funded yet. Anything else is a real failure.
    const status = (e as { response?: { status?: number } })?.response?.status;
    if (status === 404) return empty;
    throw e;
  }

  const rows = page.records
    .map((r) => toRow(r as AnyRecord, publicKey))
    .filter((r): r is ActivityRow => r !== null);

  const totalIn: Record<string, number> = {};
  const totalOut: Record<string, number> = {};
  for (const r of rows) {
    const n = Number(r.amount);
    if (!Number.isFinite(n)) continue;
    const bucket = r.kind === "sent" ? totalOut : totalIn;
    bucket[r.asset] = (bucket[r.asset] ?? 0) + n;
  }

  return { rows, totalIn, totalOut };
}

/**
 * Short form for the summary tiles: a third-width tile cannot hold
 * "13,514.4567", so anything past four digits becomes "13.5K".
 */
export function fmtAmountCompact(raw: string | number): string {
  const n = Number(raw);
  if (!Number.isFinite(n)) return String(raw);
  if (Math.abs(n) >= 10_000) {
    return n.toLocaleString(undefined, {
      notation: "compact",
      maximumFractionDigits: 1,
    });
  }
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

/** Trim an amount to at most 7 decimals and drop trailing zeros. */
export function fmtAmount(raw: string): string {
  const n = Number(raw);
  if (!Number.isFinite(n)) return raw;
  return n.toLocaleString(undefined, { maximumFractionDigits: 7 });
}

export function shortKey(a: string | null): string {
  if (!a) return "—";
  return a.length > 12 ? `${a.slice(0, 4)}…${a.slice(-4)}` : a;
}
