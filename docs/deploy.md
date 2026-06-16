# Deploying PadaLock to testnet

## 1. Build contract
```bash
npm run contract:build
# wasm at contracts/pada-lock/target/wasm32v1-none/release/pada_lock.wasm
```

## 2. Configure stellar CLI
```bash
stellar network add testnet \
  --rpc-url https://soroban-testnet.stellar.org \
  --network-passphrase "Test SDF Network ; September 2015"

stellar keys generate admin --network testnet --fund
ADMIN=$(stellar keys address admin)
```

## 3. Pick a SAC token
For demos, wrap a test asset:
```bash
# Issuer
stellar keys generate issuer --network testnet --fund
ISSUER=$(stellar keys address issuer)

# Distributor account that holds USDC
stellar keys generate dist --network testnet --fund

# Trust + payment so dist holds 1,000,000 USDC
# (use stellar-cli horizon ops or the SDK)
```

Wrap as SAC:
```bash
USDC_SAC=$(stellar contract asset deploy --asset USDC:$ISSUER --source admin --network testnet)
```

## 4. Deploy PadaLock
```bash
PADALOCK_ID=$(stellar contract deploy \
  --wasm contracts/pada-lock/target/wasm32v1-none/release/pada_lock.wasm \
  --source admin --network testnet \
  -- --admin $ADMIN --token $USDC_SAC)
```

## 5. Seed mock merchants
```bash
for cat in 0 1 2 3; do
  stellar keys generate merchant-$cat --network testnet --fund
  M=$(stellar keys address merchant-$cat)
  stellar contract invoke --id $PADALOCK_ID --source admin --network testnet \
    -- add_merchant --category $cat --merchant $M
done
```

## 6. Wire env
Copy `.env.example` to `apps/web/.env.local` and fill:
```
NEXT_PUBLIC_PADALOCK_CONTRACT_ID=<PADALOCK_ID>
NEXT_PUBLIC_USDC_SAC_TESTNET=<USDC_SAC>
```

## 7. Run app
```bash
npm run dev
# http://localhost:3000
```
