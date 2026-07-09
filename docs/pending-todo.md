# PadaLock — Pending TODO (Level 4)

> Living checklist of what's left. Updated 2026-07-04.
> ✅ done · ⏳ pending · 🔴 blocker for submission · 👤 needs YOU · 🤖 Claude can do

---

## ✅ Done (don't redo)
- Production MVP + stable frontend/contract architecture
- Contract redeployed (reclaim + TTL): USDC `CB62IOP5…`, XLM `CC6LNV5T…`, 16 merchants ×2
- Contract tests 21/21; on-chain smoke test (create/claim/restricted/reputation/reclaim-gate)
- Browser smoke test (asset switcher, new-contract wiring, create_padala sim, error states)
- Analytics (Vercel Web Analytics + Speed Insights) wired + enabled
- Feedback widget + `/api/feedback` → Discord webhook (verified delivering)
- Dashboard asset switcher (USDC/XLM headline, persisted)
- Send-padala button fix on My Padala
- All docs updated to new contract IDs + new features
- 15+ commits (per-file, no co-author) — repo public
- Live demo (padalock.vercel.app), demo video, product + mobile screenshots

---

## ⏳ Pending — submission blockers

### 🔴 G3 — 10+ wallet on-chain interaction proof  👤+🤖
- Must be on the **NEW** contract (old padalas are on retired contract).
- Options: seed script (QA, on-chain tx from N wallets) **or** real users.
- Capture per wallet: pubkey + tx hash → Stellar Expert link + timestamp → `docs/users/` (local, untracked).
- Deliverable: proof table with ≥10 distinct wallets.

### 🔴 G4 — Analytics / monitoring screenshot  👤
- Vercel Analytics still shows "Get Started" → needs **real browser visits** (curl/seed don't count).
- Action: open padalock.vercel.app in browser (phone + laptop), click ~5 pages, disable ad-blocker, wait ~30s.
- Then screenshot Analytics + Speed Insights dashboards → `docs/screenshots/analytics.png`.

### 🔴 G5 — Feedback summary  👤→🤖
- Real feedback now landing in Discord "Feedback Hook" channel.
- Action: YOU paste the real responses (ratings + text) → Claude writes `docs/feedback-summary.md`
  (# responses, avg rating, top likes, top requests, 2–3 verbatim quotes, what to change next).

### 🟡 G6 — Loading / error-state polish  🤖
- Smoke test showed error states already surface (e.g. "Unsupported address type").
- Remaining: audit wallet-create / fund / send / claim for spinner + disabled-on-submit + retry.

### 🟡 G7 — Submission packaging  🤖
- Create `docs/level-4-submission.md` with every checklist item + links:
  repo · README · commit count · live demo · contract addresses (+Expert) ·
  screenshots (UI, mobile, analytics) · demo video · 10-wallet proof · feedback summary.

---

## 👤 Manual tasks (only you can do)
- [ ] Delete Claude's **test messages** from Discord "Feedback Hook" channel (5 total: 3 setup + 2 retests) so summary is clean.
- [ ] Generate real browser traffic for G4 analytics.
- [ ] Recruit/collect the 10 wallet interactions (or approve the seed script).
- [ ] Paste real Discord feedback for G5.

---

## 🧊 Deferred / optional (not required for Level 4)
- **Contract Option A — per-padala token**: unify USDC+XLM into one multi-asset contract (kills two-instance split + `?asset=` fragility). Skipped for now; two-instance setup works.
- **Reclaim live demo**: `reclaim` visible card only appears after 30-day expiry — can't demo live; unit-tested + on-chain gate (#15) verified.
- Sentry / richer error monitoring (Vercel logs + client `track('client_error')` is the lightweight baseline).

---

## Quick reference
- Live: https://padalock.vercel.app
- Contracts: USDC `CB62IOP52GFYM7FFKHFVJLINQJJBHFWIVFGACGZ3MSMPELSTBG7RF5YE` · XLM `CC6LNV5T6PIKMUJGWUHSE3ZEDU4YTKNQCRUGQHZXS422ALV4PVTM4KVM`
- Live IDs + ops: `docs/testnet-state.md`
- Full Level 4 plan: `docs/level-4-plan.md`
