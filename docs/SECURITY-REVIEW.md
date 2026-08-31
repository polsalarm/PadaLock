# PadaLock — Internal Security Review

> **What this is:** a first-party (self-conducted) security review of the PadaLock
> codebase, performed by the project team. It is evidence of a deliberate security
> pass with reproducible commands and named findings.
>
> **What this is not:** a third-party audit. No external firm has audited PadaLock.
> Do not read this document as an audit certificate, and do not treat the mainnet
> deployment as audited software.

| | |
|---|---|
| **Review date** | 2026-08-31 |
| **Baseline commit** | `d8438c5` (`main`) + the UI/theme/i18n work in this branch |
| **Reviewer** | PadaLock project team (first-party) |
| **Scope** | Soroban contract, web app, shared SDK, API route handlers, dependency tree |
| **Method** | Manual code review + automated test suites + `npm audit` |
| **Result** | 0 critical / 0 high in first-party code · 1 critical + 15 high in third-party dependencies · 2 medium + 1 low first-party findings |

---

## 1. Scope

**In scope**

| Area | Path |
|---|---|
| Soroban contract | `contracts/pada-lock/contracts/pada-lock/src/lib.rs` (557 LOC) |
| Wallet cryptography | `apps/web/src/lib/wallet/{crypto,storage,mnemonic,keypair}.ts` |
| Signing abstraction | `apps/web/src/lib/wallet-context.tsx` |
| Server route handlers | `apps/web/src/app/api/{faucet,feedback}/route.ts` |
| Shared SDK | `packages/sdk/src/**` |
| Client surfaces | `apps/web/src/app/**`, `apps/web/src/components/**` |
| Dependencies | `npm audit --omit=dev`, Cargo release profile |

**Out of scope**

- Third-party wallet extensions (Freighter, xBull, Albedo, Ledger) and their signing UX.
- The Stellar network, Horizon, and Soroban RPC infrastructure themselves.
- The `feedback-graph` service (separate deployment, separate trust boundary).
- Formal verification, fuzzing beyond the existing unit suite, and economic/game-theoretic analysis.
- Penetration testing of the deployed Vercel environments.

---

## 2. Verification — reproduce this review

```bash
# Contract unit tests — 21 passing
cd contracts/pada-lock && cargo test

# Shared SDK tests — 6 passing
npm test --workspace=@padalock/sdk

# Web tests, incl. wallet crypto round-trip — 16 passing
npm test --workspace=@padalock/web

# Type safety across the web app — clean
npx tsc --noEmit -p apps/web/tsconfig.json

# Production build — clean
npm run build --workspace=@padalock/web

# Dependency advisories
npm audit --omit=dev
```

**Recorded results at review time**

| Check | Result |
|---|---|
| `cargo test` | **21 passed**, 0 failed |
| `npm test --workspace=@padalock/sdk` | **6 passed**, 0 failed |
| `npm test --workspace=@padalock/web` | **16 passed**, 0 failed |
| **Total** | **43 tests passing** |
| `tsc --noEmit` | clean |
| `next build` | clean, 15 routes |
| `npm audit --omit=dev` | 41 advisories: 1 critical, 15 high, 6 moderate, 19 low — **all transitive, none in first-party code** |

---

## 3. Findings

### SEC-01 · Medium · No rate limiting on the testnet faucet

**Location:** `apps/web/src/app/api/faucet/route.ts`

The faucet mints 1000 test USDC to any well-formed address with no per-IP or
per-address throttle. An automated caller can mint without bound, exhausting the
issuer account's sequence throughput and inflating the testnet USDC supply.

**Mitigating factors:** the route hard-fails on mainnet (`IS_MAINNET` guard, line
21), the issuer secret is server-side only, and the asset has no real value.

**Status:** accepted for the demo. **Recommendation:** add a per-address cooldown
(a KV entry keyed on the address, 1 mint per hour) before any wider distribution.

---

### SEC-02 · Medium · Feedback webhook forwards unsanitised user text

**Location:** `apps/web/src/app/api/feedback/route.ts`

The submitted message is capped at 1000 characters and interpolated directly into
a Discord/Slack webhook payload. Two consequences:

1. **Mention injection** — a submission containing `@everyone` / `@here` pings the
   receiving channel, because the payload sets no `allowed_mentions` policy.
2. **Unthrottled relay** — the route has no rate limit, so it can be used to flood
   the team's channel.

**Status:** open. **Recommendation:** send `allowed_mentions: { parse: [] }` with
the webhook payload and add a per-IP rate limit.

---

### SEC-03 · Low · Stellar address validated by shape, not checksum

**Location:** `apps/web/src/app/api/faucet/route.ts`, `apps/web/src/app/api/feedback/route.ts`

Addresses are checked with `startsWith("G")` and `length === 56` rather than a
StrKey checksum test. A malformed-but-well-shaped string reaches transaction
simulation (faucet) or is stored verbatim (feedback).

