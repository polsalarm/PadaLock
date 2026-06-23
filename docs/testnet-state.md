# PadaLock — testnet deployment state

> Live source of truth for deployed contract IDs, keys, and merchants.
> Update this file whenever you redeploy or rotate keys, then mirror into
> `apps/web/.env.local`.

**Last deployed:** 2026-06-24 (merchant reputation rebuild)
**Network:** Stellar testnet
**Network passphrase:** `Test SDF Network ; September 2015`
**RPC URL:** `https://soroban-testnet.stellar.org`

---

## Contracts

| Resource | Contract ID |
|----------|-------------|
| **PadaLock** | `CDTXH4OQR2F2ZWTYLKQ4T4FMAA5HGDEK2HAZA3PAMNLNBGRYCEA6VLDI` |
| **USDC SAC** | `CCBUASQQH2CSNCMQCLW5I25LXO2V7DQQTIKZ34YGTBGTDU3JGBASIXYJ` |

**Stellar Expert:**
- PadaLock → https://stellar.expert/explorer/testnet/contract/CDTXH4OQR2F2ZWTYLKQ4T4FMAA5HGDEK2HAZA3PAMNLNBGRYCEA6VLDI
- USDC SAC → https://stellar.expert/explorer/testnet/contract/CCBUASQQH2CSNCMQCLW5I25LXO2V7DQQTIKZ34YGTBGTDU3JGBASIXYJ

**Wasm hash:** `6ac9fd2e373892244884bcce84dcba0e884f08300c88719c11fb2ed6dca650db`
**Wasm size:** 16663 bytes
**Exported fns:** `__constructor add_merchant cancel_recurring claim create_padala create_recurring execute_due get_merchants get_padala get_recurring get_reputation`

**Deploy txs:**
- SAC deploy: https://stellar.expert/explorer/testnet/tx/9b4a382a7f66bff017926ba8060c798daac034716e953e8f7619901d39f8cb2d
- PadaLock wasm upload (reputation): https://stellar.expert/explorer/testnet/tx/52c3ca46659abe5a37f996b95eb13dc9626b10daf1a15238515e8eb09ef51e15
- PadaLock deploy (merchant reputation): https://stellar.expert/explorer/testnet/tx/8214e34844f89515fd08ef2db494f45c3cfb5e11134b7441ecf722fcc158d4f4

> **Prior contracts (deprecated, do not use):**
> - `CBJB25C53BROIXL77U3Z33ZZ6LEZ3YHJQAMLAA5CZWQOK2MWCNXDO443` — multi-recipient + recurring (pre-2026-06-24), no `get_reputation`.
> - `CDKTQSPVIVW4UZMKHMVLD4FNDVQ2NGYGCQHGVTIX7MEGIR5WOXSOZX4X` — single-recipient (pre-2026-06-20).

---

## Accounts (stellar CLI aliases)

| Alias | Role | Public key |
|-------|------|------------|
| `padalock-admin` | PadaLock contract admin (whitelist merchants) | `GDLAUXNTOX3PAILWZRAS25B5AIAWXAYFNUJHJV4B7SFQWNHZR2CTEFYV` |
| `padalock-issuer` | USDC asset issuer (also SAC admin → mint authority) | `GAZ5YSMH4Z2VXLLVR7FE7RENVBSDLU5U4PCJZYHRFZSBANA765TZEUQE` |

Keys live in `C:\Users\Admin\.config\stellar\identity\*.toml`.

---

## Seeded merchants (whitelist)

| Category # | Category | Alias | Public key | Add tx |
|------------|----------|-------|------------|--------|
| 0 | Tuition | `padalock-merchant-0` | `GAPJSUJQF3NJR5CGON3N6G7DEVVHZMPJAVW7K5RMKQAOFK4ZUSPUPO6K` | https://stellar.expert/explorer/testnet/tx/ad0d3b929402e96ffc657cf094bcae1667bdf74f5c84cc9612a1333e2ef2308c |
| 1 | Utility | `padalock-merchant-1` | `GAF3RRXMZNCDEBVDONOLTWXPSPVRB6YVQNIYBLBQGA3TT4FFNYYVS5L3` | https://stellar.expert/explorer/testnet/tx/8a3d7f2f36bd997cf8b5a1a9255a31c7f28f732c8ef691c73932375db7524c76 |
| 2 | Medical | `padalock-merchant-2` | `GD4AHVJWY2MI3E5O7YI66XFRSJ43HYQ6FCWW5K7LOQWDTZWAM6C6PZHT` | https://stellar.expert/explorer/testnet/tx/062d96fede7bbc8777efd509464d0afd9e1ddfc5d2d854b87e8c3a152b6caea1 |
| 3 | Groceries | `padalock-merchant-3` | `GC6NYRQP7O2TT4VFZKQXEZOX2QKQ6HHQTBCZ4TZDLIZQZZN7AKIKVMXX` | https://stellar.expert/explorer/testnet/tx/a6c5e813ab60340fa6423a093cd8589f219c5e09e727275e985a03bbafce0b4f |
| 4 | FreeCash | — | unrestricted (no whitelist needed) | — |

