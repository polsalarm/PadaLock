"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@/lib/wallet-context";
import { PhoneFrame } from "@/components/phone-frame";

export default function Splash() {
  const router = useRouter();
  const { state } = useWallet();

  // Returning users skip the landing — route straight to their app.
  useEffect(() => {
    if (state.status === "loading") return;
    if (state.status === "locked") router.replace("/login");
    else if (state.status === "unlocked") router.replace("/dashboard");
  }, [state, router]);

  // While resolving, or for returning users mid-redirect, show the spinner.
  if (state.status === "loading" || state.status === "locked" || state.status === "unlocked") {
    return (
      <div className="relative flex h-screen w-full flex-col items-center justify-center overflow-hidden bg-primary-container">
        <div
          className="absolute left-1/2 top-1/2 h-[200vw] w-[200vw] -translate-x-1/2 -translate-y-1/2 animate-[spin_20s_linear_infinite] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(255,199,44,0.18) 0%, rgba(255,199,44,0) 60%)",
          }}
        />
        <main className="relative z-10 flex flex-col items-center px-margin-mobile text-center">
          <div className="relative mb-lg flex h-44 w-44 items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-secondary-container opacity-20 blur-2xl" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/mascot/full.png"
              alt="PadaLock mascot — a friendly padlock with a heart"
              className="relative z-10 h-44 w-auto animate-[bounce_3s_ease-in-out_infinite] drop-shadow-2xl"
            />
          </div>
          <h1 className="font-display-lg text-display-lg tracking-tight text-surface">
            PadaLock
          </h1>
          <div className="mt-xl flex space-x-2">
            {[0, 0.2, 0.4].map((d, i) => (
              <span
                key={i}
                className="h-3 w-3 animate-bounce rounded-full bg-secondary-container"
                style={{ animationDelay: `${d}s` }}
              />
            ))}
          </div>
        </main>
      </div>
    );
  }

  // First-time visitors get the landing hero.
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-primary-container">
      <div
        className="pointer-events-none absolute -right-40 -top-40 h-[60vw] w-[60vw] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(255,199,44,0.22) 0%, rgba(255,199,44,0) 65%)",
        }}
      />
      <main className="relative z-10 mx-auto flex min-h-screen max-w-[72rem] flex-col items-center gap-xl px-margin-mobile py-xl md:flex-row md:justify-between md:gap-lg md:py-0">
        {/* Copy + CTA */}
        <div className="flex w-full max-w-[32rem] flex-col items-center text-center md:items-start md:text-left">
          <span className="inline-flex items-center gap-xs">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/mascot/full.png"
              alt="PadaLock mascot"
              className="h-12 w-auto drop-shadow-lg"
            />
            <span className="font-display-lg text-headline-md font-bold text-surface">
              PadaLock
            </span>
          </span>
          <h1 className="mt-lg w-full font-display-lg text-display-lg leading-tight tracking-tight text-surface">
            Padala na may pangako.
          </h1>
          <p className="mt-md w-full max-w-[28rem] font-body-lg text-body-lg text-surface-variant opacity-90">
            Ipadala ang USDC na nakahati sa tuition, kuryente, gamot at pang-araw-araw.
            Ang pamilya ang kumukuha — restricted buckets, whitelisted merchants lang.
          </p>
          <div className="mt-xl flex w-full flex-col gap-sm sm:w-auto sm:flex-row">
            <button
              onClick={() => router.push("/onboard")}
              className="w-full whitespace-nowrap rounded-full bg-secondary-container px-xl py-md text-center font-headline-sm text-body-lg font-bold text-on-secondary-container shadow-lg transition active:scale-95 sm:w-auto"
            >
              Magsimula
            </button>
            <button
              onClick={() => router.push("/login")}
              className="w-full whitespace-nowrap rounded-full border border-surface/30 px-xl py-md text-center font-headline-sm text-body-lg font-semibold text-surface transition active:scale-95 sm:w-auto"
            >
              May wallet na ako
            </button>
          </div>
        </div>

        {/* Phone mockup hero */}
        <PhoneFrame bg="bg-transparent" className="shrink-0 p-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/preview-send.png"
            alt="PadaLock send screen — allocate funds into purpose buckets"
            className="block w-full"
          />
        </PhoneFrame>
      </main>
    </div>
  );
}