**Mitigating factors:** the faucet path fails safely — Soroban simulation rejects
the invalid address before anything is signed or submitted.

**Status:** open. **Recommendation:** use `StrKey.isValidEd25519PublicKey(address)`
from `@stellar/stellar-sdk` at both call sites.

---

### SEC-04 · High (third-party) · Vulnerable transitive dependencies

**Location:** `package-lock.json`

`npm audit --omit=dev` reports 41 advisories in the production tree: 1 critical
(`protobufjs` — code-generation gadget enabling arbitrary code execution), 15 high
(`@trezor/*`, `axios`, `form-data`, `ip-address`, `nanoid`, `next`), 6 moderate,
19 low.

The `protobufjs` and `@trezor/*` chain enters through
`@creit.tech/stellar-wallets-kit` → Trezor connector → `viem`/`wagmi`. That code
path only executes for users who choose a hardware wallet; the built-in wallet and
the common extension wallets never load it. The `next` advisories apply to the
framework itself and are fixed by a patch upgrade.

**Status:** open — no first-party code is affected, but the advisories are real.
**Recommendation:** (a) bump Next.js to the current patch release, (b) re-run
`npm audit` after the bump, (c) consider lazy-loading or dropping the Trezor
module from the wallet kit if hardware-wallet support is not needed for the demo.

---

### SEC-05 · Informational · `dangerouslySetInnerHTML` — both uses reviewed, both safe

**Locations:** `apps/web/src/components/claim-share.tsx:74`, `apps/web/src/app/layout.tsx:39`

- **QR code** — markup is produced locally by the `qrcode` library from a
  same-origin URL. The library emits path geometry, never the input text, so a
  hostile `padalaId` cannot reach the DOM as markup.
- **Theme boot script** — a module-level constant with no interpolated runtime
  value; the only embedded string is a `JSON.stringify`'d literal storage key.

No user-controlled string reaches either sink. **Status:** no action.

---

### SEC-06 · Informational · Permissionless `execute_due` is safe by construction

**Location:** `contracts/pada-lock/contracts/pada-lock/src/lib.rs:219`

`execute_due` is the one state-changing entrypoint without `require_auth`, and
that is deliberate — it is a crank anyone (a cron, the family, the sender) can
turn once a schedule is due.

It is safe because it moves no funds: the sender escrows the full prefund at
`create_recurring`, and `execute_due` only mints a Padala record against that
existing balance. It is guarded by an `active`/`remaining` check (line 227) and a
`next_run` timestamp check (line 230), and the `prefunded -= per_run_total`
accounting cannot silently wrap because the release profile sets
`overflow-checks = true`.

**Status:** no action — verified by `recurring_prefunds_and_runs` in the test suite.

---

## 4. Positive controls verified

| Control | Evidence |
|---|---|
| **Key derivation** | Argon2id, `t=3, m=64 MiB, p=1, dkLen=32` — `lib/wallet/crypto.ts:7` |
| **Encryption** | AES-256-GCM via WebCrypto, 16-byte random salt, 12-byte random nonce per blob |
| **Crypto libraries** | `@noble/hashes`, `@scure/bip39` — audited, dependency-light implementations |
| **Key custody** | The mnemonic is never transmitted; only the ciphertext blob reaches `localStorage` (`lib/wallet/storage.ts`) |
| **Wrong-password behaviour** | AES-GCM tag failure, covered by a test (`fails to decrypt under wrong password`) |
| **Secret handling** | `FAUCET_ISSUER_SECRET`, `FEEDBACK_WEBHOOK_URL`, `INGEST_SECRET` are read only inside `app/api/**` route handlers — never in a client component, never behind `NEXT_PUBLIC_` |
| **Contract authorisation** | `require_auth` on every state-changing entrypoint: `create_padala` (sender), `create_recurring` (sender), `cancel_recurring` (schedule's sender), `claim` (bucket's recipient), `reclaim` (padala's sender), `add_merchant` (admin), `__constructor` (admin) |
| **Integer safety** | `overflow-checks = true` in the release profile — arithmetic panics rather than wrapping |
| **Mainnet blast radius** | The faucet refuses to run when `IS_MAINNET` (route returns 403) |
| **Account-drift guard** | External-wallet signatures are checked against the connected account's signature hint before submission — `wallet-context.tsx:assertSignedBySource` |
| **Double-claim / whitelist enforcement** | Covered by `restricted_bucket_rejects_non_whitelisted_merchant` and the double-claim revert tests |

---

## 5. Limitations

This review is first-party and time-boxed. It did **not** include: formal
verification, fuzz or property testing beyond the existing suite, economic
modelling of the escrow mechanics, live penetration testing of the deployed
environments, or a review of the wallet extensions PadaLock integrates with.

Before handling material sums of real money, PadaLock should commission an
independent third-party audit of the Soroban contract.
