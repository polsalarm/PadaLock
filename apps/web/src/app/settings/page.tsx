"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useWallet } from "@/lib/wallet-context";
import {
  IS_MAINNET,
  NETWORK,
  PADALOCK_CONTRACT_ID,
  STELLAR_EXPERT_NETWORK,
  USDC_SAC,
} from "@padalock/sdk";
import { getUsername, setUsername } from "@/lib/profile";
import {
  fmtAmount,
  fmtAmountCompact,
  getAccountActivity,
  shortKey,
  type ActivitySummary,
} from "@/lib/portfolio";
import { usePrefs, type ThemeChoice } from "@/lib/prefs";
import { LANGS, type Lang } from "@/lib/i18n";
import { Button, Card, PageShell, StatusBadge, TopAppBar } from "@/components/ui";

function shorten(a: string): string {
  return a.length > 16 ? `${a.slice(0, 8)}…${a.slice(-8)}` : a;
}

/** Pill segmented control — used for both theme and language. */
function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: ReadonlyArray<{ id: T; label: string; icon?: string }>;
  onChange: (next: T) => void;
  label: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="flex gap-1 rounded-full bg-surface-container p-1"
    >
      {options.map((o) => {
        const on = o.id === value;
        return (
          <button
            key={o.id}
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.id)}
            className={`flex min-h-9 min-w-0 flex-1 items-center justify-center gap-1 whitespace-nowrap rounded-full px-1 font-label-caps text-[10px] uppercase leading-4 tracking-wide transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              on
                ? "bg-primary text-on-primary shadow-card"
                : "text-on-surface-variant hover:bg-surface-container-high"
            }`}
          >
            {o.icon && (
              <span className="material-symbols-outlined shrink-0 text-[14px]" aria-hidden="true">
                {o.icon}
              </span>
            )}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="px-xs font-headline-sm text-headline-sm text-on-surface">
      {children}
    </h2>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { state, lock, destroy } = useWallet();
  const { t, theme, setTheme, lang, setLang } = usePrefs();

  const [copied, setCopied] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [nameSaved, setNameSaved] = useState(false);

  const [activity, setActivity] = useState<ActivitySummary | null>(null);
  const [txState, setTxState] = useState<"idle" | "loading" | "error">("loading");

  const publicKey = state.status === "unlocked" ? state.publicKey : null;

  useEffect(() => {
    setName(getUsername());
  }, []);

  const loadActivity = useCallback(async (pub: string) => {
    setTxState("loading");
    try {
      setActivity(await getAccountActivity(pub));
      setTxState("idle");
    } catch {
      setTxState("error");
    }
  }, []);

  useEffect(() => {
    if (!publicKey) return;
    void loadActivity(publicKey);
  }, [publicKey, loadActivity]);

  useEffect(() => {
    // "loading" is the state on first paint — bouncing on it sends the user
    // straight back to "/" before the wallet has had a chance to unlock.
    if (state.status === "locked" || state.status === "no-wallet") {
      router.replace("/");
    }
  }, [state.status, router]);

  if (state.status !== "unlocked" || !publicKey) return null;

  async function copy(label: string, value: string) {
    await navigator.clipboard.writeText(value);
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
  }

  const rows = [
    { label: "Your address", value: state.publicKey },
    { label: "PadaLock contract", value: PADALOCK_CONTRACT_ID },
    { label: "USDC contract", value: USDC_SAC },
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
          Network — Stellar {IS_MAINNET ? "mainnet" : "testnet"}
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
