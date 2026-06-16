# PadaLock — Exact Demo Flow (click by click)

The confusion is always the same: **PadaLock needs TWO people** — the OFW who sends, and
the family member who claims. So you need **two browser windows**, each with its own wallet.

- **Window A (normal browser)** = OFW abroad — has the money, sends the padala
- **Window B (incognito window)** = family in PH — receives the claim link, claims buckets

Money never lands in the family's wallet as loose cash. It sits **locked in the contract**
until the family claims each bucket → then it goes straight to the merchant. That is the
whole point of the product.

---

## ONE-TIME SETUP

Dev server must be running: `npm run dev` → http://localhost:3000

---

## PART 1 — OFW wallet (Window A, normal browser)

1. Open **http://localhost:3000**
2. If it lands on **Onboard**: click **Generate recovery phrase** → tick the box → **Continue**
   → set a password → **Create wallet**.
   If it lands on **Login** (wallet already exists): type your password → **Unlock**.
3. You are now on **Dashboard**. Balance probably shows `0.00 USDC`.
4. Click **Fund testnet**. Wait for the 3 steps to finish:
   - Step 1/3 — testnet XLM (for fees)
   - Step 2/3 — enable USDC (your wallet signs)
   - Step 3/3 — mint 1000 test USDC
   Ends with: **"Ready! 1000 test USDC minted 🎉"**
5. Click **Refresh balance** → should now read **1000.00 USDC ≈ ₱57,000**.

> ✅ This already satisfies Risein White Belt: wallet connected, balance shown, on testnet.

---

## PART 2 — Family wallet (Window B, **incognito**)

> Use a *separate incognito window* so it gets its OWN wallet. Same browser profile = same
> wallet = the demo won't work.

1. Open an **incognito window** → **http://localhost:3000**
2. It lands on **Onboard** (no wallet here yet) → **Generate recovery phrase** → tick →
   **Continue** → password → **Create wallet**.
3. On the family **Dashboard**, click **Fund testnet** (family needs XLM to pay claim fees;
   the USDC mint is harmless here too).
4. **Copy the family address** — the `G...` string shown on the dashboard card.
   *(This is the address you will send the padala TO.)*

---

## PART 3 — Send the padala (back to Window A, OFW)

1. Dashboard → **Send padala**.
2. **Send to**: paste the family `G...` address from Part 2 step 4.
3. Allocate amounts (in ₱) across buckets, e.g.:
   - 🎓 Tuition — `5700`
   - 🏥 Medical — `2850`
   - 💵 Free Cash — `1140`
4. Watch the **Total** update at the bottom. Click **Lock & Send**.
5. It runs: Simulating → Signing → Submitting → Polling. Ends with
   **"Padala sent and locked in escrow."**
6. A card appears with the **claim link**, e.g. `http://localhost:3000/claim/4`,
   plus **Copy link** and **Track releases** buttons. **Copy that link.**

> The OFW balance drops by the total. That USDC is now in the contract, not the family wallet.

---

## PART 4 — Claim the padala (Window B, family incognito)

1. Paste the **claim link** into the incognito window → **Enter**.
2. The claim page shows the buckets the OFW sent.
3. **Restricted bucket** (Tuition / Medical / Utility / Groceries):
   - Open the dropdown → pick a whitelisted merchant (e.g. a school) → **Claim Now**.
   - Signing → Submitting → Polling → bucket flips to **✓ Claimed**.
   - The USDC went straight to that merchant's address.
4. **Free Cash bucket**:
   - Paste any `G...` address (the family's own works for the demo) → **Claim Now**.
5. The footer progress bar fills as you claim.

---

## PART 5 — OFW transparency (Window A)

1. Open **http://localhost:3000/padala/4** (same number as the claim link).
2. See the progress arc + **per-bucket release log**: which bucket was released, to which
   merchant. This is the trust feature — the OFW sees exactly where the money went.

---

## TROUBLESHOOTING

| Symptom | Cause / fix |
|---|---|
| No **Onboard** screen | That browser already has a wallet → it skips to Login/Dashboard. Use a fresh incognito window for a new wallet. |
| Friendbot 400 in console | Account already funded with XLM. Harmless — the fund flow handles it and continues. |
| Recipient balance unchanged after send | Correct by design. Money is in the contract escrow until claimed. |
| Claim says "addressed to a different recipient" | The incognito wallet's address ≠ the address you typed in Send. Re-copy the family address and send a fresh padala. |
| "No merchants in the registry" on a restricted bucket | That category has no whitelisted merchant. Tuition/Utility/Medical/Groceries are seeded; if empty, use the Free Cash bucket to demo. |
| Worker / Jest crash on a page | Turbopack flake. Restart: stop dev server, delete `apps/web/.next`, `npm run dev`. |

---

## WHY TWO WALLETS (the mental model)

```
Window A (OFW)            CONTRACT (escrow)            Window B (Family)
   1000 USDC  ──send──►   holds 5 buckets   ──claim──►  picks merchant per bucket
                          locked, per-purpose            money → merchant address
                                                         OFW sees the release log
```

One person can't demo it alone in one window, because the sender and the claimer must be
two different Stellar accounts. Incognito = the second account.
