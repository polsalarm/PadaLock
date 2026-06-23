# PadaLock — Purpose-Locked OFW Remittance on Stellar

> StellarX Philippines submission plan. Track 1 — Remittance & Cross-Border.

---

## 1. Problem

Filipino OFWs send ~$36B/yr home. Recurring pain: sender has no control over how money is spent. Common failure mode — family blows the lump sum on non-essentials within days, kids miss tuition, electricity gets cut, hospital bills go unpaid. Trust friction destroys family relationships and forces OFWs to micromanage from abroad over Messenger calls.

Existing remittance (Western Union, GCash, Wise, etc.) treats remittance as a single unrestricted payout. No purpose tagging. No spend control. No transparency for the sender.

## 2. Solution — PadaLock

OFW sends USDC from abroad. Splits the padala across **purpose buckets** at send time:

| Bucket    | Restricted to                                  |
|-----------|------------------------------------------------|
| Tuition   | whitelisted school accounts                    |
| Utility   | whitelisted utility/biller proxies             |
| Medical   | whitelisted clinic/hospital/pharmacy accounts  |
| Groceries | whitelisted supermarket/sari-sari aggregators  |
| Free cash | unrestricted, family claims as PHP off-ramp    |

Each bucket = Soroban-escrowed claimable balance. Family member opens app, sees breakdown, claims per bucket. Restricted buckets path-payment direct to merchant on swipe; free cash hits SEP-24 anchor off-ramp → GCash/bank/cash pickup.

Sender sees on-chain receipt of every release: bucket → merchant → timestamp.

## 3. Track + Rubric Alignment

| Criterion                    | Pts | How PadaLock scores                                              |
|------------------------------|-----|--------------------------------------------------------------------|
| Meaningful Stellar use       | 25  | Claimable balances + Soroban escrow + path payments + SEP-24 core  |
| Problem & PH relevance       | 20  | $36B corridor, universal OFW family pain                           |
| Functionality & completeness | 20  | Single demo flow end-to-end on testnet                             |
| Tech execution               | 15  | Proper sim + polling, Soroban tests, typed SDK v14                 |
| Product thinking & UX        | 10  | Clean sender split UI, family claim flow w/ empty/error states     |
| Presentation                 | 10  | 3-min demo video: OFW sends → family claims tuition → done         |
| **Bonus**                    | +10 | Anchor integration +3, novel angle +3, claimable balances +2, mainnet roadmap +2 |

## 4. Architecture

```
[OFW (abroad)]                    [Family (PH)]
     |                                 |
     v                                 v
 +----------------+              +------------------+
 |  Sender PWA    |              |  Receiver PWA    |
 |  Next.js       |              |  Next.js         |
 |  self-custodial|              |  self-custodial  |
 +-------+--------+              +---------+--------+
         |                                 |
         | sim + sign tx                   | claim tx
         v                                 v
   +---------------------------------------------+
   |        Stellar testnet (RPC v14)            |
   |                                             |
   |  Soroban contract: PadaLock               |
   |   - create_padala(buckets, recipient)       |
   |   - claim(bucket_id, merchant)              |
   |   - merchant whitelist registry             |
   |                                             |
   |  Claimable balances per bucket              |
   |  USDC (testnet anchor)                      |
   |  SEP-24 anchor for PHP off-ramp             |
   +---------------------------------------------+
```

**Stack**
- Framework: Next.js 16 App Router (PWA)
- SDK: `@stellar/stellar-sdk` v14, `rpc` namespace
- Contract: Soroban Rust SDK
- Wallet: self-custodial PWA, password-derived key, local mnemonic encrypted (per starter prompt §3A)
- Asset: USDC on testnet, PHP via SEP-24 anchor (e.g. testanchor.stellar.org or Anclap testnet)
- Network: testnet only

## 5. Demo Scope (smallest strong version)

ONE golden path that works end-to-end:

1. OFW creates wallet → funded with testnet USDC
2. OFW opens "Send Padala" → enters ₱20k equivalent → splits: ₱10k tuition / ₱5k utility / ₱5k free cash → recipient pubkey/handle
3. Tx signs locally → Soroban `create_padala` → 3 claimable balances created
4. Family opens claim link → sees 3 buckets w/ amounts + merchant lists
5. Family taps "Claim Tuition" → picks whitelisted school → path payment fires → merchant credited → balance updates
6. Family taps "Claim Free Cash" → SEP-24 flow → PHP off-ramp pickup code

