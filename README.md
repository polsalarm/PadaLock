# PadaLock

Purpose-Locked OFW Remittance on Stellar.

> StellarX Philippines — Track 1 (Remittance & Cross-Border)

[![CI](https://github.com/polsalarm/PadaLock/actions/workflows/ci.yml/badge.svg)](https://github.com/polsalarm/PadaLock/actions/workflows/ci.yml)

| | |
|---|---|
| **Live demo** | **https://padalock.vercel.app** |
| **Demo video (1–2 min)** | _TODO: paste link_ |
| **Network** | Stellar **testnet** |
| **Contract address** | [`CDTXH4OQR2F2ZWTYLKQ4T4FMAA5HGDEK2HAZA3PAMNLNBGRYCEA6VLDI`](https://stellar.expert/explorer/testnet/contract/CDTXH4OQR2F2ZWTYLKQ4T4FMAA5HGDEK2HAZA3PAMNLNBGRYCEA6VLDI) |
| **Sample interaction tx** | [`8214e348…158d4f4`](https://stellar.expert/explorer/testnet/tx/8214e34844f89515fd08ef2db494f45c3cfb5e11134b7441ecf722fcc158d4f4) (contract deploy); more in [`docs/testnet-state.md`](./docs/testnet-state.md) |

## Risein White Belt (Level 1) compliance

PadaLock satisfies every Level-1 requirement on Stellar **testnet**:

| Requirement | Where in PadaLock |
|---|---|
| Wallet setup (Freighter, testnet) | Hybrid wallet — connect Freighter/xBull/Albedo/Lobstr via Stellar Wallets Kit, or use the built-in self-custodial wallet. Network is testnet (`Networks.TESTNET`). |
| Wallet connect | `/onboard` and `/login` → **Connect external wallet**; built-in create/unlock also supported. |
| Wallet disconnect | `/settings` → **Disconnect / Lock wallet** (clears the external session + local key from memory). |
| Fetch + display XLM balance | Dashboard hero card shows native **XLM** balance (via Horizon) alongside USDC. `getXlmBalance()` in `apps/web/src/lib/balance.ts`. |
| Send XLM transaction on testnet | `/send-xlm` — address + amount → builds a classic `payment` op, signs with the active wallet, submits to RPC. |
| Transaction feedback (success/fail + hash) | `/send-xlm` shows a success/failure badge, the **transaction hash**, and a Stellar Expert link; or the error message on failure. |

Beyond Level 1, PadaLock adds the purpose-locked remittance escrow described below.

## Risein Orange Belt (Level 3) compliance

| Requirement | Where in PadaLock |
|---|---|
| Advanced smart contract | `create_padala` / `claim` / `create_recurring` / `execute_due` / `cancel_recurring` / `get_reputation` — escrow, multi-recipient, recurring, on-chain merchant reputation. |
| Inter-contract communication | Contract performs cross-contract calls to the **USDC SAC** (`transfer`/`balance`) to move escrowed funds to whitelisted merchants. |
| Event streaming & real-time updates | Contract emits an event per bucket on create/claim; the SDK reads them via RPC `getEvents` (`packages/sdk/src/read.ts`), and the transparency view (`/padala/[id]`) renders the live claim ledger. |
| CI/CD pipeline | [`.github/workflows/ci.yml`](./.github/workflows/ci.yml) — `cargo test` + Vitest + `next build` on every push/PR. See badge above. |
| Smart contract deployment workflow | [`docs/deploy.md`](./docs/deploy.md) — build, deploy, seed merchants, capture IDs (in [`docs/testnet-state.md`](./docs/testnet-state.md)). |
| Mobile responsive frontend | Mobile-first PWA (Tailwind), bottom nav, install prompt. See screenshot below. |
| Error handling & loading states | Simulation guards, `pollFinality` (never trusts `sendTransaction`), tx pending spinners, success/error badges across send/claim/cashout. |
| Tests (contract + frontend) | 16 `cargo test` (contract) + 18 Vitest (SDK + web) = **34 passing**. See [Testing](#testing--ci). |
| Production architecture | npm-workspace monorepo (contract / shared SDK / PWA), typed SDK boundary, env-driven config, simulate-before-sign, finality polling. |
| Documentation & demo | This README + [`docs/`](./docs) (deploy, demo script, testnet state, exact flow). |

### Screenshots

| Mobile responsive UI | CI/CD pipeline | Tests passing |
|---|---|---|
| ![Mobile responsive UI](./docs/screenshots/mobile-responsive.png) | ![CI pipeline](./docs/screenshots/ci-pipeline.png) | ![Tests passing](./docs/screenshots/tests-passing.png) |

_Capture instructions: [`docs/screenshots/README.md`](./docs/screenshots/README.md)._

## Problem
~$36B/yr in OFW remittances flow into the Philippines. Senders have no spending control once funds land — common failure: lump sum spent in days, kids miss tuition, electricity gets cut.

## Solution
OFW sends USDC split across purpose buckets (tuition / utility / medical / groceries / free cash). Restricted buckets are escrowed in a Soroban contract and claimable only to whitelisted merchant accounts. Free cash off-ramps to PHP via a real SEP-24 anchor.

### Features
- **Purpose-locked buckets** — restricted buckets release only to whitelisted merchants; free cash is unrestricted.
- **Multi-recipient padala** — each bucket names its own recipient, so one padala can fan out to several family members; each claims only their own buckets.
- **Recurring padala** — sender prefunds N monthly runs up front; `execute_due` is permissionless (a cron / the family / the sender) and mints a fresh padala each interval; cancel refunds the unspent prefund.
- **Real SEP-24 off-ramp** — free cash is claimed to the recipient's wallet, then cashed out via genuine SEP-10 auth + SEP-24 interactive withdraw against `testanchor.stellar.org`.
- **Deep-link + QR claim share** — send-success shows a shareable claim link, QR, and native Share sheet for low-tech family.

## Repo
- `contracts/pada-lock/` — Soroban contract (Rust)
- `apps/web/` — Next.js 16 self-custodial PWA (sender + receiver)
- `packages/sdk/` — shared TypeScript SDK (RPC, tx builders, polling)
- `plan.md` — phased build plan
- `CLAUDE.md` — Claude Code project context

## Quick start
```bash
npm install
npm run contract:build
npm run contract:test
npm run dev
```

Open http://localhost:3000.

## Demo flow
1. Deploy contract (see [`docs/deploy.md`](./docs/deploy.md))
2. Copy `.env.example` → `apps/web/.env.local`, fill contract IDs
3. Follow [`docs/demo-script.md`](./docs/demo-script.md) for the 3-min walkthrough

## Testing & CI

```bash
npm run contract:test                  # 16 Soroban unit tests (cargo)
npm test                               # SDK + web Vitest (18)
cd packages/sdk && npx vitest run      # SDK only (4)
```

Every push and PR to `main` runs [`.github/workflows/ci.yml`](./.github/workflows/ci.yml):
two jobs — **contract** (`cargo test`) and **web** (Vitest across workspaces +
`next build`). Status badge is at the top of this README.

## Deployment

- **Contract:** see [`docs/deploy.md`](./docs/deploy.md). Live IDs in [`docs/testnet-state.md`](./docs/testnet-state.md).
- **Frontend (Vercel):** npm-workspace monorepo — set the project **Root Directory
  to `apps/web`** (Settings → Build & Deployment). Vercel auto-detects Next.js and
  installs from the monorepo root. [`.vercelignore`](./.vercelignore) keeps the
  upload small (excludes `target/`, `node_modules`, `.next`). Set these env vars in
  the Vercel project:

  | Variable | Value (testnet) |
  |---|---|
  | `NEXT_PUBLIC_PADALOCK_CONTRACT_ID` | `CDTXH4OQR2F2ZWTYLKQ4T4FMAA5HGDEK2HAZA3PAMNLNBGRYCEA6VLDI` |
  | `NEXT_PUBLIC_USDC_SAC_TESTNET` | `CCBUASQQH2CSNCMQCLW5I25LXO2V7DQQTIKZ34YGTBGTDU3JGBASIXYJ` |
  | `NEXT_PUBLIC_USDC_ISSUER_TESTNET` | `GAZ5YSMH4Z2VXLLVR7FE7RENVBSDLU5U4PCJZYHRFZSBANA765TZEUQE` |
  | `NEXT_PUBLIC_SEP24_ANCHOR_DOMAIN` | `testanchor.stellar.org` |

## Routes
| Route | Purpose |
|-------|---------|
| `/onboard` | Create self-custodial wallet (mnemonic + password) |
| `/login` | Unlock |
| `/dashboard` | USDC balance, friendbot, nav |
| `/send` | OFW splits padala across buckets |
| `/claim/[id]` | Family member claims per bucket |
| `/padala/[id]` | Sender transparency: who claimed what |

## Stack
- Stellar testnet · `@stellar/stellar-sdk` v14 (`rpc` namespace)
- Soroban Rust SDK
- Next.js 16 App Router · React · Tailwind
- Self-custodial wallet (BIP-39 + Argon2 + AES-GCM)
