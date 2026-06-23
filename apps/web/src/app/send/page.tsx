"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@/lib/wallet-context";
import {
  buildCreatePadala,
  buildCreateRecurring,
  pollFinality,
  submitSignedXdr,
  type BucketCategory,
} from "@padalock/sdk";
import {
  fmtStroops,
  getUsdcBalance,
  phpToUsdcHuman,
  toStroops,
  usdcToPhp,
} from "@/lib/balance";
import { recordSentPadala } from "@/lib/history";
import { getContacts, saveContact, type Contact } from "@/lib/contacts";
import {
  getGroups,
  takePendingGroup,
  type FamilyGroup,
} from "@/lib/groups";
import {
  BottomNav,
  Card,
  PageShell,
  TopAppBar,
} from "@/components/ui";
import { ClaimShare } from "@/components/claim-share";

const CATEGORIES: {
  key: BucketCategory;
  emoji: string;
  en: string;
  tl: string;
}[] = [
  { key: "Tuition", emoji: "🎓", en: "Tuition", tl: "Pang-aral" },
  { key: "Utility", emoji: "💡", en: "Utility", tl: "Bayarin" },
  { key: "Medical", emoji: "🏥", en: "Medical", tl: "Medikal" },
  { key: "Groceries", emoji: "🛒", en: "Groceries", tl: "Pamilihan" },
  { key: "FreeCash", emoji: "💵", en: "Free Cash", tl: "Allowance" },
];

type Allocations = Record<BucketCategory, string>;

const EMPTY: Allocations = {
  Tuition: "",
  Utility: "",
  Medical: "",
  Groceries: "",
  FreeCash: "",
};

