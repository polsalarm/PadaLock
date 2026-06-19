"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getPadala } from "@padalock/sdk";
import { useWallet } from "@/lib/wallet-context";
import { fmtStroops, fmtStroopsPhp } from "@/lib/balance";
import { getReceivedPadalaIds, getSentPadalaIds } from "@/lib/history";
import { contactName } from "@/lib/contacts";
import {
  BottomNav,
  Button,
  Card,
  PageShell,
  StatusBadge,
  TopAppBar,
} from "@/components/ui";

type Tab = "sent" | "received";

interface Row {
  id: string;
  totalUsdc: string; // tab-relevant total (sent: whole padala; received: my buckets)
  claimedCount: number;
  bucketCount: number;
  title: string; // counterparty display name
  extra: number; // +N other recipients (sent, multi-recipient)
}

function shorten(a: string): string {
  return `${a.slice(0, 5)}…${a.slice(-4)}`;
}

export default function HistoryPage() {
  const router = useRouter();
  const { state } = useWallet();
  const [tab, setTab] = useState<Tab>("sent");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (pub: string, which: Tab) => {
    setLoading(true);
    const ids =
      which === "sent" ? getSentPadalaIds(pub) : getReceivedPadalaIds(pub);
    const out: Row[] = [];
    for (const id of ids) {
      try {
        const view = await getPadala(pub, String(id));
        if (which === "sent") {
          const recipients = [...new Set(view.buckets.map((b) => b.recipient))];
          out.push({
            id: String(id),
            totalUsdc: view.buckets
              .reduce((acc, b) => acc + BigInt(b.amount), 0n)
              .toString(),
            claimedCount: view.buckets.filter((b) => b.claimed).length,
            bucketCount: view.buckets.length,
            title:
              contactName(pub, recipients[0]) ?? shorten(recipients[0] ?? ""),
            extra: recipients.length - 1,
          });
        } else {
          // Received: only the buckets addressed to this wallet.
          const mine = view.buckets.filter((b) => b.recipient === pub);
          if (mine.length === 0) continue;
          out.push({
            id: String(id),
            totalUsdc: mine
              .reduce((acc, b) => acc + BigInt(b.amount), 0n)
              .toString(),
            claimedCount: mine.filter((b) => b.claimed).length,
            bucketCount: mine.length,
            title: contactName(pub, view.sender) ?? shorten(view.sender),
            extra: 0,
          });
        }
      } catch {
        // padala not found / pruned — skip
      }
    }
    setRows(out);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (state.status !== "unlocked") {
      router.replace("/");
      return;
    }
    void load(state.publicKey, tab);
  }, [state, router, load, tab]);

  if (state.status !== "unlocked") return null;

  const totalUsdc = rows
    .reduce((acc, r) => acc + BigInt(r.totalUsdc), 0n)
    .toString();
  const activeCount = rows.filter((r) => r.claimedCount < r.bucketCount).length;
  const sent = tab === "sent";

  return (
    <PageShell>
      <TopAppBar title="My Padala" />
      <main className="flex flex-1 flex-col gap-gutter px-margin-mobile pb-[100px] pt-md">
        {/* Sent / Received toggle */}
        <div className="flex rounded-full bg-surface-variant p-1">
          {(["sent", "received"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 rounded-full py-2 font-label-caps text-label-caps uppercase transition-colors ${
                tab === t
                  ? "bg-primary text-on-primary"
                  : "text-on-surface-variant"
              }`}
            >
              {t === "sent" ? "Padala ko" : "Natanggap"}
            </button>
          ))}
        </div>

        {/* Summary strip */}
        <div className="flex gap-sm">
          <div className="flex-1 rounded-lg border border-surface-variant bg-surface-container-lowest p-sm shadow-[0_4px_12px_rgba(0,0,0,0.04)]">
            <div className="font-label-caps text-label-caps uppercase text-on-surface-variant">
              {sent ? "Total sent" : "Total received"}
            </div>
            <div className="mt-1 font-currency-md text-currency-md text-primary">
              ₱{fmtStroopsPhp(totalUsdc)}
            </div>
          </div>
          <div className="flex-1 rounded-lg border border-surface-variant bg-surface-container-lowest p-sm shadow-[0_4px_12px_rgba(0,0,0,0.04)]">
            <div className="font-label-caps text-label-caps uppercase text-on-surface-variant">
              {sent ? "Active" : "To claim"}
            </div>
            <div className="mt-1 font-currency-md text-currency-md text-secondary-container">
              {activeCount}
            </div>
          </div>
        </div>

        {loading && (
          <Card>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Loading your padala…
            </p>
          </Card>
        )}

        {!loading && rows.length === 0 && (
          <Card className="flex flex-col items-center py-xl text-center">
            <span
              className="material-symbols-outlined text-[48px] text-secondary-container"
              data-weight="fill"
            >
              mark_email_read
            </span>
            <h2 className="mt-sm font-headline-sm text-headline-sm text-on-surface">
              {sent ? "Wala pang padala" : "Wala ka pang natatanggap"}
            </h2>
            <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
              {sent
                ? "Magpadala para makita dito ang history mo."
                : "Lalabas dito ang mga padalang para sa iyo."}
            </p>
            {sent && (
              <Link href="/send" className="mt-md w-full">
                <Button variant="golden">
                  <span className="material-symbols-outlined" data-weight="fill">
                    send
                  </span>
                  Send padala
                </Button>
              </Link>
            )}
          </Card>
        )}

        <div className="flex flex-col gap-sm">
          {rows.map((r) => {
            const pct =
              r.bucketCount > 0
                ? Math.round((r.claimedCount / r.bucketCount) * 100)
                : 0;
            const status =
              r.claimedCount === 0
                ? { label: "Locked", variant: "neutral" as const }
                : r.claimedCount === r.bucketCount
                  ? { label: "Fully claimed", variant: "claimed" as const }
                  : { label: "Partly claimed", variant: "ready" as const };
            const href = sent ? `/padala/${r.id}` : `/claim/${r.id}`;
            return (
              <Link key={r.id} href={href}>
                <Card>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-sm">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-tertiary-container/10 font-headline-sm text-headline-sm text-tertiary-container">
                        {r.title.replace(/[^A-Za-z]/, "").charAt(0).toUpperCase() ||
                          "?"}
                      </div>
                      <div>
                        <div className="font-body-sm text-body-sm font-semibold text-on-surface">
                          {r.title +
                            (r.extra > 0 ? ` +${r.extra}` : "")}
                        </div>
                        <div className="font-body-sm text-body-sm text-on-surface-variant">
                          {sent ? "Padala" : "Galing"} #{r.id}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-currency-md text-currency-md font-semibold text-primary">
                        ₱{fmtStroopsPhp(r.totalUsdc)}
                      </div>
                      <div className="font-currency-md text-[11px] text-on-surface-variant/60">
                        {fmtStroops(r.totalUsdc)} USDC
                      </div>
                    </div>
                  </div>

                  <div className="mt-sm h-2 w-full overflow-hidden rounded-full bg-surface-variant">
                    <div
                      className="h-full bg-tertiary-container transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="font-body-sm text-body-sm text-on-surface-variant">
                      {r.claimedCount} of {r.bucketCount} buckets claimed
                    </span>
                    <StatusBadge variant={status.variant}>
                      {status.label}
                    </StatusBadge>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      </main>
      <BottomNav />
    </PageShell>
  );
}
