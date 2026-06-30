# Phase plan — XLM padala (USDC / XLM asset choice)

> Goal: let the sender choose **USDC or XLM** when creating a padala on `/send`,
> with full escrow + claim working for both assets.

---

## 0. Why this is non-trivial (the constraint)

The deployed PadaLock contract is **bound to a single token at construction**:

```rust
pub fn __constructor(env: Env, admin: Address, token: Address) {
    env.storage().instance().set(&DataKey::Token, &token); // USDC SAC
}
// every transfer uses Self::token(&env)
```

`create_padala` / `claim` / `create_recurring` / `cancel_recurring` all move
`Self::token(&env)`. There is **no per-padala asset**. So a USDC/XLM choice needs
one of: (a) a 2nd contract instance bound to the XLM SAC, or (b) a contract rewrite
to take a per-padala token.

**Chosen approach: (a) a second contract instance** — no contract code change, no
new audit surface. One PadaLock bound to USDC, a second bound to the XLM native SAC.
The UI picks the contract by selected asset.

---

## Prerequisites (already available)

- Local stellar identities: `padalock-admin` (admin/source), `padalock-issuer`,
  and the 16 merchants (`pl-school-*`, `pl-util-*`, `pl-med-*`, `pl-groc-*`).
- Existing uploaded wasm hash: `6ac9fd2e373892244884bcce84dcba0e884f08300c88719c11fb2ed6dca650db`
  (deploy a new instance from this hash — no re-upload needed).
- USDC contract (unchanged): `CDTXH4OQR2F2ZWTYLKQ4T4FMAA5HGDEK2HAZA3PAMNLNBGRYCEA6VLDI`
- Live IDs reference: [`docs/testnet-state.md`](./testnet-state.md).

---

## Phase X1 — Deploy the XLM-bound contract (testnet)

