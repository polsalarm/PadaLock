"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@/lib/wallet-context";
import { newMnemonic } from "@/lib/wallet";
import {
  Button,
  Card,
  Input,
  PageShell,
  TopAppBar,
} from "@/components/ui";

type Step = "intro" | "mnemonic" | "password";

export default function OnboardPage() {
  const router = useRouter();
  const { create, connectExternal } = useWallet();
  const [step, setStep] = useState<Step>("intro");
  const [mnemonic, setMnemonic] = useState<string>("");
  const [acked, setAcked] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startCreate() {
    setMnemonic(newMnemonic());
    setStep("mnemonic");
  }

  async function copy() {
    await navigator.clipboard.writeText(mnemonic);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function finalize() {
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await create(mnemonic, password);
      router.replace("/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create wallet.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageShell>
      <TopAppBar title="Create Wallet" />
      <main className="flex flex-1 flex-col gap-lg px-margin-mobile py-lg">
        {step === "intro" && (
          <>
            <Card>
              <h2 className="mb-xs font-headline-md text-headline-md text-on-surface">
                Buo at ligtas.
              </h2>
              <p className="font-body-md text-body-md text-on-surface-variant">
                Walang bangko, walang extension. Mag-generate kami ng 12-word
                recovery phrase at i-encrypt sa password mo. Local lang sa phone
                mo.
              </p>
            </Card>
            <div className="rounded-xl border border-outline-variant bg-surface-container-low p-md">
              <p className="font-body-sm text-body-sm italic text-on-surface-variant">
                &ldquo;Ikaw lang ang may hawak ng susi.&rdquo;
              </p>
            </div>
            <Button variant="golden" onClick={startCreate}>
              <span className="material-symbols-outlined" data-weight="fill">
                key
              </span>
              Generate recovery phrase
            </Button>
            <div className="flex items-center gap-sm">
              <div className="h-px flex-1 bg-outline-variant/50" />
              <span className="font-label-caps text-label-caps uppercase text-on-surface-variant">
                or
              </span>
              <div className="h-px flex-1 bg-outline-variant/50" />
            </div>
            <Button
              variant="ghost"
              onClick={async () => {
                setError(null);
                try {
                  await connectExternal();
                  router.replace("/dashboard");
                } catch (e) {
                  setError(
                    e instanceof Error ? e.message : "Wallet connect failed"
                  );
                }
              }}
            >
              <span className="material-symbols-outlined">wallet</span>
              Connect external wallet
            </Button>
            {error && (
              <p className="text-center font-body-sm text-body-sm text-error">
                {error}
              </p>
            )}
          </>
        )}

        {step === "mnemonic" && (
          <>
            <Card>
              <div className="mb-sm flex items-center justify-between">
                <h2 className="font-headline-sm text-headline-sm text-on-surface">
                  Your 12-word phrase
                </h2>
                <button
                  onClick={copy}
                  className="flex items-center gap-1 rounded-full bg-primary-container/10 px-sm py-base font-label-caps text-label-caps uppercase text-primary"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {copied ? "check" : "content_copy"}
                  </span>
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2 rounded-lg bg-surface-container-low p-sm">
                {mnemonic.split(" ").map((w, i) => (
                  <div
                    key={i}
                    className="flex items-baseline gap-1 rounded-md bg-surface-container-lowest px-2 py-1.5 font-body-sm text-body-sm text-on-surface"
                  >
                    <span className="font-label-caps text-label-caps text-on-surface-variant/60">
                      {i + 1}
                    </span>
                    <span className="font-semibold">{w}</span>
                  </div>
                ))}
              </div>
            </Card>
            <label className="flex items-start gap-2 px-xs text-body-sm text-on-surface-variant">
              <input
                type="checkbox"
                checked={acked}
                onChange={(e) => setAcked(e.target.checked)}
                className="mt-1 accent-primary"
              />
              I&apos;ve written these 12 words down somewhere safe. Losing them =
              losing the wallet.
            </label>
            <Button disabled={!acked} onClick={() => setStep("password")}>
              Continue
            </Button>
          </>
        )}

        {step === "password" && (
          <>
            <Card>
              <h2 className="mb-md font-headline-sm text-headline-sm text-on-surface">
                Set your password
              </h2>
              <div className="flex flex-col gap-md">
                <Input
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoFocus
                />
                <Input
                  label="Confirm password"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </div>
              {error && (
                <p className="mt-sm font-body-sm text-body-sm text-error">
                  {error}
                </p>
              )}
            </Card>
            <div className="flex gap-sm">
              <Button
                variant="ghost"
                onClick={() => setStep("mnemonic")}
                disabled={busy}
                className="flex-1"
              >
                Back
              </Button>
              <Button onClick={finalize} disabled={busy} className="flex-1">
                {busy ? "Encrypting…" : "Create wallet"}
              </Button>
            </div>
          </>
        )}
      </main>
    </PageShell>
  );
}
