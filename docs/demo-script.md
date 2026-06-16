# PadaLock — 3-minute demo script

## Setup before demo
- `apps/web` running on http://localhost:3000
- Contract deployed (see [deploy.md](./deploy.md))
- Two browsers / split-screen:
  - **OFW** browser (e.g. profile A) → "abroad"
  - **Family** browser (e.g. profile B) → "PH"
- OFW account holds USDC (from mint to distributor)
- Mock merchants seeded for categories 0–3

## Beat 1 — Problem (0:00–0:25)
> "Filipinos abroad send $36B home each year. Once it lands, senders lose control —
> a lump sum that can vanish on non-essentials before kids' tuition or the electric
> bill get paid. PadaLock fixes that."

## Beat 2 — OFW splits a padala (0:25–1:15)
- OFW browser → onboarding flow already done → /dashboard shows USDC balance
- Tap **Send padala**
- Paste family's Stellar address
- Allocate: 🎓 Tuition 100 · 💡 Utility 30 · 💵 Free cash 20
- Tap **Lock & send**
- Show: simulate → sign locally → submit → poll finality → padala ID shown
> "All three buckets are now in a Soroban escrow. Family can claim them — but
> tuition can *only* go to a whitelisted school account."

## Beat 3 — Family claims (1:15–2:30)
- Family browser → opens claim link → onboard / unlock prompt
- Page shows 3 buckets with amounts
- Tap **🎓 Tuition** → dropdown of whitelisted school accounts → pick School A → claim
  - Tx fires, polling, ✓ released to merchant
- Tap **💵 Free cash** → paste any address → claim
  - Tx fires, ✓ released
- Try **non-whitelisted merchant** for tuition (if demo time): rejected by contract
> "Contract enforces the rule. UI doesn't. This is the trust layer."

## Beat 4 — Sender transparency (2:30–2:55)
- Back to OFW browser → /padala/[id]
- Show: total sent vs claimed, per-bucket release log, merchant addresses
> "OFW sees exactly which bucket released to which merchant, on chain."

## Beat 5 — Close (2:55–3:00)
> "Built on Stellar testnet. Claimable balances + Soroban escrow + path-payment
> merchant settlement + SEP-24 PHP off-ramp roadmap. PadaLock."

---

## Fallback if something breaks
- Network slow → switch to pre-recorded screen capture
- RPC down → show contract tests passing (`cargo test`) + Wasm hash
