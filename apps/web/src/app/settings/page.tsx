"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@/lib/wallet-context";
import { NETWORK, PADALOCK_CONTRACT_ID, USDC_SAC_TESTNET } from "@padalock/sdk";
import {
  BottomNav,
  Button,
  Card,
  PageShell,
  StatusBadge,
  TopAppBar,
} from "@/components/ui";

function shorten(a: string): string {
  return a.length > 16 ? `${a.slice(0, 8)}…${a.slice(-8)}` : a;
}

export default function SettingsPage() {
  const router = useRouter();
  const { state, lock, destroy } = useWallet();
  const [copied, setCopied] = useState<string | null>(null);

  if (state.status !== "unlocked") {
    if (typeof window !== "undefined") router.replace("/");
    return null;
  }

  async function copy(label: string, value: string) {
    await navigator.clipboard.writeText(value);
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
  }

  const rows = [
    { label: "Your address", value: state.publicKey },
    { label: "PadaLock contract", value: PADALOCK_CONTRACT_ID },
    { label: "USDC contract", value: USDC_SAC_TESTNET },
    { label: "RPC", value: NETWORK.rpcUrl },
  ];

  return (
    <PageShell>
      <TopAppBar title="Settings" />
      <main className="flex flex-1 flex-col gap-gutter px-margin-mobile pb-[100px] pt-md">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-label-caps text-label-caps uppercase text-on-surface-variant">
                Wallet mode
              </div>
              <div className="mt-1 font-headline-sm text-headline-sm text-on-surface">
                {state.mode === "local" ? "Built-in wallet" : "External wallet"}
              </div>
            </div>
            <StatusBadge variant={state.mode === "local" ? "claimed" : "ready"}>
              <span
                className="material-symbols-outlined text-[14px]"
                data-weight="fill"
              >
                {state.mode === "local" ? "lock" : "wallet"}
              </span>
              {state.mode === "local" ? "Self-custodial" : "Connected"}
            </StatusBadge>
          </div>
          <p className="mt-sm font-body-sm text-body-sm text-on-surface-variant">
            {state.mode === "local"
              ? "Keys encrypted on this device. Signing happens locally."
              : "Signing requests go to your connected wallet (Freighter, xBull, …)."}
          </p>
        </Card>

        <h2 className="px-xs font-headline-sm text-headline-sm text-on-surface">
          Network — Stellar testnet
        </h2>

        <div className="flex flex-col gap-sm">
          {rows.map((r) => (
            <Card key={r.label}>
              <div className="flex items-center justify-between gap-sm">
                <div className="min-w-0 flex-1">
                  <div className="font-label-caps text-label-caps uppercase text-on-surface-variant">
                    {r.label}
                  </div>
                  <div className="mt-1 truncate font-currency-md text-[12px] text-on-surface">
                    {shorten(r.value)}
                  </div>
                </div>
                <button
                  onClick={() => copy(r.label, r.value)}
                  className="flex h-touch-target w-touch-target shrink-0 items-center justify-center rounded-full text-primary hover:bg-surface-container"
                  aria-label={`Copy ${r.label}`}
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {copied === r.label ? "check" : "content_copy"}
                  </span>
                </button>
              </div>
            </Card>
          ))}
        </div>

        <div className="mt-md flex flex-col gap-sm">
          <Button variant="ghost" onClick={lock}>
            <span className="material-symbols-outlined">logout</span>
            {state.mode === "local" ? "Lock wallet" : "Disconnect wallet"}
          </Button>
          <button
            onClick={() => {
              if (
                confirm(
                  "Forget wallet on this device? Built-in wallet requires your recovery phrase to restore. This cannot be undone."
                )
              ) {
                destroy();
                router.replace("/");
              }
            }}
            className="py-sm text-center font-body-sm text-body-sm text-error underline"
          >
            Forget wallet on this device
          </button>
        </div>
      </main>
      <BottomNav />
    </PageShell>
  );
}