Everything else is post-MVP.

## 6. Phased Build Plan

### Phase 0 — Setup (Day 0, ~1 hr)
- Init Next.js 16 + TS + Tailwind + shadcn
- Install `@stellar/stellar-sdk@14`, `@stellar/freighter-api` skipped (self-custodial)
- Soroban Rust workspace + `soroban-sdk`
- Testnet RPC URL pinned, friendbot funded keypair stored as test fixture
- Write `CLAUDE.md` from starter template §5
- Repo structure:
  ```
  /contracts/pada-lock/           # Soroban Rust
  /apps/web/                      # Next.js PWA (sender + receiver)
  /packages/sdk/                  # shared TS: tx builders, RPC client, types
  /docs/                          # demo script, architecture notes
  ```

### Phase 1 — Soroban contract (Day 1, ~4 hrs)
- Storage: `Padala { sender, recipient, buckets: Vec<Bucket> }`, `Bucket { id, category, amount, merchant_whitelist, claimed: bool }`
- Functions:
  - `create_padala(env, recipient, buckets) -> padala_id` — sender deposits USDC SAC, emits event per bucket
  - `claim(env, padala_id, bucket_id, merchant) -> ()` — checks merchant in whitelist (or category == FreeCash), transfers SAC to merchant, marks claimed, emits event
  - `get_padala(env, padala_id) -> Padala` — read-only view
  - `add_merchant(env, category, merchant)` — admin/registry (demo: open for hackathon, governance later)
- Tests: unit (Vitest-equivalent — `cargo test`): happy path, double-claim revert, non-whitelisted merchant revert, wrong recipient revert
- Deploy to testnet, capture contract ID

### Phase 2 — Shared TS SDK package (Day 1, ~2 hrs)
- `rpc.Server` singleton
- Tx builders: `buildCreatePadala()`, `buildClaim()`
- Helpers: `simulateAndAssemble()`, `pollFinality(hash)` — guards against `sendTransaction = success` pitfall
- USDC SAC asset constant for testnet
- Types mirroring contract storage

### Phase 3 — Self-custodial wallet core (Day 2 AM, ~3 hrs)
- BIP-39 mnemonic gen (in-browser)
- Password → key (PBKDF2 / Argon2 via `argon2-browser`)
- AES-GCM encrypt mnemonic → `localStorage`
- Login: decrypt → in-memory `Keypair`, never persisted plain
- Vitest: encrypt/decrypt roundtrip, wrong-password failure, mnemonic determinism

### Phase 4 — Sender flow UI (Day 2 PM, ~4 hrs)
- `/onboard` → create wallet (password)
- `/dashboard` → USDC balance + friendbot button (testnet)
- `/send` → recipient input + bucket allocator (sliders or amount inputs per category, total = balance)
- Submit → simulate → sign locally → submit → poll → success screen w/ contract tx hash + claim link

### Phase 5 — Receiver claim flow UI (Day 3 AM, ~4 hrs)
- `/claim/[padalaId]` → fetches `Padala` via RPC `getContractData`
- Renders bucket list w/ amounts + per-category merchant picker
- Tap bucket → pick merchant (mocked merchant list seeded into contract) → sign + submit `claim`
- Free cash bucket → SEP-24 interactive deposit flow (`@stellar/stellar-sdk` SEP-24 helper) → display pickup code

### Phase 6 — Sender transparency view (Day 3 PM, ~2 hrs)
- `/padala/[id]` → list of claims, ledger of which bucket released to which merchant, timestamps
- Pulls Soroban contract events via RPC `getEvents`

### Phase 7 — Polish + demo (Day 4, ~4 hrs)
- Empty states, error toasts, tx pending spinners
- Mobile-first responsive (PWA install prompt)
- Seed 3 schools, 3 utilities, 3 clinics as mock merchants on testnet
- Record 3-min demo video: split-screen OFW (PH abroad) + family (PH home)
- README: tech stack, run instructions, contract ID, demo accounts, mainnet roadmap
- Submission per `SUBMISSION_GUIDELINES.md`

