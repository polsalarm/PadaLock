"use client";

import type { PadalaAsset } from "@padalock/sdk";

/**
 * Local index of padalas this device has sent / received, keyed by pubkey.
 * The contract has no "list by sender/recipient" query, so we remember ids.
 *
 * Each entry carries its asset because padala ids are **per-contract** (USDC and
 * XLM are separate PadaLock instances), so id alone is ambiguous.
 */

export interface PadalaRef {
  id: number;
  asset: PadalaAsset;
}

const SENT_KEY = "padalock.sent.v1";
const RECV_KEY = "padalock.received.v1";

// Stored value is legacy `number[]` (all USDC) or the current `PadalaRef[]`.
type RawMap = Record<string, Array<number | PadalaRef>>;

function read(key: string): Record<string, PadalaRef[]> {
  if (typeof window === "undefined") return {};
  let raw: RawMap;
  try {
    raw = JSON.parse(window.localStorage.getItem(key) ?? "{}") as RawMap;
  } catch {
    return {};
  }
  const out: Record<string, PadalaRef[]> = {};
  for (const [pub, items] of Object.entries(raw)) {
    out[pub] = (items ?? []).map((e) =>
      typeof e === "number" ? { id: e, asset: "USDC" as const } : e
    );
  }
  return out;
}

function record(
  key: string,
  pub: string,
  padalaId: string,
  asset: PadalaAsset
): void {
  const id = Number(padalaId);
  if (!Number.isFinite(id)) return;
  const m = read(key);
  const list = m[pub] ?? [];
  if (!list.some((e) => e.id === id && e.asset === asset)) {
    list.push({ id, asset });
  }
  m[pub] = list;
  window.localStorage.setItem(key, JSON.stringify(m));
}

function listFor(key: string, pub: string): PadalaRef[] {
  return (read(key)[pub] ?? []).slice().sort((a, b) => b.id - a.id);
}

/** Record a padala this wallet sent. */
export function recordSentPadala(
  senderPub: string,
  padalaId: string,
  asset: PadalaAsset = "USDC"
): void {
  record(SENT_KEY, senderPub, padalaId, asset);
}

/** Sent padalas for a sender, newest first. */
export function getSentPadalas(senderPub: string): PadalaRef[] {
  return listFor(SENT_KEY, senderPub);
}

/** Record a padala this wallet received (is a bucket recipient of). */
export function recordReceivedPadala(
  recipientPub: string,
  padalaId: string,
  asset: PadalaAsset = "USDC"
): void {
  record(RECV_KEY, recipientPub, padalaId, asset);
}

/** Received padalas for a recipient, newest first. */
export function getReceivedPadalas(recipientPub: string): PadalaRef[] {
  return listFor(RECV_KEY, recipientPub);
}
