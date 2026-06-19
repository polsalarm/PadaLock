# PadaLock — Whitelisted Merchants (testnet)

> On-chain merchant registry for the PadaLock contract. Restricted buckets can
> only release funds to an address in the matching category below. Free Cash
> (category 4) has **no** whitelist — any Stellar address is allowed.

- **Contract:** `CBJB25C53BROIXL77U3Z33ZZ6LEZ3YHJQAMLAA5CZWQOK2MWCNXDO443`
- **Network:** Stellar testnet
- **Admin (can add merchants):** `padalock-admin` → `GDLAUXNTOX3PAILWZRAS25B5AIAWXAYFNUJHJV4B7SFQWNHZR2CTEFYV`
- **Last updated:** 2026-06-16 — 4 merchants per restricted category

Friendly names are a frontend label map (`MERCHANT_NAMES` in
`apps/web/src/app/claim/[id]/page.tsx`); the contract stores addresses only.

---

## Category 0 — 🎓 Tuition (Pang-aral)

| Name | Address | CLI alias |
|---|---|---|
| Ateneo de Manila University | `GAPJSUJQF3NJR5CGON3N6G7DEVVHZMPJAVW7K5RMKQAOFK4ZUSPUPO6K` | padalock-merchant-0 |
| De La Salle University | `GCF6T3NUYIWBO2NEILJWJ6VPPTYH3STOISAHH4RQG4V6ZMFOCNLBOGPU` | pl-school-dlsu |
| University of Santo Tomas | `GCMVLV3KX23A74CTHG6MKKE6K5DG2DNL45HNVV7JWQKXFIHBF6BVE6SF` | pl-school-ust |
| UP Diliman | `GBTVDI5XNDPPKU73E5M4KKVX2O4ARBKVHJNQCGN6B2PFGNVHCKSCCDF7` | pl-school-up |

## Category 1 — 💡 Utility (Bayarin)

| Name | Address | CLI alias |
|---|---|---|
| Meralco | `GAF3RRXMZNCDEBVDONOLTWXPSPVRB6YVQNIYBLBQGA3TT4FFNYYVS5L3` | padalock-merchant-1 |
| Maynilad Water | `GDJJARLODLEDMBYNAV5B2ZV6ABN63ZSXBYGDBI37PLNOWVS5F4TJNKEW` | pl-util-maynilad |
| Globe Telecom | `GBNKJEK3UBPCU5I2QR3H2VSI3F7CDLDYD7W2Y22VXK74DPEQXERL7J4B` | pl-util-globe |
| Manila Water | `GCSKOODTXNRV6KLTXF54H5PZWFNVHTWJ7BG6QA3SP3O2YHGIYP6W4QAI` | pl-util-manilawater |

## Category 2 — 🏥 Medical (Kalusugan)

| Name | Address | CLI alias |
|---|---|---|
| Makati Medical Center | `GD4AHVJWY2MI3E5O7YI66XFRSJ43HYQ6FCWW5K7LOQWDTZWAM6C6PZHT` | padalock-merchant-2 |
| St. Luke's Medical Center | `GCC5WOTSCOX3FHP3QPT2CHVSSCVKTUDAKMXVFMXGKMW23JVDS5A4ZELO` | pl-med-stlukes |
| The Medical City | `GB5U7ZMVHLBB4JF2CYU6RHBJXHRRWMJKN5BNECI7CZWRQC3DLAY3N2FJ` | pl-med-tmc |
| Asian Hospital | `GAR4AP6HTMAAIJWXIDNUVGGY4CK5W76G5SOIQTZ22IUHNYVA4XJU5AJ5` | pl-med-asian |

## Category 3 — 🛒 Groceries (Pamilihan)

| Name | Address | CLI alias |
|---|---|---|
| SM Supermarket | `GC6NYRQP7O2TT4VFZKQXEZOX2QKQ6HHQTBCZ4TZDLIZQZZN7AKIKVMXX` | padalock-merchant-3 |
| Puregold | `GDO77J5CD4YOEBUB7USQEDH6FBAXZPZHFHITG5DDLUKURYLPDO6COZCW` | pl-groc-puregold |
| Robinsons Supermarket | `GAXM7366IAMIA4ZIGBJQCJQ3RBJ27WXLQVMB55PHXTYKAVCDSHVCMPFH` | pl-groc-robinsons |
| Mercury Drug | `GABX5JDV3D5VY4WIZ6OYUJHKKSSSMMQZHYUGHO76IKR4NGRAZOKRH2OW` | pl-groc-mercury |

## Category 4 — 💵 Free Cash (Allowance)

No whitelist. Recipient pastes any Stellar address (e.g. their own off-ramp /
GCash-linked account). Used for unrestricted spending money.

---

## Add another merchant

```bash
stellar keys generate <alias> --network testnet --fund
ADDR=$(stellar keys address <alias>)
stellar contract invoke \
  --id CBJB25C53BROIXL77U3Z33ZZ6LEZ3YHJQAMLAA5CZWQOK2MWCNXDO443 \
  --source padalock-admin --network testnet \
  -- add_merchant --category <0|1|2|3> --merchant $ADDR
```

Then add the address → name pair to `MERCHANT_NAMES` in
`apps/web/src/app/claim/[id]/page.tsx`.

## Read the live whitelist

```bash
stellar contract invoke \
  --id CBJB25C53BROIXL77U3Z33ZZ6LEZ3YHJQAMLAA5CZWQOK2MWCNXDO443 \
  --source padalock-admin --network testnet \
  -- get_merchants --category <0|1|2|3>
```
