# Screenshots

Drop the submission screenshots here, keeping these exact filenames so the
root `README.md` references resolve:

| File | Shows | Status / how to capture |
|------|-------|----------------|
| `tests-cargo.png` | Contract tests — `cargo test`, 16 passed | ✅ added |
| `tests-vitest.png` | Frontend + SDK — `vitest`, 18 passed | ✅ added |
| `mobile-responsive.png` | Mobile-responsive UI | ⬜ Open live site → Chrome DevTools device toolbar (`Ctrl+Shift+M`, iPhone) → `Win+Shift+S` → save here. |
| `ci-pipeline.png` | CI/CD pipeline (both jobs green) | ⬜ GitHub → Actions → latest **CI** run → snip the two green jobs → save here. |
| `stellar-contract.png` | Contract + tx history on Stellar Expert | ⬜ Open the [contract page](https://stellar.expert/explorer/testnet/contract/CB62IOP52GFYM7FFKHFVJLINQJJBHFWIVFGACGZ3MSMPELSTBG7RF5YE) → snip summary + history → save here. |

⬜ items 404 in the root README until the PNG is dropped in with the exact filename.

## Framed (phone mockup)

`framed/` holds device-mockup versions of the mobile shots (black bezel + shadow
on a lavender backdrop) for the pitch deck / submission. Prefer these when a
polished hero image is needed.

| File | Source |
|------|--------|
| `framed/mobile-send.png` | `mobile-send.png` |
| `framed/mobile-connect.png` | `mobile-connect.png` |
| `framed/mobile-family.png` | `mobile-family.png` |
| `framed/mobile-settings.png` | `mobile-settings.png` |
| `framed/mobile-responsive.png` | `mobile-responsive.png` |

Regenerate after updating a source screenshot: run the sharp-based frame script
(`node frame.js` with `NODE_PATH` pointing at `apps/web/node_modules`). Same
bezel as the in-app `<PhoneFrame>` component.
