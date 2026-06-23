"use client";

import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/* ───────── Brand ───────── */

/** PadaLock mascot head + wordmark. Reusable across headers/empty states. */
export function BrandLogo({
  size = "md",
  withText = true,
  className = "",
}: {
  size?: "sm" | "md" | "lg";
  withText?: boolean;
  className?: string;
}) {
  const h = size === "lg" ? 56 : size === "sm" ? 32 : 44;
  const text =
    size === "lg" ? "text-headline-md" : "text-headline-sm";
  return (
    <span className={`inline-flex items-center gap-xs ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/mascot/full.png"
        alt={withText ? "" : "PadaLock"}
        aria-hidden={withText || undefined}
        style={{ height: h, width: "auto" }}
        className="drop-shadow-sm"
      />
      {withText && (
        <span className={`font-headline-md ${text} font-bold text-primary`}>
          PadaLock
        </span>
      )}
    </span>
  );
}

/* ───────── Layout shells ───────── */

export function PageShell({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className="relative flex min-h-screen w-full flex-col bg-surface-bright">
      <div className="sun-motif-bg" />
      <div
        className={`mx-auto flex w-full max-w-[480px] flex-1 flex-col bg-surface relative z-10 ${className}`}
      >
        {children}
      </div>
    </div>
  );
}

export function TopAppBar({
  title,
  back,
  trailing,
}: {
  title?: string;
  back?: () => void;
  trailing?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-40 bg-surface/90 backdrop-blur-md">
      <div className="flex h-touch-target items-center justify-between px-margin-mobile pt-md">
        {back ? (
          <button
            aria-label="Back"
            onClick={back}
            className="-ml-xs flex h-touch-target w-touch-target items-center justify-center text-primary hover:opacity-80 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              arrow_back
            </span>
          </button>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src="/mascot/full.png"
            alt=""
            aria-hidden="true"
            style={{ height: 40, width: "auto" }}
            className="drop-shadow-sm"
          />
        )}
        <h1 className="font-headline-md text-headline-md font-bold text-primary">
          {title ?? "PadaLock"}
        </h1>
        <div className="-mr-xs flex h-touch-target w-touch-target items-center justify-center">
          {trailing}
        </div>
      </div>
    </header>
  );
}

export function BottomNav() {
  const path = usePathname();
  const tabs = [
    { href: "/dashboard", icon: "home", label: "Home" },
    { href: "/history", icon: "account_balance_wallet", label: "Padala" },
    { href: "/settings", icon: "settings", label: "Settings" },
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 mx-auto flex h-[72px] w-full max-w-[480px] items-center justify-around rounded-t-xl bg-surface-container px-md pb-safe shadow-[0_-8px_20px_rgba(93,5,24,0.08)]">
      {tabs.map((t) => {
        const active = path === t.href || (t.href === "/dashboard" && path === "/");
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={`flex flex-col items-center justify-center rounded-full px-lg py-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              active
                ? "bg-primary text-on-primary"
                : "text-on-surface-variant"
            }`}
          >
            <span
              className="material-symbols-outlined"
              data-weight={active ? "fill" : undefined}
              aria-hidden="true"
            >
              {t.icon}
            </span>
            <span className="mt-1 font-label-caps text-label-caps">{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

/* ───────── Primitives ───────── */

export function Card({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={`rounded-xl border border-surface-variant/50 bg-surface-container-lowest p-md shadow-[0_4px_12px_rgba(0,0,0,0.04)] ${className}`}
    >
      {children}
    </div>
  );
}

export function Button({
  children,
  className = "",
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "golden" | "ghost";
}) {
  const base =
    "flex h-[56px] w-full items-center justify-center gap-sm rounded-full font-headline-sm text-headline-sm transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface";
  const styles = {
    primary: "bg-primary text-on-primary hover:opacity-90",
    golden:
      "bg-secondary-container text-on-secondary-container shadow-[0_8px_20px_rgba(93,5,24,0.08)]",
    ghost:
      "border border-outline-variant bg-surface-container-lowest text-on-surface hover:bg-surface-container-low",
  };
  return (
    <button className={`${base} ${styles[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function PillButton({
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`min-h-[36px] rounded-full bg-primary-container/10 px-sm py-base font-label-caps text-label-caps uppercase text-primary hover:bg-primary-container/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Input({
  label,
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  return (
    <div>
      {label && (
        <label className="mb-xs block font-label-caps text-label-caps uppercase text-on-surface-variant">
          {label}
        </label>
      )}
      <input
        {...props}
        className={`w-full rounded-lg border border-outline-variant bg-surface px-md py-sm font-body-md text-body-md text-on-surface outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary ${className}`}
      />
    </div>
  );
}

/* ───────── Money display ───────── */

export function MoneyPHP({
  php,
  usdc,
  size = "lg",
}: {
  php: string;
  usdc?: string;
  size?: "lg" | "xl" | "md";
}) {
  const big = {
    md: "text-currency-lg",
    lg: "text-[40px] leading-[48px]",
    xl: "text-[48px] leading-[56px]",
  }[size];
  return (
    <div className="flex flex-col">
      <div className="flex items-baseline gap-1">
        <span className="font-currency-md text-currency-md text-on-surface">₱</span>
        <span className={`font-currency-lg ${big} font-bold tracking-tight text-on-surface`}>
          {php}
        </span>
      </div>
      {usdc && (
        <span className="mt-1 font-currency-md text-[12px] text-on-surface-variant/60">
          ≈ {usdc} USDC
        </span>
      )}
    </div>
  );
}

export function StatusBadge({
  children,
  variant = "neutral",
}: {
  children: ReactNode;
  variant?: "neutral" | "ready" | "claimed" | "restricted";
}) {
  const styles = {
    neutral: "bg-surface-container text-on-surface-variant",
    ready: "bg-secondary-fixed/30 text-on-secondary-fixed-variant",
    claimed: "bg-tertiary-fixed/30 text-tertiary-container",
    restricted: "bg-error-container/20 text-on-error-container",
  }[variant];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-sm py-1 font-label-caps text-label-caps uppercase ${styles}`}
    >
      {children}
    </span>
  );
}
