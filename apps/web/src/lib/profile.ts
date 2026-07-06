"use client";

/**
 * Lightweight local profile — currently just a display username captured at
 * onboarding. Stored in localStorage (device-local, no server). Used to label
 * feedback so app submissions carry a human name instead of a wallet address.
 */

const USERNAME_KEY = "padalock.username.v1";

export function getUsername(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(USERNAME_KEY) ?? "";
}

export function setUsername(name: string): void {
  if (typeof window === "undefined") return;
  const clean = name.trim().slice(0, 40);
  if (clean) window.localStorage.setItem(USERNAME_KEY, clean);
  else window.localStorage.removeItem(USERNAME_KEY);
}
