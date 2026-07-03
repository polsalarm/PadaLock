# PadaLock — Level 4 Plan (Production MVP)

**Goal:** clear every Level 4 requirement + submission-checklist item.
**Repo:** https://github.com/polsalarm/PadaLock (public) · **Live:** https://padalock.vercel.app

---

## Status snapshot — what's already DONE

| Requirement | State | Evidence |
|---|---|---|
| Production-ready MVP (send → claim restricted + free-cash) | ✅ done | app + `pada-lock` contract |
| Stable frontend + contract architecture | ✅ done | Next.js 16 PWA + Soroban Rust, hybrid wallet |
| Mobile responsive UI | ✅ done | `docs/screenshots/mobile-*.png` |
| Loading states + error handling | ✅ mostly | audit pass needed (see G6) |
| Contract deployed on testnet | ✅ done | `CDTXH4OQR2F2ZWTYLKQ4T4FMAA5HGDEK2HAZA3PAMNLNBGRYCEA6VLDI` |
| 15+ meaningful commits | ✅ done | 128 commits |
| Public GitHub repo | ✅ done | polsalarm/PadaLock |
| README documentation | ✅ done | `README.md` |
| Live demo link | ✅ done | padalock.vercel.app |
| Demo video | ✅ done | `docs/demo-video/padalock-demo.mp4` |
| Product/mobile screenshots | ✅ done | `docs/screenshots/` |
| Production deployment | ⚠️ verify | confirm padalock.vercel.app is live prod |

## The GAPS — what Level 4 still needs

| # | Gap | Why blocking |
|---|---|---|
| **G1** | **Monitoring + analytics integration** | Required. No `@vercel/analytics` / error monitoring in app. |
| **G2** | **User feedback collection** | Required. No in-app feedback mechanism. |
| **G3** | **10+ real users onboarded + proof of wallet interactions** | Required. Needs an execution drive + evidence capture. |
| **G4** | **Analytics/monitoring screenshot** | Submission item. Depends on G1. |
| **G5** | **Feedback summary doc** | Submission item. Depends on G2 + G3. |
| **G6** | Loading/error-state polish pass | Requirement quality bar. |
| **G7** | Final submission packaging | Collate all links/proofs in one place. |

---

## Work plan

### G1 — Analytics + monitoring (0.5 day)
- Add **Vercel Web Analytics** + **Speed Insights**:
  - `npm i @vercel/analytics @vercel/speed-insights -w apps/web`
  - Mount `<Analytics />` + `<SpeedInsights />` in `apps/web/src/app/layout.tsx`.
  - Enable Analytics in the Vercel project dashboard.
- Add **product event tracking** for the key funnel (custom events via `track()`):
  - `wallet_created`, `wallet_funded`, `padala_created`, `bucket_claimed`, `feedback_submitted`.
- Add lightweight **error monitoring** (pick one):
  - Simplest: Vercel runtime logs + a client `window.onerror` → `track('client_error')`.
  - Better: Sentry (`@sentry/nextjs`) if time allows.
- **Acceptance:** dashboard shows page views + at least the `padala_created` / `bucket_claimed` events after a test run.

### G2 — In-app user feedback (0.5 day)
- Build a small **Feedback** widget (floating button or post-claim prompt):
  - Fields: rating (1–5) + free-text + optional wallet address.
  - Store options (pick lowest-friction): a Vercel-marketplace Postgres/KV table, or a Google Form embed, or a simple `/api/feedback` route → append to a store.
  - Fire `track('feedback_submitted')` on submit.
- Place the prompt right after a successful claim (highest-intent moment).
- **Acceptance:** a submitted feedback entry is retrievable + shows in analytics.

### G3 — Onboard 10+ real users w/ proof (1–2 days, parallel)
- **Recruit:** friends/family/OFW contacts + hackathon peers. Target 12 to be safe.
- **Onboarding path** (make it a 1-page guide, `docs/onboarding.md`):
  1. Open padalock.vercel.app on phone.
  2. Create built-in wallet (or connect Freighter).
  3. Fund via one-tap friendbot/faucet.
  4. Do one real interaction: create a padala OR claim a bucket.
- **Capture proof for each user** into `docs/users/` (spreadsheet + screenshots):
  - Wallet public key (G...).
  - Tx hash of their interaction → Stellar Expert link.
  - Timestamp.
- **Acceptance:** ≥10 distinct public keys, each with ≥1 on-chain tx link. Build a proof table.

### G4 — Analytics screenshot (0.25 day, after G1 + G3)
- Once real traffic exists, screenshot the Vercel Analytics + Speed Insights dashboards → `docs/screenshots/analytics.png`.
- Add to `docs/screenshots/README.md` index.

### G5 — Feedback summary (0.25 day, after G2 + G3)
- Write `docs/feedback-summary.md`: # responses, avg rating, top likes, top requests, 2–3 verbatim quotes, and what you'd change next.

### G6 — Loading/error-state polish (0.5 day)
- Audit key flows: wallet create, fund, create padala, claim.
- Ensure each has: skeleton/spinner, disabled-during-submit, human-readable error toast on sim/finality failure, retry affordance.
- Verify with the `verify` skill / manual run on throttled network.

### G7 — Submission packaging (0.25 day)
- Update `README.md` submission section + fill `docs/level-4-submission.md` with:
  - [ ] Public repo link
  - [ ] README link
  - [ ] Commit count (128+)
  - [ ] Live demo link
  - [ ] Contract address (+ Stellar Expert)
  - [ ] Screenshots: product UI, mobile responsive, analytics/monitoring
  - [ ] Demo video link
  - [ ] Proof of 10+ user wallet interactions (table)
  - [ ] Feedback summary link

---

## Sequencing (critical path)

```
Day 1:  G1 analytics ──┐
        G2 feedback ───┤──> deploy to prod ──> G3 onboarding drive starts
Day 2:  G3 continues (collect 10+ proofs) ── G6 polish (parallel)
Day 3:  G4 analytics shot ── G5 feedback summary ── G7 package + submit
```

G3 (real users) is the long pole — kick it off the moment G1+G2 ship to prod, since proof takes real calendar time.

## Definition of done (Level 4)
- [ ] Analytics + monitoring live, dashboard populated
- [ ] In-app feedback working, ≥5 responses collected
- [ ] ≥10 distinct wallets with on-chain tx proof
- [ ] All submission-checklist screenshots captured
- [ ] `docs/level-4-submission.md` complete, every box ticked
- [ ] Prod deploy verified stable on mobile

---

## Notes / risks
- **Prod verify:** confirm padalock.vercel.app serves current build + correct env (contract IDs from `testnet-state.md`).
- **G3 is calendar-bound** — real humans take time. Start recruiting today.
- **Feedback storage:** keep it dead simple; a Google Form is acceptable if a DB slows you down.
- **Keys:** never expose issuer/admin secret keys in the app or repo (they stay in `~/.config/stellar/identity`).
