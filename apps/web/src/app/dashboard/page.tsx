"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useWallet } from "@/lib/wallet-context";
import {
  ensureUsdcTrustline,
  fmtStroops,
  friendbotFund,
  getUsdcBalance,
  getXlmBalance,
  usdcToPhp,
} from "@/lib/balance";
import {
  BottomNav,
  Button,
  Card,
  PageShell,
  TopAppBar,
} from "@/components/ui";

export default function Dashboard() {
  const router = useRouter();
  const { state, lock, signTxXdr } = useWallet();
  const [balance, setBalance] = useState<string>("0");
  const [xlm, setXlm] = useState<string>("0");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const refresh = useCallback(async (pub: string) => {
    const [usdc, native] = await Promise.all([
      getUsdcBalance(pub).catch(() => "0"),
      getXlmBalance(pub).catch(() => "0"),
    ]);
    setBalance(usdc);
    setXlm(native);
  }, []);

  useEffect(() => {
    if (state.status !== "unlocked") {
      router.replace("/");
      return;
    }
    void refresh(state.publicKey);
  }, [state, refresh, router]);

  if (state.status !== "unlocked") return null;
  const publicKey: string = state.publicKey;
  const usdcHuman = fmtStroops(balance);
  const php = usdcToPhp(usdcHuman);

  async function onFund() {
    setBusy(true);
    setMsg(null);
    try {
      setMsg("Step 1/3 — requesting testnet XLM…");
      const fb = await friendbotFund(publicKey);
      setMsg(
        fb === "already-funded"
          ? "XLM already funded. Step 2/3 — enabling USDC…"
          : "XLM funded. Step 2/3 — enabling USDC (sign with your wallet)…"
      );
      await ensureUsdcTrustline(publicKey, signTxXdr);
      setMsg("Step 3/3 — minting test USDC…");
      const res = await fetch("/api/faucet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: publicKey }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Faucet mint failed");
      }
      setMsg("Ready! 1000 test USDC minted to your wallet. 🎉");
      await refresh(publicKey);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Setup error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageShell>
      <TopAppBar
        trailing={
          <button
            aria-label="Lock wallet"
            onClick={lock}
            className="flex h-touch-target w-touch-target items-center justify-center text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-full"
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              logout
            </span>
          </button>
        }
      />
      <main className="relative z-10 mt-md flex flex-col gap-lg px-margin-mobile pb-[100px]">
        {/* Hero balance */}
        <section className="relative flex flex-col gap-sm overflow-hidden rounded-xl bg-primary p-lg text-on-primary shadow-[0_4px_12px_rgba(0,0,0,0.04)]">
          <div className="absolute right-0 top-0 h-32 w-32 -translate-y-1/2 translate-x-1/4 rounded-full bg-primary-container opacity-50 blur-2xl" />
          <div className="relative z-10 flex items-start justify-between">
            <span className="font-label-caps text-label-caps uppercase text-primary-fixed-dim">
              Available Balance
            </span>
            <button
              onClick={onFund}
              disabled={busy}
              className="rounded-full border border-outline-variant/30 bg-primary-container px-sm py-1 font-label-caps text-label-caps uppercase text-on-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-primary disabled:opacity-50"
            >
              {busy ? "Funding…" : "Fund testnet"}
            </button>
          </div>
          <div className="relative z-10 flex flex-col">
            <div className="flex items-baseline gap-xs">
              <span className="font-currency-lg text-display-lg-mobile tracking-tight">
                {usdcHuman}
              </span>
              <span className="font-body-sm text-body-sm text-primary-fixed-dim">
                USDC
              </span>
            </div>
            <span className="mt-1 font-body-sm text-body-sm text-inverse-primary">
              ≈ ₱{php}
            </span>
          </div>
          {/* Native XLM balance (Level-1 requirement) */}
          <div className="relative z-10 flex items-baseline justify-between border-t border-on-primary/15 pt-sm">
            <span className="font-label-caps text-label-caps uppercase text-primary-fixed-dim">
              XLM
            </span>
            <span className="font-currency-md text-currency-md text-on-primary">
              {xlm}
            </span>
          </div>
          <div className="relative z-10 mt-xs flex items-center gap-xs opacity-75">
            <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
              refresh
            </span>
            <button
              onClick={() => refresh(publicKey)}
              className="rounded font-label-caps text-label-caps focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-primary"
            >
              Refresh balance
            </button>
          </div>
        </section>

        {/* Assets — tap a token to send it (wallet-style list) */}
        <section className="flex flex-col gap-sm">
          <div className="flex items-baseline justify-between px-xs">
            <h2 className="font-label-caps text-label-caps uppercase text-on-surface-variant">
              My tokens
            </h2>
            <span className="font-body-sm text-[12px] text-on-surface-variant/80">
              Tap a token to send
            </span>
          </div>
          {[
            {
              sym: "USDC",
              name: "USD Coin",
              badge: "$",
              tone: "bg-secondary-container text-on-secondary-container",
              balance: usdcHuman,
              sub: `≈ ₱${php}`,
              href: "/send",
            },
            {
              sym: "XLM",
              name: "Stellar Lumens",
              badge: "✦",
              tone: "bg-tertiary-container text-on-tertiary-container",
              balance: xlm,
              sub: "Network fees",
              href: "/send-xlm",
            },
          ].map((t) => (
            <Link
              key={t.sym}
              href={t.href}
              aria-label={`Send ${t.sym}`}
              className="flex items-center gap-sm rounded-xl border border-surface-variant/50 bg-surface-container-lowest p-sm shadow-[0_4px_12px_rgba(0,0,0,0.04)] transition-all hover:bg-surface-container-low active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-headline-sm text-headline-sm ${t.tone}`}
              >
                {t.badge}
              </div>
              <div className="flex-1">
                <div className="font-headline-sm text-headline-sm text-on-surface">
                  {t.sym}
                </div>
                <div className="font-body-sm text-body-sm text-on-surface-variant">
                  {t.name}
                </div>
              </div>
              <div className="text-right">
                <div className="font-currency-md text-currency-md text-on-surface">
                  {t.balance}
                </div>
                <div className="font-body-sm text-[12px] text-on-surface-variant/70">
                  {t.sub}
                </div>
              </div>
              <span className="ml-xs flex items-center gap-0.5 rounded-full bg-primary/10 px-sm py-0.5 font-label-caps text-label-caps uppercase text-primary">
                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                  send
                </span>
                Send
              </span>
            </Link>
          ))}
        </section>

        <Link href="/family">
          <Button variant="ghost">
            <span className="material-symbols-outlined">groups</span>
            Family groups
          </Button>
        </Link>

        {/* Quick stats */}
        <section
          className="no-scrollbar flex gap-sm overflow-x-auto pb-2"
        >
          {[
            { label: "This month", value: "—" },
            { label: "Buckets claimed", value: "—" },
            { label: "Pending claims", value: "—" },
          ].map((s) => (
            <div
              key={s.label}
              className="flex min-w-[140px] shrink-0 flex-col gap-xs rounded-lg border border-surface-variant bg-surface-container-lowest p-sm shadow-[0_4px_12px_rgba(0,0,0,0.04)]"
            >
              <span className="font-label-caps text-label-caps uppercase text-on-surface-variant">
                {s.label}
              </span>
              <span className="font-headline-sm text-headline-sm text-primary">
                {s.value}
              </span>
            </div>
          ))}
        </section>

        <Card>
          <div className="flex items-center gap-sm">
            <span
              className="material-symbols-outlined text-tertiary-container"
              data-weight="fill"
              aria-hidden="true"
            >
              account_circle
            </span>
            <div className="flex-1">
              <div className="font-label-caps text-label-caps uppercase text-on-surface-variant">
                Your public address
              </div>
              <div className="mt-1 break-all font-currency-md text-[12px] text-on-surface">
                {publicKey}
              </div>
            </div>
          </div>
        </Card>

        {msg && (
          <Card className="border-outline-variant" role="status" aria-live="polite">
            <p className="font-body-sm text-body-sm text-on-surface">{msg}</p>
          </Card>
        )}
      </main>
      <BottomNav />
    </PageShell>
  );
}
