"use client";

import { NETWORK } from "@padalock/sdk";

/**
 * Stellar Wallets Kit v2 (static API) — Freighter / xBull / Albedo / Lobstr / etc.
 * Loaded lazily; the kit touches `window` at import time, keep out of SSR.
 */

let initialized = false;

async function kit() {
  const { StellarWalletsKit } = await import("@creit.tech/stellar-wallets-kit");
  if (!initialized) {
    const { Networks } = await import("@creit.tech/stellar-wallets-kit/types");
    const { defaultModules } = await import(
      "@creit.tech/stellar-wallets-kit/modules/utils"
    );
    StellarWalletsKit.init({
      modules: defaultModules(),
      network: Networks.TESTNET,
    });
    initialized = true;
  }
  return StellarWalletsKit;
}

/** Opens the kit's auth modal; resolves with the connected address. */
export async function connectExternalWallet(): Promise<string> {
  const k = await kit();
  const { address } = await k.authModal();
  return address;
}

/** Signs a tx XDR with the connected external wallet. Returns signed XDR. */
export async function signWithExternalWallet(
  xdr: string,
  address: string
): Promise<string> {
  const k = await kit();
  const { signedTxXdr } = await k.signTransaction(xdr, {
    address,
    networkPassphrase: NETWORK.passphrase,
  });
  return signedTxXdr;
}

/** Disconnects the external wallet session inside the kit. */
export async function disconnectExternalWallet(): Promise<void> {
  try {
    const k = await kit();
    await k.disconnect();
  } catch {
    // kit not initialized — nothing to disconnect
  }
}
