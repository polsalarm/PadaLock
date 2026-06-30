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

/**
 * Opens the kit's auth modal; resolves with the connected address + the chosen
 * wallet id. The id must be persisted: on a later page load the kit's in-memory
 * wallet selection is gone, so `setWallet(id)` has to be called before signing
 * or Freighter (et al.) never pops.
 */
export async function connectExternalWallet(): Promise<{
  address: string;
  walletId: string;
}> {
  const k = await kit();
  const { address } = await k.authModal();
  // selectedModule.productId is the id authModal just activated.
  const walletId = k.selectedModule?.productId ?? "";
  return { address, walletId };
}

/** Signs a tx XDR with the connected external wallet. Returns signed XDR. */
export async function signWithExternalWallet(
  xdr: string,
  address: string,
  walletId?: string
): Promise<string> {
  const k = await kit();
  // Restore the selected wallet — the kit loses it across reloads.
  if (walletId) {
    k.setWallet(walletId);
  }
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
