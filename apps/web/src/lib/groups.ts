"use client";

/**
 * Family groups ("GC") — a named bundle of recipient addresses, per owner
 * pubkey, in localStorage. Lets an OFW define their family once, then auto-fill
 * a whole multi-recipient padala in one tap instead of assigning each bucket.
 *
 * Members are stored as raw addresses; display names resolve through the
 * existing contacts book ([[contacts]]) so renaming a contact propagates.
 */

import { getContacts } from "./contacts";

const KEY = "padalock.groups.v1";
// One-shot handoff: /family "Use in Send" stashes a group id here; /send picks
// it up on mount and clears it.
const PENDING_KEY = "padalock.group.pending";

export interface FamilyGroup {
  id: string;
  name: string;
  /** Recipient G-addresses. Names resolved via contacts at render time. */
  members: string[];
}

type GroupMap = Record<string, FamilyGroup[]>;

function readMap(): GroupMap {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(KEY) ?? "{}") as GroupMap;
  } catch {
    return {};
  }
}

function writeMap(m: GroupMap): void {
  window.localStorage.setItem(KEY, JSON.stringify(m));
}

export function getGroups(ownerPub: string): FamilyGroup[] {
  return readMap()[ownerPub] ?? [];
}

export function getGroup(ownerPub: string, id: string): FamilyGroup | null {
  return getGroups(ownerPub).find((g) => g.id === id) ?? null;
}

/** Create or update a group (keyed by id). Returns the new list. */
export function saveGroup(ownerPub: string, group: FamilyGroup): FamilyGroup[] {
  const m = readMap();
  const list = (m[ownerPub] ?? []).filter((g) => g.id !== group.id);
  list.unshift({
    id: group.id,
    name: group.name.trim(),
    // de-dupe member addresses, keep order
    members: [...new Set(group.members.map((a) => a.trim()).filter(Boolean))],
  });
  m[ownerPub] = list;
  writeMap(m);
  return list;
}

export function deleteGroup(ownerPub: string, id: string): FamilyGroup[] {
  const m = readMap();
  m[ownerPub] = (m[ownerPub] ?? []).filter((g) => g.id !== id);
  writeMap(m);
  return m[ownerPub];
}

/** Resolve a member address to a saved contact nickname, else a truncation. */
export function memberLabel(ownerPub: string, address: string): string {
  const c = getContacts(ownerPub).find((x) => x.address === address);
  if (c) return c.name;
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}

export function newGroupId(): string {
  return `g_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

/* ── one-shot handoff from /family → /send ── */

export function setPendingGroup(id: string): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(PENDING_KEY, id);
}

export function takePendingGroup(): string | null {
  if (typeof window === "undefined") return null;
  const id = window.sessionStorage.getItem(PENDING_KEY);
  if (id) window.sessionStorage.removeItem(PENDING_KEY);
  return id;
}