export default function SendPage() {
  const router = useRouter();
  const { state, signTxXdr } = useWallet();
  const [recipient, setRecipient] = useState("");
  const [alloc, setAlloc] = useState<Allocations>(EMPTY);
  const [availUsdc, setAvailUsdc] = useState<string>("0");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [groups, setGroups] = useState<FamilyGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [saveName, setSaveName] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [resultId, setResultId] = useState<string | null>(null);
  // Multi-recipient: assign a different family member per bucket.
  const [perBucket, setPerBucket] = useState(false);
  const [bucketRecip, setBucketRecip] = useState<Allocations>(EMPTY);
  // Recurring: prefund N monthly runs up front.
  const [recurring, setRecurring] = useState(false);
  const [months, setMonths] = useState("3");
  const [recResultId, setRecResultId] = useState<string | null>(null);

  const pub = state.status === "unlocked" ? state.publicKey : null;

  useEffect(() => {
    if (!pub) {
      router.replace("/");
      return;
    }
    void getUsdcBalance(pub)
      .then(setAvailUsdc)
      .catch(() => setAvailUsdc("0"));
    setContacts(getContacts(pub));
    const gs = getGroups(pub);
    setGroups(gs);
    // Handoff from /family "Use in Send": auto-apply the chosen group.
    const pending = takePendingGroup();
    if (pending) {
      const g = gs.find((x) => x.id === pending);
      if (g && g.members.length > 0) assignGroup(g);
    }
    // assignGroup only touches stable setters; safe to omit from deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pub, router]);

  // Picking a family group turns on multi-recipient and round-robins the group's
  // members across the buckets, so one tap fills a whole multi-recipient padala.
  function assignGroup(g: FamilyGroup) {
    setSelectedGroupId(g.id);
    setPerBucket(true);
    setRecipient(g.members[0]);
    const next: Allocations = { ...EMPTY };
    CATEGORIES.forEach((c, i) => {
      next[c.key] = g.members[i % g.members.length];
    });
    setBucketRecip(next);
  }

  function onPickGroup(id: string) {
    setSelectedGroupId(id);
    const g = groups.find((x) => x.id === id);
    if (g && g.members.length > 0) assignGroup(g);
  }

  if (state.status !== "unlocked") return null;

  // Available balance in human USDC + PHP.
  const availUsdcHuman = fmtStroops(availUsdc);
  const availablePhp = parseFloat(usdcToPhp(availUsdcHuman).replace(/,/g, ""));

  const totalPhp = CATEGORIES.reduce((acc, c) => {
    const n = parseFloat(alloc[c.key] || "0");
    return acc + (isNaN(n) ? 0 : n);
  }, 0);
  // Recurring escrows allocation × months up front, so the guard scales with it.
  const escrowPhp = recurring
    ? totalPhp * (parseInt(months || "0", 10) || 0)
    : totalPhp;
  const remainingPhp = Math.max(availablePhp - escrowPhp, 0);
  const overspent = escrowPhp > availablePhp + 0.005;

  function setAmt(key: BucketCategory, v: string) {
    setAlloc({ ...alloc, [key]: v });
  }

  // Dump the remaining available balance into one bucket.
  function useRemaining(key: BucketCategory) {
    const otherTotal = CATEGORIES.reduce((acc, c) => {
      if (c.key === key) return acc;
      const n = parseFloat(alloc[c.key] || "0");
      return acc + (isNaN(n) ? 0 : n);
    }, 0);
    const give = Math.max(availablePhp - otherTotal, 0);
    setAlloc({ ...alloc, [key]: give.toFixed(2) });
  }

  function validAddr(a: string): boolean {
    return a.startsWith("G") && a.length === 56;
  }

  const activeGroup = groups.find((g) => g.id === selectedGroupId) ?? null;
  const labelFor = (addr: string) =>
    contacts.find((c) => c.address === addr)?.name ??
    `${addr.slice(0, 4)}…${addr.slice(-4)}`;
  // Per-bucket picker draws from the active group's members, else all contacts.
  const bucketOptions = activeGroup
    ? activeGroup.members.map((a) => ({ address: a, name: labelFor(a) }))
    : contacts.map((c) => ({ address: c.address, name: c.name }));

  async function submit() {
    if (state.status !== "unlocked") return;
    const active = CATEGORIES.filter(
      (c) => parseFloat(alloc[c.key] || "0") > 0
    );
    if (active.length === 0) {
      setStatus("Allocate at least one bucket.");
      return;
    }
    // Resolve each bucket's recipient (per-bucket override falls back to main).
    const buckets = active.map((c) => ({
      category: c.key,
      amount: toStroops(String(phpToUsdcHuman(alloc[c.key]))),
      recipient: perBucket && bucketRecip[c.key] ? bucketRecip[c.key] : recipient,
    }));
    for (const b of buckets) {
      if (!validAddr(b.recipient)) {
        setStatus("Every bucket needs a valid recipient (G...).");
        return;
      }
    }

    const occ = parseInt(months || "0", 10);
    if (recurring && (!occ || occ < 1)) {
      setStatus("Set how many monthly runs to prefund.");
      return;
    }

    setBusy(true);
    setStatus("Simulating…");
    setResultId(null);
    setRecResultId(null);
    try {
      const { tx } = recurring
        ? await buildCreateRecurring({
            senderPub: state.publicKey,
            template: buckets,
            intervalSecs: 30 * 24 * 60 * 60, // ~monthly
            occurrences: occ,
          })
        : await buildCreatePadala({
            senderPub: state.publicKey,
            buckets,
          });
      setStatus("Signing with your wallet…");
      const signedXdr = await signTxXdr(tx.toXDR());
      setStatus("Submitting…");
      const hash = await submitSignedXdr(signedXdr);
      setStatus("Polling for finality…");
      const r = await pollFinality(hash);
      if (r.status === "SUCCESS") {
        // Contract returns the id (u64 -> bigint). Decode robustly.
        const native = r.returnNative;
        const id =
          typeof native === "bigint"
            ? native.toString()
            : typeof native === "number"
              ? String(native)
              : typeof native === "string" && /^\d+$/.test(native)
                ? native
                : null;
        if (recurring) {
          setStatus(
            id
              ? `Recurring padala set up — ${occ} monthly runs prefunded in escrow.`
              : `Recurring set up (tx ${hash.slice(0, 8)}…).`
          );
          setRecResultId(id);
        } else if (id) {
          setStatus("Padala sent and locked in escrow.");
          setResultId(id);
          recordSentPadala(state.publicKey, id);
        } else {
          setStatus(`Sent (tx ${hash.slice(0, 8)}…) — open Track releases to find it.`);
        }
      } else {
        setStatus(`Failed: ${r.status}`);
      }
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageShell>
      <TopAppBar title="Send Padala" back={() => router.back()} />
      <main className="flex flex-1 flex-col gap-lg overflow-y-auto px-margin-mobile pb-[240px] pt-md">
        {/* Recipient */}
        <section className="flex flex-col gap-sm">
          <label className="block font-label-caps text-label-caps uppercase text-on-surface-variant">
            Send to
          </label>

          {/* Family group (GC) — one tap fills every bucket */}
          {groups.length > 0 && (
            <div className="relative">
              <select
                value={selectedGroupId}
                onChange={(e) => onPickGroup(e.target.value)}
                className="h-12 w-full appearance-none rounded-xl border border-tertiary-container/50 bg-tertiary-container/10 pl-10 pr-10 font-body-sm text-body-sm text-on-surface outline-none focus:border-primary"
              >
                <option value="">Use a family group…</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g.members.length})
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <span className="material-symbols-outlined text-tertiary-container" data-weight="fill">
                  groups
                </span>
              </div>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                <span className="material-symbols-outlined text-outline">
                  expand_more
                </span>
              </div>
            </div>
          )}
          {activeGroup && (
            <p className="font-body-sm text-[12px] text-on-surface-variant/70">
              Multi-recipient naka-on — bawat bucket nakatalaga na sa miyembro ng{" "}
              <span className="text-on-surface">{activeGroup.name}</span>. Pwede mo
              pang baguhin sa baba.{" "}
              <a href="/family" className="text-primary underline">
                Edit groups
              </a>
            </p>
          )}

          {/* Saved family members */}
          {contacts.length > 0 && (
            <div className="relative">
              <select
                value={
                  contacts.some((c) => c.address === recipient) ? recipient : ""
                }
                onChange={(e) => setRecipient(e.target.value)}
                className="h-12 w-full appearance-none rounded-xl border border-surface-variant bg-surface-container-lowest pl-10 pr-10 font-body-sm text-body-sm text-on-surface shadow-[0_4px_12px_rgba(0,0,0,0.04)] outline-none focus:border-primary"
              >
                <option value="">Pick a saved family member…</option>
                {contacts.map((c) => (
                  <option key={c.address} value={c.address}>
                    {c.name} ({c.address.slice(0, 4)}…{c.address.slice(-4)})
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <span className="material-symbols-outlined text-outline">
                  group
                </span>
              </div>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                <span className="material-symbols-outlined text-outline">
                  expand_more
                </span>
              </div>
            </div>
          )}

          {/* Raw address input */}
          <div className="flex items-center rounded-xl border border-surface-variant bg-surface-container-lowest p-sm shadow-[0_4px_12px_rgba(0,0,0,0.04)] focus-within:border-primary-container">
            <div className="mr-sm flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary-container text-on-secondary-container">
              <span className="material-symbols-outlined">person</span>
            </div>
            <input
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="G… (Stellar public key)"
              className="flex-1 border-none bg-transparent font-currency-md text-[14px] text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none"
            />
          </div>

          {/* Save as contact — only when a new valid address is typed */}
          {recipient.startsWith("G") &&
            recipient.length === 56 &&
            !contacts.some((c) => c.address === recipient) && (
              <div className="flex items-center gap-sm rounded-lg bg-surface-container-low p-sm">
                <input
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder="Save as… (e.g. Nanay, Kuya Jun)"
                  className="flex-1 border-none bg-transparent font-body-sm text-body-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none"
                />
                <button
                  type="button"
                  disabled={!saveName.trim()}
                  onClick={() => {
                    if (!pub) return;
                    setContacts(
                      saveContact(pub, { name: saveName, address: recipient })
                    );
                    setSaveName("");
                  }}
                  className="flex items-center gap-1 rounded-full bg-primary px-md py-xs font-label-caps text-label-caps uppercase text-on-primary disabled:opacity-40"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    bookmark_add
                  </span>
                  Save
                </button>
              </div>
            )}
        </section>

        {/* Allocator */}
        <div className="flex items-end justify-between px-xs">
          <h2 className="font-headline-sm text-headline-sm text-on-surface">
            Allocate Funds
          </h2>
          <div className="text-right">
            <span className="block font-label-caps text-label-caps uppercase text-on-surface-variant">
              Available
            </span>
            <span className="font-currency-md text-currency-md text-primary-container">
              ₱{availablePhp.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-gutter">
          {CATEGORIES.map((c) => {
            const usdc = phpToUsdcHuman(alloc[c.key] || "0").toFixed(4);
            return (
              <Card key={c.key} className="flex flex-col gap-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-sm">
                    <span className="text-[32px] leading-none">{c.emoji}</span>
                    <div>
                      <h3 className="font-headline-sm text-headline-sm text-on-surface">
                        {c.en}
                      </h3>
                      <span className="font-body-sm text-body-sm text-on-surface-variant">
                        {c.tl}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => useRemaining(c.key)}
                    disabled={availablePhp <= 0}
                    className="rounded-full bg-primary-container/10 px-sm py-base font-label-caps text-label-caps uppercase text-primary transition-colors hover:bg-primary-container/20 disabled:opacity-40"
                  >
                    Use all
                  </button>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-surface-container-low p-sm focus-within:ring-2 focus-within:ring-primary/20">
                  <span className="pl-xs font-currency-md text-currency-md text-on-surface-variant">
                    ₱
                  </span>
                  <input
                    inputMode="decimal"
                    placeholder="0.00"
                    value={alloc[c.key]}
                    onChange={(e) => setAmt(c.key, e.target.value)}
                    className="mx-xs w-full border-none bg-transparent p-0 text-right font-currency-lg text-currency-lg text-on-surface focus:outline-none"
                  />
                </div>
                <div className="text-right font-currency-md text-[12px] text-on-surface-variant/70">
                  ≈ {usdc} USDC
                </div>

                {/* Per-bucket recipient (multi-recipient mode) */}
                {perBucket && parseFloat(alloc[c.key] || "0") > 0 && (
                  <div className="mt-1 border-t border-outline-variant/30 pt-sm">
                    <label className="mb-1 block font-label-caps text-label-caps uppercase text-on-surface-variant">
                      Goes to
                    </label>
                    {bucketOptions.length > 0 ? (
                      <select
                        value={bucketRecip[c.key]}
                        onChange={(e) =>
                          setBucketRecip({ ...bucketRecip, [c.key]: e.target.value })
                        }
                        className="h-11 w-full appearance-none rounded-lg border border-outline-variant bg-surface px-md font-body-sm text-body-sm text-on-surface outline-none focus:border-primary"
                      >
                        <option value="">Same as main recipient</option>
                        {bucketOptions.map((ct) => (
                          <option key={ct.address} value={ct.address}>
                            {ct.name} ({ct.address.slice(0, 4)}…{ct.address.slice(-4)})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        placeholder="G… (defaults to main recipient)"
                        value={bucketRecip[c.key]}
                        onChange={(e) =>
                          setBucketRecip({ ...bucketRecip, [c.key]: e.target.value })
                        }
                        className="h-11 w-full rounded-lg border border-outline-variant bg-surface px-md font-currency-md text-[13px] text-on-surface outline-none focus:border-primary"
                      />
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        {/* Send options — multi-recipient + recurring */}
        <div className="flex flex-col gap-sm rounded-xl border border-outline-variant bg-surface-container-low p-md">
          <label className="flex items-center justify-between gap-sm">
            <span className="flex items-center gap-xs font-body-md text-body-md text-on-surface">
              <span className="material-symbols-outlined text-tertiary-container" data-weight="fill">
                groups
              </span>
              Send buckets to different family members
            </span>
            <input
              type="checkbox"
              checked={perBucket}
              onChange={(e) => setPerBucket(e.target.checked)}
              className="h-5 w-5 accent-primary"
            />
          </label>

          <label className="flex items-center justify-between gap-sm border-t border-outline-variant/30 pt-sm">
            <span className="flex items-center gap-xs font-body-md text-body-md text-on-surface">
              <span className="material-symbols-outlined text-tertiary-container" data-weight="fill">
                event_repeat
              </span>
              Make it monthly (recurring)
            </span>
            <input
              type="checkbox"
              checked={recurring}
              onChange={(e) => setRecurring(e.target.checked)}
              className="h-5 w-5 accent-primary"
            />
          </label>

          {recurring && (
            <div className="flex items-center justify-between gap-sm rounded-lg bg-surface-container px-md py-sm">
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                Prefund how many months?
              </span>
              <input
                inputMode="numeric"
                value={months}
                onChange={(e) => setMonths(e.target.value.replace(/[^0-9]/g, ""))}
                className="w-16 rounded-lg border border-outline-variant bg-surface px-sm py-1 text-center font-currency-md text-[16px] text-on-surface focus:border-primary focus:outline-none"
              />
            </div>
          )}
          {recurring && (
            <p className="font-body-sm text-[12px] text-on-surface-variant/70">
              Total escrowed up front = allocation × months. Each month anyone can
              release the next run; cancel anytime to refund the rest.
            </p>
          )}
        </div>

        {/* Trust disclosure */}
        <details className="rounded-xl border border-outline-variant bg-surface-container-low p-md">
          <summary className="flex cursor-pointer list-none items-center justify-between font-body-md text-body-md text-on-surface [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-xs">
              <span
                className="material-symbols-outlined text-tertiary-container"
                data-weight="fill"
              >
                shield
              </span>
              <span className="font-headline-sm text-[16px]">Why this is safe</span>
            </span>
            <span className="material-symbols-outlined text-on-surface-variant transition-transform group-open:rotate-180">
              expand_more
            </span>
          </summary>
          <p className="mt-sm border-t border-outline-variant/30 pt-xs font-body-sm text-body-sm text-on-surface-variant">
            Ang pera mo ay naka-lock sa layunin nito at protektado ng smart
            contract. Restricted bucket ay para lamang sa whitelisted na
            merchants — paaralan, klinika, biller. Free Cash ay walang
            restriction.
          </p>
        </details>

        {status && (
          <Card>
            <p className="font-body-sm text-body-sm text-on-surface">{status}</p>
            {resultId && <ClaimShare padalaId={resultId} />}
            {recResultId && (
              <a
                href={`/recurring/${recResultId}`}
                className="mt-sm inline-flex items-center gap-1 rounded-full bg-primary px-md py-xs font-label-caps text-label-caps uppercase text-on-primary"
              >
                <span className="material-symbols-outlined text-[16px]">event_repeat</span>
                Manage recurring
              </a>
            )}
          </Card>
        )}
      </main>

      {/* Action footer — sits ABOVE the bottom nav (nav h-72px) */}
      <div className="fixed inset-x-0 bottom-[72px] z-40 mx-auto w-full max-w-[480px] rounded-t-xl bg-surface-container shadow-[0_-8px_20px_rgba(93,5,24,0.08)] pt-xs">
        <div className="px-margin-mobile pb-sm">
          <div className="mb-1 flex items-center justify-between px-xs">
            <span className="font-body-md text-body-md text-on-surface-variant">
              {recurring ? "Monthly Allocation" : "Total Allocation"}
            </span>
            <span
              className={`font-currency-lg text-currency-lg ${
                overspent ? "text-error" : "text-on-surface"
              }`}
            >
              ₱ {totalPhp.toFixed(2)}
            </span>
          </div>
          {recurring && (
            <div className="mb-1 flex items-center justify-between px-xs">
              <span className="font-label-caps text-label-caps uppercase text-on-surface-variant">
                Escrow now (× {months || 0})
              </span>
              <span className="font-currency-md text-currency-md text-tertiary-container">
                ₱ {(totalPhp * (parseInt(months || "0", 10) || 0)).toFixed(2)}
              </span>
            </div>
          )}
          <div className="mb-sm flex items-center justify-between px-xs">
            <span className="font-label-caps text-label-caps uppercase text-on-surface-variant">
              {overspent ? "Over budget by" : "Remaining"}
            </span>
            <span
              className={`font-currency-md text-currency-md ${
                overspent ? "text-error" : "text-on-surface-variant"
              }`}
            >
              ₱ {(overspent ? escrowPhp - availablePhp : remainingPhp).toFixed(2)}
            </span>
          </div>
          <button
            onClick={submit}
            disabled={busy || totalPhp <= 0 || overspent}
            className="flex h-[56px] w-full items-center justify-center gap-xs rounded-full bg-secondary-container font-headline-md text-[18px] text-on-secondary-container transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="material-symbols-outlined" data-weight="fill">
              lock
            </span>
            {busy
              ? "Sending…"
              : overspent
                ? "Not enough balance"
                : recurring
                  ? "Lock & Schedule"
                  : "Lock & Send"}
          </button>
        </div>
      </div>
      <BottomNav />
    </PageShell>
  );
}
