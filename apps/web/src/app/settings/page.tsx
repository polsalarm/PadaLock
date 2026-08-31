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

  function saveName() {
    setUsername(name);
    setNameSaved(true);
    setTimeout(() => setNameSaved(false), 1500);
  }

  const rows = [
    { label: t("set.yourAddress"), value: publicKey },
    { label: t("set.padalockContract"), value: PADALOCK_CONTRACT_ID },
    { label: t("set.usdcContract"), value: USDC_SAC },
    { label: t("set.rpc"), value: NETWORK.rpcUrl },
  ];

  const isLocal = state.mode === "local";
  const totals = activity
    ? { in: activity.totalIn, out: activity.totalOut, count: activity.rows.length }
    : null;

  return (
    <PageShell>
      <TopAppBar title={t("set.title")} />
      <main className="flex flex-1 flex-col gap-gutter px-margin-mobile pb-[148px] pt-md">
        {/* ── Profile ── */}
        <SectionTitle>{t("set.profile")}</SectionTitle>
        <Card>
          <div className="flex items-center gap-sm">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-container shadow-card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/mascot/icon.png"
                alt=""
                aria-hidden="true"
                className="h-14 w-auto translate-y-0.5"
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate font-headline-sm text-headline-sm text-on-surface">
                {name || t("set.namePlaceholder")}
              </div>
              <div className="mt-0.5 truncate font-currency-md text-[12px] text-on-surface-variant">
                {shorten(publicKey)}
              </div>
            </div>
            <StatusBadge variant={isLocal ? "claimed" : "ready"}>
              <span
                className="material-symbols-outlined text-[14px]"
                data-weight="fill"
                aria-hidden="true"
              >
                {isLocal ? "lock" : "wallet"}
              </span>
              {isLocal ? t("set.selfCustodial") : t("set.connected")}
            </StatusBadge>
          </div>

          <div className="mt-md">
            <label
              htmlFor="display-name"
              className="mb-xs block font-label-caps text-label-caps uppercase text-on-surface-variant"
            >
              {t("set.displayName")}
            </label>
            <div className="flex gap-sm">
              <input
                id="display-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={40}
                placeholder={t("set.namePlaceholder")}
                className="min-w-0 flex-1 rounded-lg border border-outline-variant bg-surface px-md py-sm font-body-md text-body-md text-on-surface outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
              />
              <button
                onClick={saveName}
                className="shrink-0 rounded-full bg-primary px-md font-label-caps text-label-caps uppercase text-on-primary transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {nameSaved ? t("set.saved") : t("set.save")}
              </button>
            </div>
          </div>

          <p className="mt-sm font-body-sm text-body-sm text-on-surface-variant">
            {isLocal ? t("set.localKeysNote") : t("set.externalKeysNote")}
          </p>
        </Card>

        {/* ── Appearance + language ── */}
        <SectionTitle>{t("set.appearance")}</SectionTitle>
        <Card className="flex flex-col gap-md">
          <div>
            <div className="mb-xs font-label-caps text-label-caps uppercase text-on-surface-variant">
              {t("set.theme")}
            </div>
            <Segmented<ThemeChoice>
              label={t("set.theme")}
              value={theme}
              onChange={setTheme}
              options={[
                { id: "light", label: t("set.themeLight"), icon: "light_mode" },
                { id: "dark", label: t("set.themeDark"), icon: "dark_mode" },
                { id: "system", label: t("set.themeSystem"), icon: "contrast" },
              ]}
            />
          </div>
          <div>
            <div className="mb-xs font-label-caps text-label-caps uppercase text-on-surface-variant">
              {t("set.language")}
            </div>
            <Segmented<Lang>
              label={t("set.language")}
              value={lang}
              onChange={setLang}
              options={LANGS.map((l) => ({ id: l.id, label: l.label }))}
            />
          </div>
        </Card>

        {/* ── Portfolio ── */}
        <div className="flex items-baseline justify-between px-xs">
          <SectionTitle>{t("set.portfolio")}</SectionTitle>
          <button
            onClick={() => void loadActivity(publicKey)}
            className="flex items-center gap-0.5 rounded-full font-label-caps text-label-caps uppercase text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <span className="material-symbols-outlined text-[15px]" aria-hidden="true">
              refresh
            </span>
            {t("set.refresh")}
          </button>
        </div>

        <Card className="flex flex-col gap-sm">
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            {t("set.portfolioSub")}
          </p>

          {totals && (
            <div className="grid grid-cols-3 gap-sm">
              {[
                {
                  label: t("set.totalIn"),
                  value: Object.entries(totals.in),
                  tone: "text-tertiary",
                },
                {
                  label: t("set.totalOut"),
                  value: Object.entries(totals.out),
                  tone: "text-primary",
                },
                {
                  label: t("set.txCount"),
                  value: [["", totals.count]] as Array<[string, number]>,
                  tone: "text-on-surface",
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className="flex min-w-0 flex-col gap-1 rounded-lg bg-surface-container p-sm"
                >
                  <span className="font-label-caps text-[9px] uppercase leading-3 tracking-normal text-on-surface-variant">
                    {s.label}
                  </span>
                  {s.value.length === 0 ? (
                    <span className={`font-currency-md text-currency-md ${s.tone}`}>—</span>
                  ) : (
                    s.value.map(([asset, amt]) => (
                      <span
                        key={`${s.label}-${asset}`}
                        className={`min-w-0 font-currency-md text-[13px] leading-4 ${s.tone}`}
                      >
                        {fmtAmountCompact(amt)}
                        {asset && (
                          <span className="ml-1 block font-body-sm text-[9px] leading-3 text-on-surface-variant">
                            {asset}
                          </span>
                        )}
                      </span>
                    ))
                  )}
                </div>
              ))}
            </div>
          )}

          {txState === "loading" && (
            <p className="py-sm font-body-sm text-body-sm text-on-surface-variant">
              {t("set.txLoading")}
            </p>
          )}
          {txState === "error" && (
            <p className="py-sm font-body-sm text-body-sm text-error">
              {t("set.txError")}
            </p>
          )}
          {txState === "idle" && activity && activity.rows.length === 0 && (
            <p className="py-sm font-body-sm text-body-sm text-on-surface-variant">
              {t("set.txEmpty")}
            </p>
          )}

          {activity && activity.rows.length > 0 && (
            <ul className="flex flex-col divide-y divide-surface-variant/60">
              {activity.rows.map((r) => {
                const inbound = r.kind !== "sent";
                return (
                  <li key={r.id}>
                    <a
                      href={`https://stellar.expert/explorer/${STELLAR_EXPERT_NETWORK}/tx/${r.hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-sm py-sm transition-colors hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                          inbound
                            ? "bg-tertiary-container/20 text-tertiary"
                            : "bg-primary-container/15 text-primary"
                        }`}
                      >
                        <span
                          className="material-symbols-outlined text-[18px]"
                          aria-hidden="true"
                        >
                          {r.kind === "created"
                            ? "auto_awesome"
                            : inbound
                              ? "south_west"
                              : "north_east"}
                        </span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-body-md text-body-md text-on-surface">
                          {r.kind === "created"
                            ? t("set.txCreated")
                            : inbound
                              ? t("set.txReceived")
                              : t("set.txSent")}
                        </span>
                        <span className="block truncate font-currency-md text-[11px] text-on-surface-variant">
                          {shortKey(r.counterparty)} ·{" "}
                          {new Date(r.createdAt).toLocaleDateString()}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span
                          className={`block font-currency-md text-currency-md ${
                            inbound ? "text-tertiary" : "text-on-surface"
                          }`}
                        >
                          {inbound ? "+" : "−"}
                          {fmtAmount(r.amount)}
                        </span>
                        <span className="block font-label-caps text-label-caps uppercase text-on-surface-variant">
                          {r.asset}
                        </span>
                      </span>
                    </a>
                  </li>
                );
              })}
            </ul>
          )}

          <Link
            href="/history"
            className="mt-xs flex items-center justify-center gap-1 rounded-full border border-outline-variant py-sm font-label-caps text-label-caps uppercase text-primary transition-colors hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
              receipt_long
            </span>
            {t("dash.padalaHistory")}
          </Link>
        </Card>

        {/* ── Network ── */}
        <SectionTitle>
          {t("set.network")} {IS_MAINNET ? "mainnet" : "testnet"}
        </SectionTitle>

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

        {/* ── Session ── */}
        <div className="mt-md flex flex-col gap-sm">
          <Button variant="ghost" onClick={lock}>
            <span className="material-symbols-outlined">logout</span>
            {isLocal ? t("set.lockWallet") : t("set.disconnectWallet")}
          </Button>
          <button
            onClick={() => {
              if (confirm(t("set.forgetConfirm"))) {
                destroy();
                router.replace("/");
              }
            }}
            className="py-sm text-center font-body-sm text-body-sm text-error underline"
          >
            {t("set.forgetWallet")}
          </button>
        </div>
      </main>
    </PageShell>
  );
}
