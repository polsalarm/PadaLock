"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BottomNav,
  Button,
  Card,
  Input,
  PageShell,
  StatusBadge,
  TopAppBar,
} from "@/components/ui";

const STORAGE_KEY = "padalock.codex.account.v1";

type SavedCodexAccount = {
  label: string;
  plan: string;
  notes: string;
};

function readSavedAccount(): SavedCodexAccount {
  if (typeof window === "undefined") {
    return { label: "", plan: "", notes: "" };
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return { label: "", plan: "", notes: "" };

  try {
    const parsed = JSON.parse(raw) as Partial<SavedCodexAccount>;
    return {
      label: parsed.label ?? "",
      plan: parsed.plan ?? "",
      notes: parsed.notes ?? "",
    };
  } catch {
    return { label: "", plan: "", notes: "" };
  }
}

export default function CodexAccountPage() {
  const [account, setAccount] = useState<SavedCodexAccount>({
    label: "",
    plan: "",
    notes: "",
  });
  const [saved, setSaved] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setAccount(readSavedAccount());
    setLoaded(true);
  }, []);

  const sessionRows = useMemo(
    () => [
      { label: "Workspace", value: "PadaLock" },
      {
        label: "Local path",
        value: "C:\\Users\\Admin\\Documents\\PROJECT GANGG\\PadaLock",
      },
      { label: "Codex account", value: "Not exposed to project code" },
      { label: "Usage source", value: "No active Codex goal budget in this chat" },
    ],
    []
  );

  function save() {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(account));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1600);
  }

  return (
    <PageShell>
      <TopAppBar title="Codex" />
      <main className="flex flex-1 flex-col gap-gutter px-margin-mobile pb-[100px] pt-md">
        <Card className="border-primary/20">
          <div className="flex items-start justify-between gap-sm">
            <div>
              <div className="font-label-caps text-label-caps uppercase text-on-surface-variant">
                Account visibility
              </div>
              <h2 className="mt-1 font-headline-sm text-headline-sm text-on-surface">
                Codex account details are private here
              </h2>
            </div>
            <StatusBadge variant="restricted">
              <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
                lock
              </span>
              Hidden
            </StatusBadge>
          </div>
          <p className="mt-sm font-body-sm text-body-sm text-on-surface-variant">
            This app can run inside the same repo, but it cannot read the signed-in
            Codex email, org, billing plan, or quota. Add a local label below if you
            want this workspace to remember which account you are using.
          </p>
        </Card>

        <section className="flex flex-col gap-sm">
          <h2 className="px-xs font-label-caps text-label-caps uppercase text-on-surface-variant">
            Saved account label
          </h2>
          <Card>
            <div className="flex flex-col gap-sm">
              <Input
                label="Account label or email"
                value={account.label}
                onChange={(event) =>
                  setAccount((current) => ({
                    ...current,
                    label: event.target.value,
                  }))
                }
                placeholder="example@email.com"
                disabled={!loaded}
              />
              <Input
                label="Plan or workspace"
                value={account.plan}
                onChange={(event) =>
                  setAccount((current) => ({
                    ...current,
                    plan: event.target.value,
                  }))
                }
                placeholder="Codex / OpenAI workspace"
                disabled={!loaded}
              />
              <Input
                label="Notes"
                value={account.notes}
                onChange={(event) =>
                  setAccount((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
                placeholder="Usage reset date, owner, or reminder"
                disabled={!loaded}
              />
              <Button onClick={save} disabled={!loaded}>
                <span className="material-symbols-outlined" aria-hidden="true">
                  {saved ? "check" : "save"}
                </span>
                {saved ? "Saved" : "Save locally"}
              </Button>
            </div>
          </Card>
        </section>

        <section className="flex flex-col gap-sm">
          <h2 className="px-xs font-label-caps text-label-caps uppercase text-on-surface-variant">
            Current session
          </h2>
          {sessionRows.map((row) => (
            <Card key={row.label}>
              <div className="font-label-caps text-label-caps uppercase text-on-surface-variant">
                {row.label}
              </div>
              <div className="mt-1 break-words font-body-sm text-body-sm text-on-surface">
                {row.value}
              </div>
            </Card>
          ))}
        </section>
      </main>
      <BottomNav />
    </PageShell>
  );
}
