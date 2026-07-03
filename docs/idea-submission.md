# PadaLock — Idea Submission (July Challenge, Levels 4–7)

**Team:** GANGG
**Track:** StellarX PH — Track 1: Remittance & Cross-Border
**Network:** Stellar testnet (Soroban)
**Status:** Approved in April Challenge; this is a new July Challenge submission.

---

## 1. Problem Statement

Overseas Filipino Workers (OFWs) send **~$36B/year** home, but they lose control of the money the moment it lands. A parent working abroad wants funds spent on a child's tuition, the electric bill, or medicine — but once remitted, cash is fungible and can be diverted. This creates a real **trust and control gap** inside families, on top of the well-known problems of high fees, slow settlement, and cash-out friction.

Existing remittance rails (banks, money transfer operators) solve *movement* of money. None solve *purpose enforcement* — the sender's ability to earmark money for a specific need and have that restriction honored on-chain.

**PadaLock** lets an OFW send USDC split into **purpose buckets** (tuition, utility, medical, groceries, free-cash). Restricted buckets can only be claimed to **whitelisted merchants** (the school, the utility, the pharmacy). Free-cash is claimable directly by family. The sender's intent is enforced by a smart contract, not by trust.

## 2. Why Stellar?

- **Built for cross-border payments.** Stellar's core purpose is cheap, fast remittance settlement — sub-cent fees, ~5s finality. Directly fits the OFW→PH corridor.
- **USDC on Stellar** gives a stable, liquid unit of value families can rely on, avoiding volatility for essentials like tuition and medicine.
- **Soroban smart contracts** enable the purpose-bucket logic — per-bucket balances, merchant whitelists, claim restrictions, double-claim prevention — that a plain payment rail cannot express.
- **Anchor / SEP ecosystem** (SEP-6/24/31) provides a credible on-ramp/off-ramp path to PHP cash-out for mainnet, without us reinventing fiat rails.
- **Low fees matter most for low-value, high-frequency remittances** — the exact profile of family support payments.

## 3. Target Users

- **Primary sender:** OFWs abroad (Gulf states, HK, Singapore, US) supporting family in the Philippines.
- **Primary receiver:** Family members in PH (often on a basic mobile phone) claiming funds per bucket.
- **Merchants:** Schools, utility billers, pharmacies, groceries — whitelisted recipients of restricted buckets.
- **Design constraint:** the family/receiver path must work on a low-end phone with no browser extension. Hence the hybrid wallet (built-in self-custodial OR external).

## 4. Technical Architecture

**Frontend + Contract + Data flow.**

```
OFW (sender)                    Soroban Contract              Family (receiver)
------------                    ----------------              -----------------
Next.js 16 PWA                  pada-lock (Rust)              Next.js 16 PWA
  |                                  |                              |
  | 1. create padala                |                              |
  |   split USDC into buckets ----->|  store per-bucket balances   |
  |   set merchant whitelist        |  + whitelist + claim state   |
  |                                 |                              |
  |                                 |<---- 2. claim free-cash -----|
  |                                 |      (direct to family)      |
  |                                 |                              |
  |                                 |<-- 3. claim restricted ------|
  |                                 |   routes to whitelisted      |
  |                                 |   merchant only; reverts     |
  |                                 |   non-whitelisted / double   |
```

**Stack**
- **Framework:** Next.js 16 App Router, PWA, mobile-first.
- **Contracts:** Soroban Rust SDK — `pada-lock` contract holds bucket balances, merchant whitelist, and per-bucket claim state.
- **Stellar SDK:** `@stellar/stellar-sdk` v14 (`rpc` namespace) for build/simulate/submit; always simulate before signing and poll finality.
- **Asset:** testnet USDC via Stellar Asset Contract (SAC) — classic USDC bridged into Soroban.
- **Wallet (hybrid):** built-in self-custodial (BIP-39 mnemonic → Argon2id(password) → AES-GCM → localStorage) OR external via Stellar Wallets Kit v2 (Freighter, xBull, Albedo, Lobstr, Ledger). Single signing abstraction — pages never touch a Keypair directly.
- **Shared SDK:** `@padalock/sdk` — RPC client, tx builders, types, `pollFinality`.

**Data flow, step by step**
1. Sender builds a "padala": allocates USDC across buckets, attaches a merchant whitelist for restricted buckets, signs, and funds the contract.
2. Contract stores per-bucket balances + whitelist + claim state.
3. Family claims free-cash bucket → USDC transfers directly to their address.
4. Family claims a restricted bucket → contract enforces the recipient is on the whitelist; transfers to merchant. Non-whitelisted or double-claim attempts revert.

## 5. Complexity Evaluation

What makes this technically challenging:

- **Purpose-enforcement contract logic** — per-bucket accounting, merchant whitelists, and claim-state machine with correct revert semantics (double-claim, non-whitelisted merchant). Requires careful Soroban storage design and authorization.
- **Hybrid wallet architecture** — both a built-in self-custodial wallet *and* external wallet-kit signing must always work through one abstraction, because the receiver may be on a family phone with no extension. Non-trivial key management (Argon2id + AES-GCM) client-side.
- **Soroban tx discipline** — simulate every contract tx, use the simulated footprint + auth, never assume `sendTransaction` == success, always poll finality.
- **SAC / classic-asset bridge** — USDC exists as a classic asset; the contract operates on its SAC representation. Correct interop is required for real value transfer.
- **Mobile-first PWA UX** for a low-literacy, low-bandwidth receiver — the claim flow must be dead simple.

## 6. Roadmap

**MVP (Levels 4–5, current build — testnet)**
- OFW sends a padala split into restricted + free-cash buckets.
- Family claims one restricted bucket (routes to whitelisted merchant) and one free-cash bucket.
- Golden path + edge cases (double-claim revert, non-whitelisted merchant revert) covered by tests (`cargo test` + Vitest).
- Hybrid wallet (built-in + external) live on testnet.

**User acquisition (Level 6)**
- Pilot with a small OFW cohort (Gulf/HK) and a handful of PH merchants (a school, a utility biller).
- Merchant onboarding flow + verified-merchant registry.
- Feedback loop on the receiver claim UX on real low-end devices.

**Mainnet vision (Level 7)**
- Integrate a Stellar **anchor** (SEP-24/31) for PHP cash-out / off-ramp so restricted-bucket merchants and free-cash recipients can settle to local fiat.
- KYC/compliance layer for regulated corridors.
- Expand bucket types and recurring/scheduled padala.
- Scale merchant whitelist into a curated, verifiable directory.
- Move `pada-lock` contract to mainnet with audit.

---

### One-line pitch
> **PadaLock** — programmable remittance for OFWs: send money home already earmarked for tuition, bills, and medicine, with purpose enforced on Stellar instead of trusted.
