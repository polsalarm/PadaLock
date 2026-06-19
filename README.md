# PadaLock

Purpose-Locked OFW Remittance on Stellar.

> StellarX Philippines — Track 1 (Remittance & Cross-Border)

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
