"use client";

/**
 * Saved recipients ("Padala contacts"), per sender pubkey, in localStorage.
 * Lets an OFW pick family by nickname instead of pasting a G-address each time.
 */

const KEY = "padalock.contacts.v1";

export interface Contact {
  name: string;
  address: string;
}

type ContactMap = Record<string, Contact[]>;

function readMap(): ContactMap {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(KEY) ?? "{}") as ContactMap;
  } catch {
    return {};
  }
}

function writeMap(m: ContactMap): void {
  window.localStorage.setItem(KEY, JSON.stringify(m));
}

export function getContacts(ownerPub: string): Contact[] {
  return readMap()[ownerPub] ?? [];
}

/** Add or update a contact (keyed by address). Returns the new list. */
export function saveContact(
  ownerPub: string,
  contact: Contact
): Contact[] {
  const m = readMap();
  const list = (m[ownerPub] ?? []).filter(
    (c) => c.address !== contact.address
  );
  list.unshift({ name: contact.name.trim(), address: contact.address.trim() });
  m[ownerPub] = list;
  writeMap(m);
  return list;
}

export function removeContact(ownerPub: string, address: string): Contact[] {
  const m = readMap();
  m[ownerPub] = (m[ownerPub] ?? []).filter((c) => c.address !== address);
  writeMap(m);
  return m[ownerPub];
}

/** Resolve an address to a saved nickname, if any. */
export function contactName(ownerPub: string, address: string): string | null {
  return getContacts(ownerPub).find((c) => c.address === address)?.name ?? null;
}
