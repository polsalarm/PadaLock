"use client";

/**
 * Thin wrapper over Vercel Web Analytics custom events.
 * Tracks the PadaLock funnel so Level 4 analytics shows real user behaviour,
 * not just page views. Never throws — analytics must never break a flow.
 */

import { track as vercelTrack } from "@vercel/analytics";

export type PadaEvent =
  | "wallet_created"
  | "wallet_connected"
  | "wallet_funded"
  | "padala_created"
  | "bucket_claimed"
  | "feedback_submitted"
  | "client_error";

type Props = Record<string, string | number | boolean | null>;

export function track(event: PadaEvent, props?: Props): void {
  try {
    vercelTrack(event, props);
  } catch {
    // swallow — analytics is best-effort
  }
}