---

## App env

`apps/web/.env.local`:

```env
NEXT_PUBLIC_PADALOCK_CONTRACT_ID=CDTXH4OQR2F2ZWTYLKQ4T4FMAA5HGDEK2HAZA3PAMNLNBGRYCEA6VLDI
NEXT_PUBLIC_USDC_SAC_TESTNET=CCBUASQQH2CSNCMQCLW5I25LXO2V7DQQTIKZ34YGTBGTDU3JGBASIXYJ
NEXT_PUBLIC_SEP24_ANCHOR_DOMAIN=testanchor.stellar.org
```

Update both this file AND `.env.local` after any redeploy.

---

## Common ops cheatsheet

### Mint USDC to a wallet (OFW funding)
```bash
stellar contract invoke \
  --id CCBUASQQH2CSNCMQCLW5I25LXO2V7DQQTIKZ34YGTBGTDU3JGBASIXYJ \
  --source padalock-issuer --network testnet \
  -- mint --to <OFW_PUB> --amount 10000000000   # 1000 USDC (7 dp)
```

### Add new merchant
```bash
stellar contract invoke \
  --id CDKTQSPVIVW4UZMKHMVLD4FNDVQ2NGYGCQHGVTIX7MEGIR5WOXSOZX4X \
  --source padalock-admin --network testnet \
  -- add_merchant --category <0|1|2|3> --merchant <G...>
```

### Read padala
```bash
stellar contract invoke \
  --id CDTXH4OQR2F2ZWTYLKQ4T4FMAA5HGDEK2HAZA3PAMNLNBGRYCEA6VLDI \
  --source padalock-admin --network testnet \
  -- get_padala --padala_id <N>
```

### Recurring padala (prefunded schedule)
`create_recurring` escrows `occurrences * total` up front. `execute_due` is
**permissionless** — anyone may trigger it once `next_run` has elapsed (a cron,
the family, or the sender). `cancel_recurring` refunds the unspent prefund to the
sender. Each run mints a normal Padala (`recurring_id` = schedule id).
```bash
# inspect a schedule
stellar contract invoke --id CDTXH4OQR2F2ZWTYLKQ4T4FMAA5HGDEK2HAZA3PAMNLNBGRYCEA6VLDI \
  --source padalock-admin --network testnet -- get_recurring --rec_id <N>

# trigger the next due run (off-chain cron calls this)
stellar contract invoke --id CDTXH4OQR2F2ZWTYLKQ4T4FMAA5HGDEK2HAZA3PAMNLNBGRYCEA6VLDI \
  --source <ANY_FUNDED_KEY> --network testnet -- execute_due --rec_id <N>
```

### SEP-24 off-ramp (FreeCash cash-out)
FreeCash is claimed to the recipient's own wallet, then cashed out via real
SEP-24 against `testanchor.stellar.org` (SEP-1 toml → SEP-10 auth → interactive
withdraw → poll). Anchor asset ≠ PadaLock USDC, so the protocol is wired
end-to-end for the demo; mainnet swaps PadaLock USDC → a PH partner anchor's PHP.

### Redeploy (after contract change)
```bash
npm run contract:build
stellar contract deploy \
  --wasm contracts/pada-lock/target/wasm32v1-none/release/pada_lock.wasm \
  --source padalock-admin --network testnet \
  -- --admin <ADMIN_PUB> --token <USDC_SAC>
# → new PADALOCK_CONTRACT_ID; update this file + .env.local
```

---

## Dev server

```bash
npm run dev   # apps/web → http://localhost:3000
```
