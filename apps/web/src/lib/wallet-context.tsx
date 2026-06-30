"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Keypair, TransactionBuilder } from "@stellar/stellar-sdk";
import { NETWORK } from "@padalock/sdk";
import {
  hasWallet,
  keypairFromMnemonic,
  saveWallet,
  unlockWallet,
  wipeWallet,
} from "./wallet";
import {
  connectExternalWallet,
  disconnectExternalWallet,
  signWithExternalWallet,
} from "./external-wallet";

export type WalletMode = "local" | "external";

type State =
  | { status: "loading" }
  | { status: "no-wallet" }
  | { status: "locked" }
  | { status: "unlocked"; publicKey: string; mode: WalletMode };

interface WalletApi {
  state: State;
  getKeypair: () => Keypair | null;
  create: (mnemonic: string, password: string) => Promise<void>;
  unlock: (password: string) => Promise<void>;
  connectExternal: () => Promise<void>;
  /** Signs a built tx with the active wallet (local key or external kit). Returns signed XDR. */
  signTxXdr: (xdr: string) => Promise<string>;
  lock: () => void;
  destroy: () => void;
}

const EXTERNAL_KEY = "padalock.external.v1";
const EXTERNAL_WALLET_KEY = "padalock.external.wallet.v1";

const Ctx = createContext<WalletApi | null>(null);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>({ status: "loading" });
  const [keypair, setKeypair] = useState<Keypair | null>(null);

  useEffect(() => {
    const ext =
      typeof window !== "undefined"
        ? window.localStorage.getItem(EXTERNAL_KEY)
        : null;
    if (ext) {
      setState({ status: "unlocked", publicKey: ext, mode: "external" });
      return;
    }
    setState(hasWallet() ? { status: "locked" } : { status: "no-wallet" });
  }, []);

  const create = useCallback(async (mnemonic: string, password: string) => {
    await saveWallet(mnemonic, password);
    const kp = keypairFromMnemonic(mnemonic);
    setKeypair(kp);
    setState({ status: "unlocked", publicKey: kp.publicKey(), mode: "local" });
  }, []);

  const unlock = useCallback(async (password: string) => {
    const mnemonic = await unlockWallet(password);
    const kp = keypairFromMnemonic(mnemonic);
    setKeypair(kp);
    setState({ status: "unlocked", publicKey: kp.publicKey(), mode: "local" });
  }, []);

  const connectExternal = useCallback(async () => {
    const { address, walletId } = await connectExternalWallet();
    window.localStorage.setItem(EXTERNAL_KEY, address);
    // Persist the chosen wallet so signing can re-select it after a reload.
    if (walletId) window.localStorage.setItem(EXTERNAL_WALLET_KEY, walletId);
    setKeypair(null);
    setState({ status: "unlocked", publicKey: address, mode: "external" });
  }, []);

  const signTxXdr = useCallback(
    async (xdr: string): Promise<string> => {
      if (state.status !== "unlocked") throw new Error("Wallet not unlocked");
      if (state.mode === "external") {
        const walletId =
          typeof window !== "undefined"
            ? window.localStorage.getItem(EXTERNAL_WALLET_KEY) ?? undefined
            : undefined;
        return signWithExternalWallet(xdr, state.publicKey, walletId);
      }
      if (!keypair) throw new Error("Local key unavailable");
      const tx = TransactionBuilder.fromXDR(xdr, NETWORK.passphrase);
      tx.sign(keypair);
      return tx.toXDR();
    },
    [state, keypair]
  );

  const lock = useCallback(() => {
    window.localStorage.removeItem(EXTERNAL_KEY);
    window.localStorage.removeItem(EXTERNAL_WALLET_KEY);
    void disconnectExternalWallet();
    setKeypair(null);
    setState(hasWallet() ? { status: "locked" } : { status: "no-wallet" });
  }, []);

  const destroy = useCallback(() => {
    wipeWallet();
    window.localStorage.removeItem(EXTERNAL_KEY);
    window.localStorage.removeItem(EXTERNAL_WALLET_KEY);
    setKeypair(null);
    setState({ status: "no-wallet" });
  }, []);

  const api = useMemo<WalletApi>(
    () => ({
      state,
      getKeypair: () => keypair,
      create,
      unlock,
      connectExternal,
      signTxXdr,
      lock,
      destroy,
    }),
    [state, keypair, create, unlock, connectExternal, signTxXdr, lock, destroy]
  );

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useWallet(): WalletApi {
  const v = useContext(Ctx);
  if (!v) throw new Error("useWallet must be used within WalletProvider");
  return v;
}
