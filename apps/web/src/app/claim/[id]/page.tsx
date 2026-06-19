"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  buildClaim,
  getMerchants,
  getPadala,
  pollFinality,
  submitSignedXdr,
  type BucketView,
  type PadalaView,
} from "@padalock/sdk";
import { useWallet } from "@/lib/wallet-context";
import { fmtStroops, fmtStroopsPhp } from "@/lib/balance";
import {
  Button,
  Card,
  PageShell,
  StatusBadge,
  TopAppBar,
} from "@/components/ui";
import { Sep24CashOut } from "@/components/sep24-cashout";

const CATEGORY_UI: Record<
  string,
  { emoji: string; en: string; tl: string; pickLabel: string; icon: string }
> = {
  Tuition: {
    emoji: "🎓",
    en: "Tuition",
    tl: "Edukasyon",
    pickLabel: "Pumili ng paaralan",
    icon: "school",
  },
  Utility: {
    emoji: "💡",
    en: "Utility",
    tl: "Bayarin",
    pickLabel: "Pumili ng biller",
    icon: "bolt",
  },
  Medical: {
    emoji: "🏥",
    en: "Medical",
    tl: "Kalusugan",
    pickLabel: "Pumili ng klinika",
    icon: "local_hospital",
  },
  Groceries: {
    emoji: "🛒",
    en: "Groceries",
    tl: "Pamilihan",
    pickLabel: "Pumili ng tindahan",
    icon: "shopping_bag",
  },
  FreeCash: {
    emoji: "💵",
    en: "Free Cash",
    tl: "Allowance",
    pickLabel: "Send to GCash / bank",
    icon: "savings",
  },
};

// Friendly names for the seeded testnet merchant accounts. The contract only
// stores addresses, so we label them client-side for a human-readable dropdown.
const MERCHANT_NAMES: Record<string, string> = {
  // Tuition (cat 0)
  GAPJSUJQF3NJR5CGON3N6G7DEVVHZMPJAVW7K5RMKQAOFK4ZUSPUPO6K:
    "Ateneo de Manila University",
  GCF6T3NUYIWBO2NEILJWJ6VPPTYH3STOISAHH4RQG4V6ZMFOCNLBOGPU:
    "De La Salle University",
  GCMVLV3KX23A74CTHG6MKKE6K5DG2DNL45HNVV7JWQKXFIHBF6BVE6SF:
    "University of Santo Tomas",
  GBTVDI5XNDPPKU73E5M4KKVX2O4ARBKVHJNQCGN6B2PFGNVHCKSCCDF7: "UP Diliman",
  // Utility (cat 1)
  GAF3RRXMZNCDEBVDONOLTWXPSPVRB6YVQNIYBLBQGA3TT4FFNYYVS5L3: "Meralco",
  GDJJARLODLEDMBYNAV5B2ZV6ABN63ZSXBYGDBI37PLNOWVS5F4TJNKEW: "Maynilad Water",
  GBNKJEK3UBPCU5I2QR3H2VSI3F7CDLDYD7W2Y22VXK74DPEQXERL7J4B: "Globe Telecom",
  GCSKOODTXNRV6KLTXF54H5PZWFNVHTWJ7BG6QA3SP3O2YHGIYP6W4QAI: "Manila Water",
  // Medical (cat 2)
  GD4AHVJWY2MI3E5O7YI66XFRSJ43HYQ6FCWW5K7LOQWDTZWAM6C6PZHT:
    "Makati Medical Center",
  GCC5WOTSCOX3FHP3QPT2CHVSSCVKTUDAKMXVFMXGKMW23JVDS5A4ZELO:
    "St. Luke's Medical Center",
  GB5U7ZMVHLBB4JF2CYU6RHBJXHRRWMJKN5BNECI7CZWRQC3DLAY3N2FJ: "The Medical City",
  GAR4AP6HTMAAIJWXIDNUVGGY4CK5W76G5SOIQTZ22IUHNYVA4XJU5AJ5: "Asian Hospital",
  // Groceries (cat 3)
  GC6NYRQP7O2TT4VFZKQXEZOX2QKQ6HHQTBCZ4TZDLIZQZZN7AKIKVMXX: "SM Supermarket",
  GDO77J5CD4YOEBUB7USQEDH6FBAXZPZHFHITG5DDLUKURYLPDO6COZCW: "Puregold",
  GAXM7366IAMIA4ZIGBJQCJQ3RBJ27WXLQVMB55PHXTYKAVCDSHVCMPFH:
    "Robinsons Supermarket",
  GABX5JDV3D5VY4WIZ6OYUJHKKSSSMMQZHYUGHO76IKR4NGRAZOKRH2OW: "Mercury Drug",
};

