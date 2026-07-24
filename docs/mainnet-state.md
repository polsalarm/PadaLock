# PadaLock — mainnet deployment state

> Live source of truth for the mainnet contract, keys, and merchants.
> Update this file whenever you redeploy or rotate keys, then mirror into the
> `padalock-mainnet` Vercel project's env vars.

**Last deployed:** 2026-07-24
**Network:** Stellar mainnet (pubnet)
**Network passphrase:** `Public Global Stellar Network ; September 2015`
**RPC URL:** `https://mainnet.sorobanrpc.com`
**Horizon URL:** `https://horizon.stellar.org`

---

## Contracts

| Resource | Contract ID |
|----------|-------------|
| **PadaLock (USDC)** | `CBE7OMDVRVC2DEDZXXVKF6EHUTPM5FYFVB2IP27W2PI24WHI4AAZNQVK` |
| **PadaLock (XLM)** | not deployed |
| **USDC SAC** (Circle) | `CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75` |
| **USDC issuer** (Circle, classic) | `GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN` |

**Stellar Expert:**
- PadaLock (USDC) → https://stellar.expert/explorer/public/contract/CBE7OMDVRVC2DEDZXXVKF6EHUTPM5FYFVB2IP27W2PI24WHI4AAZNQVK

**Wasm size (optimized):** 15,798 bytes (`stellar contract build --optimize` / `stellar contract optimize`)

**Deploy txs:**
- Wasm upload: https://stellar.expert/explorer/public/tx/144d20a24bf86f6af8b098526634a4fd7fcef781df94a03859def9a0aaa5acbb
- Contract create: https://stellar.expert/explorer/public/tx/ce5f463123c9b1481f2e9b210c3ed7e037a8d7a0a27276085d618dccbc9e4708

> Constructor only sets admin/token/counters — merchants added separately below.

---

## Accounts (stellar CLI alias)

| Alias | Role | Public key |
|-------|------|------------|
| `padalock-deployer` | Contract admin + deploy source | `GDUCJRGDMUNKVVCAXHL4BAEDD2KP66CFAYRB3UUPJCKVKQKLR3BDTZYJ` |

---

## Seeded merchants (whitelist)

> **Test keypairs, not real businesses.** Generated the same way as the testnet demo
> merchants — deployer holds all four secrets. Swap for real school/biller/clinic/store
> addresses before any real recipient uses restricted buckets.

| Category # | Category | Alias | Public key | Add tx |
|------------|----------|-------|------------|--------|
| 0 | Tuition | `padalock-merchant-mainnet-0` | `GBMDGB2EPXH7HHYE4KZ2SZSOWDM7M26TWYUK23SFLG7RQJTRN3C6WWLH` | https://stellar.expert/explorer/public/tx/957f1d69eb8c18f7cc6ffebb56483024b1399ba567254102c331d1d4d9d070ec |
| 1 | Utility | `padalock-merchant-mainnet-1` | `GAPSWYJRAAZK4MXKAPSQSPUYNZRYAUPGPMT2B4ODSW2VCJAPR3P3QKWO` | https://stellar.expert/explorer/public/tx/d694f7983f8e0e368aa1eca585bd9051b48dce5a935586e629f753ef7dd39141 |
| 2 | Medical | `padalock-merchant-mainnet-2` | `GAMDRDHLZJMGALPKK55AI6YRCUTSHD6FQWPPFNMAAQFINGIAE5RODUI6` | https://stellar.expert/explorer/public/tx/43071d2e17f48b72d0455bed92bf6089c15b2d45327f084b06756cbfbcc29d18 |
| 3 | Groceries | `padalock-merchant-mainnet-3` | `GADIGUQ7PYXUSQRGDTJWCQKHIM4LEGIOIKJIGBCMLQENCSRVVJ6EEUI2` | https://stellar.expert/explorer/public/tx/ffd48ed6b4e4eb9aa039dc791a6548ac7980806d9fe44f714be3f957951cb47e |
| 4 | FreeCash | — | unrestricted (no whitelist needed) | — |

Key lives in `C:\Users\Admin\.config\stellar\identity\padalock-deployer.toml` — **plaintext,
unencrypted, holds real XLM signing authority.** Back the secret up somewhere safer and treat
this file as sensitive; never commit it.

---

## Deploy cost paid

- Reserve/fund: 30 XLM sent to deployer (10 XLM initial + 20 XLM top-up)
- Actual resource fee for upload+create: **~21.43 XLM** (`min_resource_fee` 214,313,365 stroops) —
  mainnet storage rent for a persisted contract instance, far above testnet-equivalent estimates.
  Budget accordingly for any future mainnet redeploy.

---

## App env (mainnet)

Set on the `padalock-mainnet` Vercel project, not in local `.env.local`:

```env
NEXT_PUBLIC_STELLAR_NETWORK=mainnet
NEXT_PUBLIC_PADALOCK_CONTRACT_ID_MAINNET=CBE7OMDVRVC2DEDZXXVKF6EHUTPM5FYFVB2IP27W2PI24WHI4AAZNQVK
NEXT_PUBLIC_USDC_SAC_MAINNET=CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75
NEXT_PUBLIC_USDC_ISSUER_MAINNET=GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN
NEXT_PUBLIC_SEP24_ANCHOR_DOMAIN=testanchor.stellar.org   # TODO: swap for a real PH anchor before go-live
```

`NEXT_PUBLIC_STELLAR_NETWORK=mainnet` also flips the wallet-kit connect flow to
`Networks.PUBLIC` and hard-disables `/api/faucet` (403) — there is no faucet on mainnet.

---

## Common ops cheatsheet

### Add a merchant (required before any restricted claim works)
```bash
stellar contract invoke \
  --id CBE7OMDVRVC2DEDZXXVKF6EHUTPM5FYFVB2IP27W2PI24WHI4AAZNQVK \
  --source padalock-deployer --network mainnet \
  -- add_merchant --category <0|1|2|3> --merchant <G...>
```

### Read padala
```bash
stellar contract invoke \
  --id CBE7OMDVRVC2DEDZXXVKF6EHUTPM5FYFVB2IP27W2PI24WHI4AAZNQVK \
  --source padalock-deployer --network mainnet \
  -- get_padala --padala_id <N>
```

### Redeploy (after contract change)
```bash
npm run contract:build
stellar contract optimize --wasm contracts/pada-lock/target/wasm32v1-none/release/pada_lock.wasm
stellar contract deploy \
  --wasm contracts/pada-lock/target/wasm32v1-none/release/pada_lock.optimized.wasm \
  --source padalock-deployer --network mainnet \
  -- --admin GDUCJRGDMUNKVVCAXHL4BAEDD2KP66CFAYRB3UUPJCKVKQKLR3BDTZYJ --token CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75
# → new contract id; update this file + padalock-mainnet Vercel env
```
