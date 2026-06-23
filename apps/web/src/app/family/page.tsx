"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@/lib/wallet-context";
import { getContacts, saveContact, type Contact } from "@/lib/contacts";
import {
  deleteGroup,
  getGroups,
  memberLabel,
  newGroupId,
  saveGroup,
  setPendingGroup,
  type FamilyGroup,
} from "@/lib/groups";
import { BottomNav, Card, PageShell, TopAppBar } from "@/components/ui";

function validAddr(a: string): boolean {
  return a.startsWith("G") && a.length === 56;
}

export default function FamilyPage() {
  const router = useRouter();
  const { state } = useWallet();
  const [groups, setGroups] = useState<FamilyGroup[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [newName, setNewName] = useState("");

  const pub = state.status === "unlocked" ? state.publicKey : null;

  useEffect(() => {
    if (!pub) {
      router.replace("/");
      return;
    }
    setGroups(getGroups(pub));
    setContacts(getContacts(pub));
  }, [pub, router]);

  if (state.status !== "unlocked" || !pub) return null;

  function refresh() {
    if (!pub) return;
    setGroups(getGroups(pub));
    setContacts(getContacts(pub));
  }

  function createGroup() {
    if (!pub || !newName.trim()) return;
    saveGroup(pub, { id: newGroupId(), name: newName, members: [] });
    setNewName("");
    refresh();
  }

  return (
    <PageShell>
      <TopAppBar title="Family Groups" back={() => router.back()} />
      <main className="flex flex-1 flex-col gap-gutter px-margin-mobile pb-[100px] pt-md">
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Gumawa ng grupo ng pamilya (parang GC). Sa Send, isang pindot lang —
          mahahati agad ang padala sa bawat miyembro.
        </p>

        {/* Create a new group */}
        <Card className="flex flex-col gap-sm">
          <label className="font-label-caps text-label-caps uppercase text-on-surface-variant">
            New family group
          </label>
          <div className="flex items-center gap-sm">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Pamilya Santos"
              className="h-11 flex-1 rounded-lg border border-outline-variant bg-surface px-md font-body-sm text-body-sm text-on-surface outline-none focus:border-primary"
            />
            <button
              type="button"
              disabled={!newName.trim()}
              onClick={createGroup}
              className="flex items-center gap-1 rounded-full bg-primary px-md py-xs font-label-caps text-label-caps uppercase text-on-primary disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <span className="material-symbols-outlined text-[16px]" aria-hidden="true">group_add</span>
              Create
            </button>
          </div>
        </Card>

        {groups.length === 0 ? (
          <Card className="flex flex-col items-center gap-sm py-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/mascot/full.png"
              alt=""
              aria-hidden="true"
              className="h-28 w-auto opacity-90 drop-shadow"
            />
            <p className="text-center font-body-sm text-body-sm text-on-surface-variant/70">
              Wala pang grupo. Gumawa ng isa sa itaas.
            </p>
          </Card>
        ) : (
          groups.map((g) => (
            <GroupCard
              key={g.id}
              ownerPub={pub}
              group={g}
              contacts={contacts}
              onChanged={refresh}
              onUse={() => {
                setPendingGroup(g.id);
                router.push("/send");
              }}
            />
          ))
        )}
      </main>
      <BottomNav />
    </PageShell>
  );
}

function GroupCard({
  ownerPub,
  group,
  contacts,
  onChanged,
  onUse,
}: {
  ownerPub: string;
  group: FamilyGroup;
  contacts: Contact[];
  onChanged: () => void;
  onUse: () => void;
}) {
  const [pick, setPick] = useState("");
  const [raw, setRaw] = useState("");
  const [rawName, setRawName] = useState("");

  const available = contacts.filter((c) => !group.members.includes(c.address));

  function addMember(address: string) {
    if (!validAddr(address) || group.members.includes(address)) return;
    saveGroup(ownerPub, { ...group, members: [...group.members, address] });
    onChanged();
  }

  function addFromPick() {
    if (!pick) return;
    addMember(pick);
    setPick("");
  }

  function addRaw() {
    const addr = raw.trim();
    if (!validAddr(addr)) return;
    if (rawName.trim()) saveContact(ownerPub, { name: rawName, address: addr });
    addMember(addr);
    setRaw("");
    setRawName("");
  }

  function removeMember(address: string) {
    saveGroup(ownerPub, {
      ...group,
      members: group.members.filter((m) => m !== address),
    });
    onChanged();
  }

  return (
    <Card className="flex flex-col gap-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-sm">
          <span className="material-symbols-outlined text-tertiary-container" data-weight="fill" aria-hidden="true">
            groups
          </span>
          <div>
            <h3 className="font-headline-sm text-headline-sm text-on-surface">
              {group.name}
            </h3>
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              {group.members.length} member{group.members.length === 1 ? "" : "s"}
            </span>
          </div>
        </div>
        <button
          type="button"
          aria-label="Delete group"
          onClick={() => {
            deleteGroup(ownerPub, group.id);
            onChanged();
          }}
          className="flex h-11 w-11 items-center justify-center rounded-full text-on-surface-variant hover:bg-error/10 hover:text-error focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error"
        >
          <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
            delete
          </span>
        </button>
      </div>

      {/* Member chips */}
      {group.members.length > 0 && (
        <div className="flex flex-wrap gap-xs border-t border-outline-variant/30 pt-sm">
          {group.members.map((m) => (
            <span
              key={m}
              className="flex items-center gap-1 rounded-full bg-surface-container px-sm py-1 font-body-sm text-[13px] text-on-surface"
            >
              {memberLabel(ownerPub, m)}
              <button
                type="button"
                aria-label={`Remove ${memberLabel(ownerPub, m)}`}
                onClick={() => removeMember(m)}
                className="flex h-6 w-6 items-center justify-center rounded-full text-on-surface-variant hover:bg-error/10 hover:text-error focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error"
              >
                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                  close
                </span>
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Add from saved contacts */}
      {available.length > 0 && (
        <div className="flex items-center gap-sm border-t border-outline-variant/30 pt-sm">
          <select
            value={pick}
            onChange={(e) => setPick(e.target.value)}
            aria-label={`Add a saved family member to ${group.name}`}
            className="h-11 flex-1 appearance-none rounded-lg border border-outline-variant bg-surface px-md font-body-sm text-body-sm text-on-surface outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary"
          >
            <option value="">Add a saved family member…</option>
            {available.map((c) => (
              <option key={c.address} value={c.address}>
                {c.name} ({c.address.slice(0, 4)}…{c.address.slice(-4)})
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!pick}
            onClick={addFromPick}
            className="rounded-full bg-primary px-md py-xs font-label-caps text-label-caps uppercase text-on-primary disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            Add
          </button>
        </div>
      )}

      {/* Add a brand-new address */}
      <details className="border-t border-outline-variant/30 pt-sm">
        <summary className="cursor-pointer font-label-caps text-label-caps uppercase text-on-surface-variant [&::-webkit-details-marker]:hidden">
          + Add a new address
        </summary>
        <div className="mt-sm flex flex-col gap-sm">
          <input
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder="G… (Stellar public key)"
            className="h-10 w-full rounded-lg border border-outline-variant bg-surface px-md font-currency-md text-[13px] text-on-surface outline-none focus:border-primary"
          />
          <div className="flex items-center gap-sm">
            <input
              value={rawName}
              onChange={(e) => setRawName(e.target.value)}
              placeholder="Save as… (e.g. Nanay)"
              className="h-10 flex-1 rounded-lg border border-outline-variant bg-surface px-md font-body-sm text-body-sm text-on-surface outline-none focus:border-primary"
            />
            <button
              type="button"
              disabled={!validAddr(raw.trim())}
              onClick={addRaw}
              className="rounded-full bg-primary px-md py-xs font-label-caps text-label-caps uppercase text-on-primary disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              Add
            </button>
          </div>
        </div>
      </details>

      {/* Use in Send */}
      <button
        type="button"
        disabled={group.members.length === 0}
        onClick={onUse}
        className="mt-1 flex h-11 w-full items-center justify-center gap-xs rounded-full bg-secondary-container font-label-caps text-label-caps uppercase text-on-secondary-container disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        <span className="material-symbols-outlined text-[18px]" data-weight="fill" aria-hidden="true">
          send
        </span>
        Use in Send
      </button>
    </Card>
  );
}
