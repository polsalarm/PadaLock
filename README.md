<div align="center">

<img src="./apps/web/public/mascot/full.png" alt="PadaLock mascot" width="140" />

# PadaLock

### Purpose-Locked OFW Remittance on Stellar

*Padala na may pangako — send money home that can only be spent the way it was meant to.*

[![CI](https://github.com/polsalarm/PadaLock/actions/workflows/ci.yml/badge.svg)](https://github.com/polsalarm/PadaLock/actions/workflows/ci.yml)
&nbsp;![Tests](https://img.shields.io/badge/tests-36%20passing-brightgreen)
&nbsp;![Stellar](https://img.shields.io/badge/Stellar-testnet-7D00FF?logo=stellar&logoColor=white)
&nbsp;![Soroban](https://img.shields.io/badge/Soroban-Rust-CE412B?logo=rust&logoColor=white)
&nbsp;![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)

**[🚀 Live demo](https://padalock.vercel.app)** · **[🎬 Demo video](./docs/demo-video/padalock-demo.mp4)** · **[🔎 Contract on Stellar Expert](https://stellar.expert/explorer/testnet/contract/CB62IOP52GFYM7FFKHFVJLINQJJBHFWIVFGACGZ3MSMPELSTBG7RF5YE)**

<sub>StellarX Philippines - Track 1 - Remittance & Cross-Border</sub>

</div>

---

## 📌 At a glance

| | |
|---|---|
| **Live demo** | https://padalock.vercel.app |
| **Demo video** | [`docs/demo-video/padalock-demo.mp4`](./docs/demo-video/padalock-demo.mp4) |
| **Network** | Stellar **testnet** |
| **Contract — USDC** | [`CB62IOP5…TBG7RF5YE`](https://stellar.expert/explorer/testnet/contract/CB62IOP52GFYM7FFKHFVJLINQJJBHFWIVFGACGZ3MSMPELSTBG7RF5YE) |
| **Contract — XLM** | [`CC6LNV5T…LV4PVTM4KVM`](https://stellar.expert/explorer/testnet/contract/CC6LNV5T6PIKMUJGWUHSE3ZEDU4YTKNQCRUGQHZXS422ALV4PVTM4KVM) |
| **Sample interaction tx** | [`8214e348…158d4f4`](https://stellar.expert/explorer/testnet/tx/8214e34844f89515fd08ef2db494f45c3cfb5e11134b7441ecf722fcc158d4f4) · more in [`docs/testnet-state.md`](./docs/testnet-state.md) |

<div align="center">

### 👉 Try it now — no install, no extension needed

**[▶︎ Open the live app](https://padalock.vercel.app)** &nbsp;·&nbsp; create a wallet &nbsp;·&nbsp; fund with one tap &nbsp;·&nbsp; send a purpose-locked padala in under a minute.

*Runs on Stellar testnet — play with real on-chain money, zero risk.*

</div>

---

## 📖 Contents

[What is PadaLock?](#-what-is-padalock) ·
[Demo](#-demo) ·
[Screenshots](#️-screenshots) ·
[How it works](#-how-it-works) ·
[Features](#-features) ·
[Repo layout](#️-repo-layout) ·
[Tech stack](#️-tech-stack) ·
[Quick start](#-quick-start) ·
[Testing & CI](#-testing--ci) ·
[Deployment](#️-deployment) ·
[Routes](#-routes) ·
[Roadmap](#️-mainnet-roadmap)

---

## 💡 What is PadaLock?

Filipino OFWs send **~$36B/yr** home. The recurring pain: the sender has **no control** over how the money is spent — a lump sum vanishes in days, tuition goes unpaid, the electricity gets cut.

**PadaLock** lets the sender split a remittance into **purpose buckets** at send time. Restricted buckets are escrowed in a Soroban contract and can **only** be released to whitelisted merchants; free cash off-ramps to PHP through a real SEP-24 anchor. The sender sees an on-chain receipt of every release.

| Bucket | Releases to |
|---|---|
| 🎓 Tuition | whitelisted school accounts |
| 💡 Utility | whitelisted biller proxies |
| 🏥 Medical | whitelisted clinic / pharmacy accounts |
| 🛒 Groceries | whitelisted supermarket aggregators |
| 💵 Free cash | unrestricted → PHP off-ramp (SEP-24) |

---

## 🎬 Demo

<div align="center">

[<img src="./docs/demo-video/padalock-demo-thumbnail.png" alt="Watch the PadaLock demo" width="520" />](./docs/demo-video/padalock-demo.mp4)

▶︎ **[Watch the 1–2 min demo](./docs/demo-video/padalock-demo.mp4)**

</div>

---

## 🖼️ Screenshots

### 📱 Mobile-first UI

<div align="center">

| Dashboard | Send / split | Family groups |
|:---:|:---:|:---:|
| <img src="./docs/screenshots/framed/mobile-responsive.png" alt="Dashboard" width="210" /> | <img src="./docs/screenshots/framed/mobile-send.png" alt="Send / split" width="210" /> | <img src="./docs/screenshots/framed/mobile-family.png" alt="Family groups" width="210" /> |
| **Connect wallet** | **Settings** | |
| <img src="./docs/screenshots/framed/mobile-connect.png" alt="Connect wallet" width="210" /> | <img src="./docs/screenshots/framed/mobile-settings.png" alt="Settings" width="210" /> | |

</div>

### ⚙️ CI/CD · 🔗 on-chain proof

| CI/CD — all checks passing | Contract & tx history (Stellar Expert) |
|:---:|:---:|
| <img src="./docs/screenshots/ci-pipeline.png" alt="CI pipeline all checks passed" width="440" /> | <img src="./docs/screenshots/contracts/USDC%20PadaLock%20contract.png" alt="USDC PadaLock contract on Stellar Expert" width="260" /> <img src="./docs/screenshots/contracts/XLM%20PadaLock%20contract.png" alt="XLM PadaLock contract on Stellar Expert" width="260" /> |

### Vercel analytics proof

| Live traffic and monitoring |
|:---:|
| <img src="./docs/screenshots/vercel-analytics/padalock-analytics.png" alt="Vercel Analytics for PadaLock" width="760" /> |

### Discord feedback proof

| Feedback collection, `/insights` summary, and CSV export |
|:---:|
| <img src="./docs/screenshots/discord-feedback-proof.png" alt="Discord feedback collection, summary, and CSV export proof" width="760" /> |

### ✅ Tests

| Contract — `cargo test` · 16 passed | Frontend + SDK — `vitest` · 20 passed |
|:---:|:---:|
| <img src="./docs/screenshots/tests-cargo.png" alt="cargo test 16 passed" width="440" /> | <img src="./docs/screenshots/tests-vitest.png" alt="vitest 20 passed" width="440" /> |

---

## 🔄 How it works

```
   OFW (abroad)                         Family (PH)
        │                                    │
        │  split USDC into buckets           │  claim per bucket
        ▼                                    ▼
 ┌──────────────┐                     ┌──────────────┐
 │  Sender PWA  │                     │ Receiver PWA │
 └──────┬───────┘                     └──────┬───────┘
        │ simulate · sign · poll             │ claim tx
        ▼                                    ▼
 ┌───────────────────────────────────────────────────────┐
 │             Stellar testnet · Soroban RPC v14           │
 │                                                         │
 │   PadaLock contract                                     │
 │     • create_padala(buckets, recipients)                │
 │     • claim(padala_id, bucket_id, merchant)             │
 │     • create_recurring / execute_due / cancel_recurring │
 │     • reclaim(padala_id) — sender refund after expiry   │
 │     • get_reputation(merchant)                          │
 │                                                         │
 │   cross-contract → USDC SAC (transfer / balance)        │
 │   restricted buckets → whitelisted merchants only       │
 │   free cash → SEP-24 anchor → PHP off-ramp              │
 └───────────────────────────────────────────────────────┘
```

---

## ✨ Features

- **🔒 Purpose-locked buckets** — restricted buckets release only to whitelisted merchants; free cash is unrestricted.
- **💱 USDC or XLM** — choose the asset at send time. Each asset is its own escrow contract (USDC-bound + XLM-bound instances); restricted buckets release the chosen asset to whitelisted merchants.
- **👨‍👩‍👧 Multi-recipient padala** — each bucket names its own recipient, so one padala fans out to several family members; each claims only their own buckets.
- **🔁 Recurring padala** — sender prefunds N runs up front; `execute_due` is permissionless and mints a fresh padala each interval; cancel refunds the unspent prefund.
- **↩️ Sender reclaim** — if the family never claims, a one-off padala becomes reclaimable by the sender after it expires (30-day default). `reclaim` returns the still-unclaimed buckets to the sender's wallet, so funds are never locked forever.
- **♻️ Durable storage (TTL bumping)** — every padala / merchant / reputation entry extends its TTL on write and read (`extend_ttl`), so active data never archives out from under users.
- **💱 Real SEP-24 off-ramp** — free cash is claimed to the recipient's wallet, then cashed out via genuine SEP-10 auth + SEP-24 interactive withdraw against `testanchor.stellar.org`.
- **⭐ On-chain merchant reputation** — per-merchant claim count / volume accrued on every claim, surfaced in the claim picker.
- **🪙 Dashboard asset switcher** — headline your balance in USDC or XLM; the choice is remembered.
- **🔗 Deep-link + QR claim share** — send-success shows a shareable claim link, QR, and native Share sheet for low-tech family.
- **👛 Hybrid wallet** — built-in self-custodial wallet (BIP-39 + Argon2 + AES-GCM) **or** external via Stellar Wallets Kit (Freighter, xBull, Albedo, Lobstr, Ledger).
- **Discord feedback loop** - in-app feedback posts to Discord and to `@padalock/feedback-graph`; slash commands generate `/insights` summaries and private `/export` CSV files for proof and iteration.

---

## 🗂️ Repo layout

```
contracts/pada-lock/   Soroban contract (Rust)
apps/web/              Next.js 16 self-custodial PWA (sender + receiver)
packages/sdk/          shared TypeScript SDK (RPC, tx builders, polling)
packages/feedback-graph/ Discord slash commands, feedback ingest, Gemini summaries, CSV export
docs/                  deploy guide, demo script, testnet state, screenshots
plan.md                phased build plan
```

---

## 🧰 Tech stack

- **Stellar** testnet · `@stellar/stellar-sdk` v14 (`rpc` namespace)
- **Soroban** Rust SDK (`soroban-sdk` 25)
- **Next.js 16** App Router · React 19 · Tailwind · PWA, mobile-first
- **Self-custodial wallet** — BIP-39 mnemonic → Argon2id → AES-GCM
- **Discord + Gemini feedback insights** - Discord Interactions API, Neon Postgres, Gemini embeddings/summaries, `/insights`, and CSV export
- **npm workspaces** monorepo · typed SDK boundary · simulate-before-sign · finality polling

---

## 🚀 Quick start

```bash
npm install
npm run contract:build      # build the Soroban contract
npm run contract:test       # 16 cargo tests
npm run dev                 # http://localhost:3000
```

To run against a fresh deploy: copy `.env.example` → `apps/web/.env.local`, fill the
contract IDs, then follow [`docs/demo-script.md`](./docs/demo-script.md).

---

## ✅ Testing & CI

```bash
npm run contract:test                  # 16 Soroban unit tests (cargo)
npm test                               # SDK + web Vitest (20)
cd packages/sdk && npx vitest run      # SDK only (6)
```

> **16 contract + 20 frontend/SDK = 36 passing.**

Every push and PR to `main` runs [`.github/workflows/ci.yml`](./.github/workflows/ci.yml) —
two parallel jobs: **contract** (`cargo test`) and **web** (Vitest across workspaces +
`next build`). Status badge is at the top of this README.

---

## ☁️ Deployment

- **Contract** → [`docs/deploy.md`](./docs/deploy.md); live IDs in [`docs/testnet-state.md`](./docs/testnet-state.md).
- **Frontend (Vercel)** → npm-workspace monorepo. Set the project **Root Directory to `apps/web`**
  (Settings → Build & Deployment); Vercel auto-detects Next.js and installs from the monorepo root.
  [`.vercelignore`](./.vercelignore) keeps the upload small (excludes `target/`, `node_modules`, `.next`).

  | Env var | Value (testnet) |
  |---|---|
  | `NEXT_PUBLIC_PADALOCK_CONTRACT_ID` | `CB62IOP52GFYM7FFKHFVJLINQJJBHFWIVFGACGZ3MSMPELSTBG7RF5YE` |
  | `NEXT_PUBLIC_PADALOCK_XLM_CONTRACT_ID` | `CC6LNV5T6PIKMUJGWUHSE3ZEDU4YTKNQCRUGQHZXS422ALV4PVTM4KVM` |
  | `NEXT_PUBLIC_USDC_SAC_TESTNET` | `CCBUASQQH2CSNCMQCLW5I25LXO2V7DQQTIKZ34YGTBGTDU3JGBASIXYJ` |
  | `NEXT_PUBLIC_XLM_SAC_TESTNET` | `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC` |
  | `NEXT_PUBLIC_USDC_ISSUER_TESTNET` | `GAZ5YSMH4Z2VXLLVR7FE7RENVBSDLU5U4PCJZYHRFZSBANA765TZEUQE` |
  | `NEXT_PUBLIC_SEP24_ANCHOR_DOMAIN` | `testanchor.stellar.org` |
  | `FEEDBACK_WEBHOOK_URL` | Discord incoming webhook for visible feedback collection |
  | `FEEDBACK_GRAPH_URL` | `https://padalock-feedback-graph.vercel.app` |
  | `INGEST_SECRET` | Shared secret used by the web app and feedback graph ingest API |

- **Feedback graph (Vercel)** - `packages/feedback-graph`; deploys `https://padalock-feedback-graph.vercel.app` with `/api/interactions`, `/api/ingest`, `/api/health`, and `/api/export`.
  Discord's **Interactions Endpoint URL** points to `/api/interactions`. `/feedback` logs Discord-native feedback, `/insights` clusters all stored rows into a summary + chart, and `/export` returns a private CSV file.

---

## 🧭 Routes

| Route | Purpose |
|---|---|
| `/onboard` | Create self-custodial wallet (mnemonic + password) |
| `/login` | Unlock |
| `/dashboard` | USDC balance, friendbot, nav |
| `/send` | OFW splits padala across buckets |
| `/claim/[id]` | Family member claims per bucket |
| `/padala/[id]` | Sender transparency: who claimed what, when |

---

## 🛣️ Mainnet roadmap

- Partner with a PH anchor (Coins.ph / Anclap PHP) for a real off-ramp
- KYC-light onboarding via SEP-12 for senders abroad
- Merchant whitelist governance — schools via DepEd, utilities via biller APIs
- SEP-31 cross-border send from non-USDC corridors (USD/SGD/AED)

---

<div align="center">

## Ready to see it?

**[🚀 Launch the live demo](https://padalock.vercel.app)** &nbsp;|&nbsp; **[🎬 Watch the video](./docs/demo-video/padalock-demo.mp4)** &nbsp;|&nbsp; **[⭐ Star the repo](https://github.com/polsalarm/PadaLock)**

<br>

<sub>Built for the Filipino diaspora — <em>filipinos helping filipinos protect what they send home.</em></sub>

</div>
