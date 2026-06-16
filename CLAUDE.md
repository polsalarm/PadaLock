# PadaLock — Project context

## Product
- **Product type:** Remittance app (OFW → PH family)
- **Primary user flow:** OFW sends USDC split into purpose buckets (tuition/utility/medical/groceries/free-cash) → family claims per bucket, restricted buckets route to whitelisted merchants only
- **Philippines relevance:** Solves OFW trust/control problem in $36B/yr remittance corridor
- **Track:** StellarX PH Track 1 — Remittance & Cross-Border

## Tech stack
- **Framework:** Next.js 16 App Router (PWA, mobile-first)
- **Stellar SDK:** `@stellar/stellar-sdk` v14 — use `rpc` namespace, not `SorobanRpc`
- **Contracts:** Soroban Rust SDK
- **Network:** testnet
- **Package manager:** npm (workspaces)

## Stellar configuration
- **Network passphrase:** `Networks.TESTNET` ("Test SDF Network ; September 2015")
- **RPC URL:** `https://soroban-testnet.stellar.org`
- **Friendbot:** `https://friendbot.stellar.org`
- **USDC asset:** testnet USDC SAC (resolve at deploy time, store in `.env`)

## Wallet architecture
- **Wallet type:** HYBRID — built-in self-custodial wallet OR external via Stellar Wallets Kit v2 (Freighter, xBull, Albedo, Lobstr, Ledger, …)
- **Built-in path:** BIP-39 mnemonic → Argon2id(password) → AES-GCM encrypt → `localStorage`; decrypt in memory on login
- **External path:** `@creit.tech/stellar-wallets-kit` v2 static API (`StellarWalletsKit.init/authModal/signTransaction`), lazy-imported client-side only
- **Signing abstraction:** `useWallet().signTxXdr(xdr)` routes to local keypair or kit; pages never touch Keypair directly
- **External session:** address persisted under `padalock.external.v1` in localStorage

## Repo layout
```
/contracts/pada-lock/   Soroban Rust contract
/apps/web/              Next.js 16 PWA (sender + receiver)
/packages/sdk/          shared TS: RPC client, tx builders, types
/docs/                  demo script, architecture notes
plan.md                 phased build plan
```

## Project-specific gotchas
- **SDK v14 namespace:** `import { rpc } from '@stellar/stellar-sdk'` — use `new rpc.Server(url)`, `rpc.assembleTransaction()`. Never `SorobanRpc.*`.
- **Tx finality:** never assume `sendTransaction` = success. Always `pollFinality(hash)` (defined in `@padalock/sdk`).
- **Soroban sim:** simulate every contract tx before signing; use simulated footprint + auth.
- **Hybrid wallet:** both built-in and external must always work. Built-in path must never require an extension (family phone). Never call Keypair signing directly in pages — always `signTxXdr`.
- **Scope discipline:** demo = OFW sends → family claims one restricted bucket + one free-cash bucket. Anything past plan.md Phase 7 is stretch.

## Testing
- **Contract:** `cargo test` (unit, in `contracts/pada-lock/src/test.rs`)
- **SDK / web:** Vitest
- Focus: golden path first (send → claim restricted → claim free-cash), then edge cases (double-claim revert, non-whitelisted merchant revert)