1. **Resolve the XLM native SAC address** (don't hardcode):
   ```bash
   XLM_SAC=$(stellar contract id asset --asset native --network testnet)
   echo "$XLM_SAC"   # expected testnet native SAC, e.g. CAS3J7GYLGXMF6...XOWMA
   ```
2. **Deploy a 2nd PadaLock instance from the existing wasm hash**, token = XLM SAC:
   ```bash
   ADMIN=$(stellar keys address padalock-admin)
   PADALOCK_XLM_ID=$(stellar contract deploy \
     --wasm-hash 6ac9fd2e373892244884bcce84dcba0e884f08300c88719c11fb2ed6dca650db \
     --source padalock-admin --network testnet \
     -- --admin $ADMIN --token $XLM_SAC)
   echo "$PADALOCK_XLM_ID"
   ```
3. Record the new contract id + deploy tx in [`docs/testnet-state.md`](./testnet-state.md).

**Acceptance:** `get_reputation` on the new id returns a zero struct (contract live).

---

## Phase X2 — Seed merchants on the XLM contract

Reuse the same 16 merchant pubkeys (XLM is native → merchants need **no trustline**).

```bash
# categories: 0 tuition, 1 utility, 2 medical, 3 groceries (FreeCash=4 is unrestricted)
declare -A M=(
  [0]="pl-school-up pl-school-ust pl-school-dlsu"
  [1]="pl-util-globe pl-util-maynilad pl-util-manilawater"
  [2]="pl-med-stlukes pl-med-tmc pl-med-asian"
  [3]="pl-groc-puregold pl-groc-robinsons pl-groc-mercury"
)
for cat in 0 1 2 3; do
  for id in ${M[$cat]}; do
    A=$(stellar keys address $id)
    stellar contract invoke --id $PADALOCK_XLM_ID --source padalock-admin --network testnet \
      -- add_merchant --category $cat --merchant $A
  done
done
```

**Acceptance:** claim picker on an XLM padala lists the whitelisted merchants per category.

---

## Phase X3 — SDK + config (dual contract)

- `packages/sdk/src/config.ts`: add
  ```ts
  export const PADALOCK_XLM_CONTRACT_ID = process.env.NEXT_PUBLIC_PADALOCK_XLM_CONTRACT_ID ?? '';
  export const XLM_SAC_TESTNET = process.env.NEXT_PUBLIC_XLM_SAC_TESTNET ?? '';
  ```
- Introduce an `Asset = 'USDC' | 'XLM'` notion. Add a resolver:
  ```ts
  export function contractIdFor(asset: Asset): string {
    return asset === 'XLM' ? PADALOCK_XLM_CONTRACT_ID : PADALOCK_CONTRACT_ID;
  }
  ```
- `tx.ts` builders already accept `contractId?` — thread the resolved id through
  `buildCreatePadala` / `buildClaim` / recurring builders.
- `read.ts`: `getPadala` / `getReputation` must accept a `contractId` (default USDC)
  so the claim/transparency pages can read from the right instance.
- `.env.example` + Vercel env: add
  `NEXT_PUBLIC_PADALOCK_XLM_CONTRACT_ID`, `NEXT_PUBLIC_XLM_SAC_TESTNET`.

**Note:** amounts stay 7-dp stroops for both (XLM and USDC are both 7 dp), so
`toStroops` / `fmtStroops` are unchanged.

---

## Phase X4 — Send UI (`/send`)

- Add an **asset toggle (USDC / XLM)** at the top of the send flow.
- Drive the balance/cap from the selected asset:
  - USDC → `getUsdcBalance`, XLM → `getXlmBalance`.
  - For XLM, reserve ~1–2 XLM for fees/min-balance (don't let total = full balance).
- Pass `contractIdFor(asset)` into `buildCreatePadala` (and recurring).
- PHP estimate: keep USDC↔PHP; for XLM show "≈" via a display-only XLM→PHP rate
  (or hide PHP for XLM until an oracle is wired).
- Bucket categories unchanged.

**Acceptance:** creating an XLM padala escrows native XLM into the XLM contract.

---

## Phase X5 — Claim link must carry the asset (cross-cutting!)

Today the share link is `/claim/<padalaId>` and the claim page assumes the USDC
contract. With two contracts, the **padalaId is only unique per contract**, so the
link must say which asset/contract.

- `claim-share.tsx`: append `?asset=usdc|xlm` to the share URL + QR.
- `/claim/[id]/page.tsx`: read `searchParams.asset` (default `usdc`), resolve
  `contractIdFor(asset)`, read the padala from that contract, and pass the same
  `contractId` into `buildClaim`.
- `/padala/[id]` (transparency) + `getEvents`: same `?asset=` handling.
- Recurring `/recurring/[id]`: same.

**Acceptance:** an XLM claim link opens, lists buckets from the XLM contract, and a
restricted claim routes native XLM to the whitelisted merchant.

---

## Phase X6 — Dashboard / misc polish

- Token list already routes USDC→`/send`. Decide: keep `/send` with the toggle, or
  pass `?asset=` from the dashboard token tap to preselect.
- Free-cash XLM: the SEP-24 off-ramp is USDC-specific (testanchor). For XLM free
  cash, claim to recipient wallet only (skip/disable the SEP-24 cash-out, or label
  it USDC-only).

---

## Phase X7 — Tests

- **Contract:** no code change → existing `cargo test` (16) still covers logic;
  the XLM instance is the same wasm, so behavior is identical. Optionally add an SDK
  test asserting `contractIdFor('XLM')` / `('USDC')` resolve correctly.
- **SDK/web:** unit-test `contractIdFor` + the claim-link asset param parsing.
- **Manual on testnet (golden path, XLM):**
  1. fund sender XLM → `/send` toggle **XLM** → split buckets → create_padala (XLM contract)
  2. open claim link `?asset=xlm` → claim restricted bucket → XLM hits merchant
  3. claim free-cash → XLM hits recipient wallet

---

## Phase X8 — Docs + deploy

- Update `docs/testnet-state.md` with the XLM contract id, deploy tx, merchant seed txs.
- Update root `README.md` deployment env table (+ the two new env vars).
- Set the two env vars in Vercel, redeploy.
- Add an XLM padala screenshot to the gallery if desired.

---

## Risks / notes

- **Claim-link format change is the riskiest bit** — every entry point that takes a
  `padalaId` (claim, transparency, recurring, share) must learn `?asset=`. Audit all
  links before shipping or USDC claim links could resolve against the wrong contract.
- XLM min-balance/reserve: never let a sender escrow their entire XLM balance.
- SEP-24 off-ramp stays USDC-only (testanchor asset). XLM free-cash = wallet claim only.
- Rollback: the XLM path is purely additive (new env + new contract). Removing the
  toggle + env reverts to USDC-only with zero contract impact.

---

## Definition of done

- [x] XLM PadaLock deployed (`CATT7GZM…2HVY`) + 16 merchants seeded (Phase X1–X2)
- [x] SDK resolves contract by asset; builders/readers thread `contractId` (X3)
- [x] `/send` asset toggle creates real XLM padalas (X4)
- [x] Claim links carry `?asset=`; XLM claim routes native XLM to merchant (X5)
- [x] Docs + Vercel env updated, redeployed (X8)

> Shipped 2026-06-30. XLM instance, env, and live deploy all in place. Remaining
> manual check: testnet golden path (X7 manual) — fund XLM, send XLM padala,
> claim restricted + free-cash.
