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
import { IS_MAINNET } from "@padalock/sdk";
import { Card, PageShell } from "@/components/ui";
import { track } from "@/lib/analytics";
import { useT } from "@/lib/prefs";

export default function Dashboard() {
  const router = useRouter();
  const t = useT();
  const { state, lock, signTxXdr } = useWallet();
  const [balance, setBalance] = useState<string>("0");
  const [xlm, setXlm] = useState<string>("0");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [heroAsset, setHeroAsset] = useState<"USDC" | "XLM">("USDC");
  const [showAddr, setShowAddr] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("padalock.heroAsset.v1");
    if (saved === "XLM" || saved === "USDC") setHeroAsset(saved);
  }, []);

  function pickHero(asset: "USDC" | "XLM") {
    setHeroAsset(asset);
    localStorage.setItem("padalock.heroAsset.v1", asset);
  }

  const refresh = useCallback(async (pub: string) => {
    const [usdc, native] = await Promise.all([
      getUsdcBalance(pub).catch(() => "0"),
      getXlmBalance(pub).catch(() => "0"),
    ]);
    setBalance(usdc);
    setXlm(native);
  }, []);

  useEffect(() => {
    if (state.status === "locked" || state.status === "no-wallet") {
      router.replace("/");
      return;
    }
    if (state.status !== "unlocked") return; // still loading
    void refresh(state.publicKey);
  }, [state, refresh, router]);

  if (state.status !== "unlocked") return null;
  const publicKey: string = state.publicKey;
  const usdcHuman = fmtStroops(balance);
  const php = usdcToPhp(usdcHuman);
  const heroIsXlm = heroAsset === "XLM";
  const heroValue = heroIsXlm ? xlm : usdcHuman;
  const heroSub = heroIsXlm ? t("dash.nativeAsset") : `≈ ₱${php}`;
  const otherSym = heroIsXlm ? "USDC" : "XLM";
  const otherValue = heroIsXlm ? usdcHuman : xlm;
  const hour = new Date().getHours();
  const greeting = t(
    hour < 12 ? "greet.morning" : hour < 18 ? "greet.afternoon" : "greet.evening"
  );

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(publicKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked — address stays visible for manual copy */
    }
  }

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
      track("wallet_funded");
      await refresh(publicKey);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Setup error");
    } finally {
      setBusy(false);
    }
  }

  /* 2x2 shortcut grid — title + chevron up top, illustration panel below. */
  const shortcuts = [
    {
      href: "/send",
      title: t("dash.sendUsdc"),
      value: usdcHuman,
      sub: `≈ ₱${php}`,
      icon: "send",
      tone: "bg-secondary-container/35 text-on-secondary-container",
    },
    {
      href: "/send-xlm",
      title: t("dash.sendXlm"),
      value: xlm,
      sub: t("dash.networkFees"),
      icon: "auto_awesome",
      tone: "bg-tertiary-container/15 text-tertiary",
    },
    {
      href: "/family",
      title: t("dash.familyCircle"),
      value: null,
      sub: t("dash.manageRecipients"),
      icon: "groups",
      tone: "bg-primary-container/12 text-primary",
    },
    {
      href: "/history",
      title: t("dash.padalaHistory"),
      value: null,
      sub: t("dash.trackClaim"),
      icon: "receipt_long",
      tone: "bg-surface-container-high text-on-surface-variant",
    },
  ];

  return (
    <PageShell>
      <main className="relative z-10 flex flex-col gap-lg px-margin-mobile pb-[148px] pt-lg">
        {/* Page title row — big title left, identity + lock right */}
        <header className="flex items-start justify-between">
          <div className="flex flex-col">
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              {greeting} 👋
            </span>
            <h1 className="font-display-lg text-display-lg-mobile font-bold tracking-tight text-on-surface">
              {t("dash.title")}
            </h1>
          </div>
          <div className="flex items-center gap-xs">
            <button
              aria-label={t("dash.lockWallet")}
              onClick={lock}
              className="flex h-11 w-11 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                lock
              </span>
            </button>
            <Link
              href="/settings"
              aria-label={t("dash.settings")}
              className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-container shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/mascot/icon.png"
                alt=""
                aria-hidden="true"
                className="h-11 w-auto translate-y-0.5"
              />
            </Link>
          </div>
        </header>

        {/* Hero balance card */}
        <section className="relative flex flex-col gap-sm overflow-hidden rounded-xl bg-hero p-lg text-on-hero shadow-hero">
          <div className="absolute right-0 top-0 h-32 w-32 -translate-y-1/2 translate-x-1/4 rounded-full bg-hero-glow opacity-60 blur-2xl" />

          <div className="relative z-10 flex items-center justify-between">
            <span className="font-label-caps text-label-caps uppercase text-hero-dim">
              {t("dash.availableBalance")}
            </span>
            <button
              onClick={() => setShowAddr((v) => !v)}
              aria-expanded={showAddr}
              className="flex items-center gap-0.5 rounded-full font-label-caps text-label-caps uppercase text-hero-dim transition-colors hover:text-on-hero focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-hero"
            >
              {t("dash.walletAddress")}
              <span
                className={`material-symbols-outlined text-[16px] transition-transform ${
                  showAddr ? "rotate-90" : ""
                }`}
                aria-hidden="true"
              >
                chevron_right
              </span>
            </button>
          </div>

          <div className="relative z-10 flex flex-col">
            <div className="flex items-baseline gap-xs">
              <span className="font-currency-lg text-[44px] leading-[52px] tracking-tight">
                {heroValue}
              </span>
              <span className="font-body-sm text-body-sm text-hero-dim">
                {heroAsset}
              </span>
            </div>
            <span className="mt-1 font-body-sm text-body-sm text-hero-dim/80">
              {heroSub}
            </span>
          </div>

          {/* Asset toggle — choose which token headlines the balance */}
          <div className="relative z-10 flex w-fit gap-1 rounded-full bg-on-hero/10 p-0.5">
            {(["USDC", "XLM"] as const).map((a) => (
              <button
                key={a}
                onClick={() => pickHero(a)}
                aria-pressed={heroAsset === a}
                className={`rounded-full px-sm py-1 font-label-caps text-label-caps uppercase transition-colors ${
                  heroAsset === a
                    ? "bg-on-hero text-hero"
                    : "text-hero-dim"
                }`}
              >
                {a}
              </button>
            ))}
          </div>

          {showAddr && (
            <div className="relative z-10 flex items-center gap-sm rounded-lg bg-on-hero/10 p-sm">
              <span className="min-w-0 flex-1 break-all font-currency-md text-[11px] leading-4 text-on-hero">
                {publicKey}
              </span>
              <button
                onClick={onCopy}
                className="flex h-9 shrink-0 items-center gap-1 rounded-full bg-on-hero px-sm font-label-caps text-label-caps uppercase text-hero focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-hero"
              >
                <span className="material-symbols-outlined text-[15px]" aria-hidden="true">
                  {copied ? "check" : "content_copy"}
                </span>
                {copied ? t("dash.copied") : t("dash.copy")}
              </button>
            </div>
          )}

          {/* The other token, compact */}
          <div className="relative z-10 flex items-baseline justify-between border-t border-on-hero/15 pt-sm">
            <button
              onClick={() => refresh(publicKey)}
              className="flex items-center gap-1 rounded font-label-caps text-label-caps uppercase text-hero-dim focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-hero"
            >
              <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
                refresh
              </span>
              {otherSym}
            </button>
            <span className="font-currency-md text-currency-md text-on-hero">
              {otherValue}
            </span>
          </div>

          {/* Primary actions — the Add Cash / Cash Out pill pair */}
          <div className="relative z-10 mt-xs grid grid-cols-2 gap-sm">
            <Link
              href="/send"
              className="flex h-12 items-center justify-center gap-1 rounded-full bg-on-hero font-headline-sm text-body-md font-semibold text-hero transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-hero"
            >
              {t("dash.sendPadala")}
            </Link>
            {IS_MAINNET ? (
              <button
                onClick={() => setShowAddr(true)}
                className="flex h-12 items-center justify-center gap-1 rounded-full bg-on-hero/15 font-headline-sm text-body-md font-semibold text-on-hero transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-hero"
              >
                {t("dash.receive")}
              </button>
            ) : (
              <button
                onClick={onFund}
                disabled={busy}
                className="flex h-12 items-center justify-center gap-1 rounded-full bg-on-hero/15 font-headline-sm text-body-md font-semibold text-on-hero transition-all active:scale-95 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-hero"
              >
                {busy ? t("dash.funding") : t("dash.fundTestnet")}
              </button>
            )}
          </div>
        </section>

        {/* 2x2 shortcut grid */}
        <section className="grid grid-cols-2 gap-sm">
          {shortcuts.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="flex min-h-[172px] flex-col justify-between gap-sm rounded-xl border border-surface-variant/50 bg-surface-container-lowest p-sm shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:bg-surface-container-low hover:shadow-card-hover active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <div className="flex items-start justify-between gap-1">
                <span className="min-w-0 font-headline-sm text-body-md font-semibold text-on-surface">
                  {s.title}
                </span>
                <span
                  className="material-symbols-outlined shrink-0 text-[18px] text-on-surface-variant/60"
                  aria-hidden="true"
                >
                  chevron_right
                </span>
              </div>
              <div className={`flex flex-1 items-center justify-center rounded-lg shadow-inset-panel ${s.tone}`}>
                <span className="material-symbols-outlined text-[40px]" aria-hidden="true">
                  {s.icon}
                </span>
              </div>
              <div className="min-w-0">
                {s.value !== null && (
                  <div className="truncate font-currency-md text-currency-md text-on-surface">
                    {s.value}
                  </div>
                )}
                <div className="truncate font-body-sm text-[12px] leading-4 text-on-surface-variant/80">
                  {s.sub}
                </div>
              </div>
            </Link>
          ))}
        </section>

        {/* Quick stats */}
        <section className="grid grid-cols-3 gap-sm">
          {[
            { label: t("dash.thisMonth"), value: "—" },
            { label: t("dash.bucketsClaimed"), value: "—" },
            { label: t("dash.pendingClaims"), value: "—" },
          ].map((s) => (
            <div
              key={s.label}
              className="flex min-w-0 flex-col gap-xs rounded-lg border border-surface-variant/60 bg-surface-container-lowest p-sm shadow-card"
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

