"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@/lib/wallet-context";

export default function Splash() {
  const router = useRouter();
  const { state } = useWallet();

  useEffect(() => {
    if (state.status === "loading") return;
    const t = setTimeout(() => {
      if (state.status === "no-wallet") router.replace("/onboard");
      else if (state.status === "locked") router.replace("/login");
      else if (state.status === "unlocked") router.replace("/dashboard");
    }, 900);
    return () => clearTimeout(t);
  }, [state, router]);

  return (
    <div className="relative flex h-screen w-full flex-col items-center justify-center overflow-hidden bg-primary-container">
      <div className="absolute left-1/2 top-1/2 h-[200vw] w-[200vw] -translate-x-1/2 -translate-y-1/2 animate-[spin_20s_linear_infinite] rounded-full"
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
        <p className="mt-sm font-body-lg text-body-lg text-surface-variant opacity-90">
          Padala na may pangako.
        </p>
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