### Phase 8 — Stretch (only if Phase 0–7 green)
- Multi-recipient split (one padala → multiple family members)
- Recurring padala (monthly auto-create via cron + Soroban)
- Sender SMS-link claim (SEP-7 deep link for low-tech family members)
- Reputation: family on-time claims → higher trust → more free cash %

## 7. Risks + Mitigations

| Risk                                    | Mitigation                                                       |
|-----------------------------------------|------------------------------------------------------------------|
| SEP-24 anchor flaky on testnet          | Use mock anchor screen; show real PHP off-ramp on mainnet roadmap |
| Soroban USDC SAC quirks                 | Lock SDK v14, test SAC transfer in Phase 1 day 0                 |
| Self-custodial UX scares non-crypto family | Hide mnemonic behind "Advanced", default password recovery via sender-side share |
| `sendTransaction` ≠ finality            | All txs go through `pollFinality()` helper in SDK package        |
| Scope creep                             | Phase 8 fenced. No multi-recipient/recurring until 0–7 ship      |

## 8. Mainnet Roadmap (for +2 bonus + judges' Q&A)

- Phase A: partner w/ 1 PH anchor (e.g. Coins.ph SEP-24 or Anclap PHP) for real off-ramp
- Phase B: KYC-light onboarding via SEP-12 for senders abroad (regulatory comfort)
- Phase C: merchant whitelist governance — schools onboarded via DepEd partnership, utilities via biller APIs
- Phase D: SEP-31 cross-border send from non-USDC corridors (USD/SGD/AED for major OFW countries: US, Singapore, UAE, Saudi)

## 9. Why this wins vs. other PH ideas

- vs generic remittance app: **purpose-lock is the angle**, not "another GCash"
- vs sari-sari fintech: bigger market, sharper emotional hook
- vs DeFi: judges weight Track 1 highest; remittance = flagship
- vs AI: doesn't require AI gymnastics; Stellar primitives do the work, aligns w/ criterion 1
- Originality check: grep `stellar_repos.txt` for "remittance + purpose lock + claimable balance + merchant whitelist" combo — likely zero direct matches

---

## 10. Build status (updated 2026-06-20)

Phase 0–7 shipped. Contract redeployed with multi-recipient + recurring:
`CBJB25C53BROIXL77U3Z33ZZ6LEZ3YHJQAMLAA5CZWQOK2MWCNXDO443` (16 merchants reseeded).
See `docs/testnet-state.md` for live IDs + ops.

- **Phase 5 / SEP-24:** ✅ real off-ramp. FreeCash claimed to recipient wallet,
  then SEP-10 auth + SEP-24 interactive withdraw vs `testanchor.stellar.org`
  (`packages/sdk/src/sep24.ts`, `apps/web/src/components/sep24-cashout.tsx`).
  Asset caveat: testanchor uses its own asset; mainnet swaps PadaLock USDC → PH
  partner anchor PHP rail.
- **Phase 8 — SEP-7 deep-link claim:** ✅ shareable claim link + QR + native
  Share on send-success (`apps/web/src/components/claim-share.tsx`). Note: claim
  needs recipient auth, so it's an https deep link + QR, not a SEP-7 tx URI.
- **Phase 8 — Multi-recipient split:** ✅ per-bucket recipient in the contract;
  send UI "send buckets to different family members"; claim gates per bucket.
- **Phase 8 — Recurring padala:** ✅ prefunded schedule (`create_recurring` /
  permissionless `execute_due` / `cancel_recurring` refund). Send-page toggle +
  `/recurring/[id]` management page. Off-chain cron calls `execute_due` when due.
- **Phase 8 — Merchant reputation:** ✅ on-chain track record per merchant
  (`claims`, `volume`, `last_claim_at`), accrued one claim at a time in `claim`.
  `get_reputation(merchant)` read + SDK `getReputation`; claim UI shows each
  whitelisted merchant's claim count in the picker and a trust line for the
  selected merchant. **Not yet redeployed** — live contract still lacks
  `get_reputation`; UI degrades to "new merchant" until redeploy + reseed.

Contract tests: 16/16 `cargo test`. Verified on testnet: create_padala,
create_recurring → execute_due (mints padala with `recurring_id`).

---

*Smallest strong demo. Build Phase 0–7 first. Phase 8 only if green.*
