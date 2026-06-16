"use client";

/**
 * Local index of padala IDs this device has sent, keyed by sender pubkey.
 * The contract has no "list by sender" query, so we remember IDs at send time.
 */

const KEY = "padalock.sent.v1";

type SentMap = Record<string, number[]>;

function readMap(): SentMap {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(KEY) ?? "{}") as SentMap;
  } catch {
    return {};
  }
}

function writeMap(m: SentMap): void {
  window.localStorage.setItem(KEY, JSON.stringify(m));
}

/** Record a padala id under the sender's pubkey (newest tracked separately by id order). */
export function recordSentPadala(senderPub: string, padalaId: string): void {
  const id = Number(padalaId);
  if (!Number.isFinite(id)) return;
  const m = readMap();
  const list = m[senderPub] ?? [];
  if (!list.includes(id)) list.push(id);
  m[senderPub] = list;
  writeMap(m);
}

/** Get sent padala ids for a sender, newest first. */
export function getSentPadalaIds(senderPub: string): number[] {
  return (readMap()[senderPub] ?? []).slice().sort((a, b) => b - a);
}