function merchantLabel(addr: string): string {
  return MERCHANT_NAMES[addr] ?? `${addr.slice(0, 6)}…${addr.slice(-6)}`;
}

function shorten(a: string): string {
  return `${a.slice(0, 6)}…${a.slice(-6)}`;
}

export default function ClaimPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { state, signTxXdr } = useWallet();
  const [padala, setPadala] = useState<PadalaView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (caller: string) => {
      setLoading(true);
      setError(null);
      try {
        setPadala(await getPadala(caller, id));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load padala.");
      } finally {
        setLoading(false);
      }
    },
    [id]
  );

  useEffect(() => {
    if (state.status === "no-wallet") {
      router.replace(`/onboard?next=/claim/${id}`);
      return;
    }
    if (state.status === "locked") {
      router.replace(`/login?next=/claim/${id}`);
      return;
    }
    if (state.status === "unlocked") {
      void load(state.publicKey);
    }
  }, [state, id, router, load]);

  if (state.status !== "unlocked") return null;
  const publicKey = state.publicKey;
  const isRecipient = padala && padala.recipient === publicKey;

  const totalUsdc = padala
    ? padala.buckets.reduce((acc, b) => acc + BigInt(b.amount), 0n).toString()
    : "0";
  const claimedUsdc = padala
    ? padala.buckets
        .filter((b) => b.claimed)
        .reduce((acc, b) => acc + BigInt(b.amount), 0n)
        .toString()
    : "0";
  const totalPhp = padala ? fmtStroopsPhp(totalUsdc) : "0.00";
  const claimedPhp = padala ? fmtStroopsPhp(claimedUsdc) : "0.00";
  const claimedPct =
    BigInt(totalUsdc) > 0n
      ? Number((BigInt(claimedUsdc) * 1000n) / BigInt(totalUsdc)) / 10
      : 0;

  return (
    <PageShell>
      <TopAppBar title="Claim Padala" back={() => router.back()} />
      <main className="flex flex-1 flex-col gap-gutter px-margin-mobile pb-[140px] pt-md">
        {loading && (
          <Card>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Loading padala…
            </p>
          </Card>
        )}

        {error && (
          <Card>
            <p className="font-body-sm text-body-sm text-error">{error}</p>
            <button
              onClick={() => load(publicKey)}
              className="mt-2 font-label-caps text-label-caps uppercase text-primary"
            >
              Retry
            </button>
          </Card>
        )}

        {padala && !isRecipient && (
          <Card>
            <p className="font-body-sm text-body-sm text-error">
              This padala is addressed to a different recipient.
            </p>
            <p className="mt-1 font-currency-md text-[12px] text-on-surface-variant">
              Expected: {shorten(padala.recipient)}
            </p>
          </Card>
        )}

        {padala && isRecipient && (
          <>
            {/* Hero */}
            <section className="flex flex-col items-center py-md text-center">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-secondary-fixed/30 px-3 py-1">
                <span
                  className="material-symbols-outlined text-secondary text-sm"
                  data-weight="fill"
                >
                  mail
                </span>
                <span className="font-label-caps text-label-caps uppercase text-on-secondary-fixed-variant">
                  New Padala
                </span>
              </div>
              <h2 className="mb-1 font-body-lg text-body-lg text-on-surface-variant">
                May padala ka galing kay{" "}
                <span className="font-semibold text-on-surface">
                  {shorten(padala.sender)}
                </span>
              </h2>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="font-currency-md text-currency-md text-on-surface">
                  ₱
                </span>
                <span className="font-currency-lg text-[40px] font-bold leading-[48px] tracking-tight text-on-surface">
                  {totalPhp}
                </span>
              </div>
              <p className="mt-1 font-currency-md text-[12px] text-on-surface-variant/60">
                ~ {fmtStroops(totalUsdc)} USDC
              </p>
            </section>

            <div className="flex flex-col gap-gutter">
              {padala.buckets.map((b) => (
                <BucketCard
                  key={b.id}
                  padalaId={padala.id}
                  bucket={b}
                  callerPub={publicKey}
                  signTxXdr={signTxXdr}
                  onClaimed={() => load(publicKey)}
                />
              ))}
            </div>
          </>
        )}
      </main>

      {/* Sticky footer */}
      {padala && isRecipient && (
        <div className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-[480px] bg-surface-container-lowest pb-safe pt-xs shadow-[0_-8px_20px_rgba(93,5,24,0.08)]">
          <div className="px-margin-mobile pb-xs">
            <div className="mb-2 flex items-end justify-between">
              <div>
                <p className="mb-1 font-label-caps text-label-caps uppercase text-on-surface-variant">
                  Claimed
                </p>
                <div className="flex items-baseline gap-1">
                  <span className="font-currency-md text-sm text-tertiary-container">
                    ₱
                  </span>
                  <span className="font-currency-lg text-xl text-tertiary-container">
                    {claimedPhp}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="mb-1 font-label-caps text-[10px] uppercase text-on-surface-variant/60">
                  Total Padala
                </p>
                <p className="font-currency-md text-sm text-on-surface-variant">
                  ₱{totalPhp}
                </p>
              </div>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-surface-variant">
              <div
                className="h-full bg-tertiary-container transition-all"
                style={{ width: `${claimedPct}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}

function BucketCard({
  padalaId,
  bucket,
  callerPub,
  signTxXdr,
  onClaimed,
}: {
  padalaId: string;
  bucket: BucketView;
  callerPub: string;
  signTxXdr: (xdr: string) => Promise<string>;
  onClaimed: () => void;
}) {
  const ui = CATEGORY_UI[bucket.category] ?? CATEGORY_UI.FreeCash;
  const restricted = bucket.category !== "FreeCash";
  const [merchants, setMerchants] = useState<string[]>([]);
  const [selected, setSelected] = useState<string>("");
  // FreeCash defaults to the recipient's own wallet, then off-ramps via SEP-24.
  const [freeCashAddr, setFreeCashAddr] = useState(callerPub);
  const [otherAddr, setOtherAddr] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<{ hash: string; merchant: string } | null>(
    null
  );

  useEffect(() => {
    if (!restricted) return;
    getMerchants(callerPub, bucket.category)
      .then(setMerchants)
      .catch(() => setMerchants([]));
  }, [restricted, callerPub, bucket.category]);

  async function claim() {
    const merchant = restricted ? selected : freeCashAddr.trim();
    if (!merchant.startsWith("G") || merchant.length !== 56) {
      setStatus("Pick a valid merchant address.");
      return;
    }
    setBusy(true);
    setStatus("Simulating…");
    try {
      const { tx } = await buildClaim({
        claimerPub: callerPub,
        padalaId,
        bucketId: bucket.id,
        merchantPub: merchant,
      });
      setStatus("Signing with your wallet…");
      const signedXdr = await signTxXdr(tx.toXDR());
      setStatus("Submitting…");
      const hash = await submitSignedXdr(signedXdr);
      setStatus("Polling for finality…");
      const r = await pollFinality(hash);
      if (r.status === "SUCCESS") {
        setStatus(null);
        setReceipt({ hash, merchant });
        onClaimed();
      } else {
        setStatus(`Failed: ${r.status}`);
      }
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="relative overflow-hidden rounded-xl border border-surface-variant/50 bg-surface-container-lowest p-md shadow-[0_4px_12px_rgba(0,0,0,0.04)]">
      <div className="absolute right-0 top-0 rounded-bl-xl p-3">
        {bucket.claimed ? (
          <StatusBadge variant="claimed">
            <span
              className="material-symbols-outlined text-[14px]"
              data-weight="fill"
            >
              check
            </span>
            Claimed
          </StatusBadge>
        ) : restricted ? (
          <StatusBadge variant="restricted">
            <span
              className="material-symbols-outlined text-[14px]"
              data-weight="fill"
            >
              lock
            </span>
            Restricted
          </StatusBadge>
        ) : (
          <StatusBadge variant="ready">
            <span
              className="material-symbols-outlined text-[14px]"
              data-weight="fill"
            >
              bolt
            </span>
            Ready
          </StatusBadge>
        )}
      </div>

      <div className="mb-4 flex items-start gap-3 pr-24">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-surface-container text-2xl">
          {ui.emoji}
        </div>
        <div>
          <h3 className="font-headline-sm text-headline-sm text-on-surface">
            {ui.en}
          </h3>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            {ui.tl}
          </p>
        </div>
      </div>

      <div className="mb-5">
        <div className="flex items-baseline gap-1">
          <span className="font-currency-md text-currency-md text-on-surface">
            ₱
          </span>
          <span className="font-currency-lg text-currency-lg text-on-surface">
            {fmtStroopsPhp(bucket.amount)}
          </span>
        </div>
        <p className="font-currency-md text-[12px] text-on-surface-variant/60">
          {fmtStroops(bucket.amount)} USDC
        </p>
      </div>

      {receipt || bucket.claimed ? (
        <div className="space-y-3">
          <Receipt
            hash={receipt?.hash}
            merchant={receipt?.merchant ?? bucket.claimedBy ?? ""}
            amountUsdc={fmtStroops(bucket.amount)}
          />
          {/* FreeCash claimed to own wallet → real SEP-24 off-ramp */}
          {!restricted &&
            (receipt?.merchant ?? bucket.claimedBy) === callerPub && (
              <Sep24CashOut account={callerPub} signTxXdr={signTxXdr} />
            )}
        </div>
      ) : restricted ? (
        <div className="space-y-3">
          <label className="block font-label-caps text-label-caps uppercase text-on-surface-variant">
            {ui.pickLabel}
          </label>
          {merchants.length === 0 ? (
            <p className="font-body-sm text-body-sm text-on-surface-variant/70">
              No merchants in the registry yet.
            </p>
          ) : (
            <div className="relative">
              <select
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
                className="h-12 w-full appearance-none rounded-lg border border-outline-variant bg-surface pl-10 pr-10 font-body-sm text-body-sm text-on-surface outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
              >
                <option value="">Select…</option>
                {merchants.map((m) => (
                  <option key={m} value={m}>
                    {merchantLabel(m)}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <span className="material-symbols-outlined text-outline">
                  {ui.icon}
                </span>
              </div>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                <span className="material-symbols-outlined text-outline">
                  expand_more
                </span>
              </div>
            </div>
          )}
          <Button onClick={claim} disabled={busy || !selected}>
            {busy ? "Working…" : "Claim Now"}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Naka-claim ito sa iyong wallet, tapos pwede mong i-cash out sa GCash /
            bank gamit ang anchor (SEP-24).
          </p>
          {otherAddr ? (
            <>
              <label className="block font-label-caps text-label-caps uppercase text-on-surface-variant">
                Send to another address
              </label>
              <input
                placeholder="G…"
                value={freeCashAddr}
                onChange={(e) => setFreeCashAddr(e.target.value)}
                className="h-12 w-full rounded-lg border border-outline-variant bg-surface px-md font-currency-md text-[14px] text-on-surface outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </>
          ) : (
            <div className="flex items-center gap-2 rounded-lg bg-surface-container-low px-md py-2">
              <span className="material-symbols-outlined text-outline text-[18px]">
                account_balance_wallet
              </span>
              <span className="font-currency-md text-[12px] text-on-surface-variant">
                Your wallet · {shorten(callerPub)}
              </span>
            </div>
          )}
          <Button onClick={claim} disabled={busy || !freeCashAddr}>
            {busy ? "Working…" : otherAddr ? "Claim Now" : "Claim to my wallet"}
          </Button>
          <button
            type="button"
            onClick={() => {
              const next = !otherAddr;
              setOtherAddr(next);
              setFreeCashAddr(next ? "" : callerPub);
            }}
            className="font-label-caps text-label-caps uppercase text-primary underline"
          >
            {otherAddr ? "Use my wallet instead" : "Send to another address"}
          </button>
        </div>
      )}

      {status && (
        <p className="mt-3 font-body-sm text-body-sm text-on-surface-variant">
          {status}
        </p>
      )}
    </article>
  );
}

function Receipt({
  hash,
  merchant,
  amountUsdc,
}: {
  hash?: string;
  merchant: string;
  amountUsdc: string;
}) {
  const txUrl = hash
    ? `https://stellar.expert/explorer/testnet/tx/${hash}`
    : null;
  const merchantUrl = `https://stellar.expert/explorer/testnet/account/${merchant}`;
  return (
    <div className="space-y-2 rounded-lg border border-tertiary/30 bg-tertiary-fixed/10 p-sm">
      <div className="flex items-center gap-1 font-label-caps text-label-caps uppercase text-tertiary-container">
        <span className="material-symbols-outlined text-[16px]" data-weight="fill">
          receipt_long
        </span>
        Receipt — released on-chain
      </div>
      <div className="flex justify-between font-body-sm text-body-sm">
        <span className="text-on-surface-variant">Amount</span>
        <span className="font-currency-md text-on-surface">{amountUsdc} USDC</span>
      </div>
      <div className="flex justify-between font-body-sm text-body-sm">
        <span className="text-on-surface-variant">To merchant</span>
        <a
          href={merchantUrl}
          target="_blank"
          rel="noreferrer"
          className="font-body-sm text-primary underline"
        >
          {merchantLabel(merchant)}
        </a>
      </div>
      {txUrl && (
        <a
          href={txUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 font-label-caps text-label-caps uppercase text-primary underline"
        >
          <span className="material-symbols-outlined text-[16px]">open_in_new</span>
          View transaction
        </a>
      )}
    </div>
  );
}
