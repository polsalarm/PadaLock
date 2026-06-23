"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@/lib/wallet-context";
import { Button, Card, Input, PageShell, TopAppBar } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const { unlock, destroy, connectExternal } = useWallet();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await unlock(password);
      router.replace("/dashboard");
    } catch {
      setError("Wrong password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageShell>
      <TopAppBar title="Unlock" />
      <main className="flex flex-1 flex-col gap-lg px-margin-mobile py-lg">
        <div className="mt-md flex flex-col items-center text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/mascot/full.png"
            alt="PadaLock mascot"
            className="h-32 w-auto drop-shadow-xl"
          />
          <h2 className="mt-sm font-headline-md text-headline-md text-on-surface">
            Welcome back
          </h2>
          <p className="mt-1 font-body-md text-body-md text-on-surface-variant">
            Enter your password to unlock PadaLock.
          </p>
        </div>

        <Card>
          <form onSubmit={submit} className="flex flex-col gap-md">
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
            {error && (
              <p className="font-body-sm text-body-sm text-error">{error}</p>
            )}
            <Button disabled={busy}>{busy ? "Unlocking…" : "Unlock"}</Button>
          </form>
          <div className="mt-md flex items-center justify-center gap-2 opacity-50">
            <span className="material-symbols-outlined text-[20px]">
              fingerprint
            </span>
            <span className="font-label-caps text-label-caps uppercase">
              Biometrics — soon
            </span>
          </div>
        </Card>

        <Button
          variant="ghost"
          onClick={async () => {
            setError(null);
            try {
              await connectExternal();
              router.replace("/dashboard");
            } catch (e) {
              setError(e instanceof Error ? e.message : "Wallet connect failed");
            }
          }}
        >
          <span className="material-symbols-outlined">wallet</span>
          Connect external wallet instead
        </Button>

        <button
          onClick={() => {
            if (
              confirm(
                "Forget this wallet on this device? Backup your phrase first."
              )
            )
              destroy();
          }}
          className="text-center font-body-sm text-body-sm text-on-surface-variant underline"
        >
          Forget wallet
        </button>
      </main>
    </PageShell>
  );
}
