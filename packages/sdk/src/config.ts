import { Networks } from '@stellar/stellar-sdk';

// NOTE: must use static `process.env.NEXT_PUBLIC_*` access — Next only inlines
// literal member access, not computed `process.env[name]`. `.trim()` strips any
// stray whitespace/newline a value may have picked up (e.g. CLI stdin piping).
export const IS_MAINNET =
  (process.env.NEXT_PUBLIC_STELLAR_NETWORK ?? '').trim() === 'mainnet';

export const NETWORK = IS_MAINNET
  ? {
      passphrase: Networks.PUBLIC,
      rpcUrl: 'https://mainnet.sorobanrpc.com',
      horizonUrl: 'https://horizon.stellar.org',
      friendbotUrl: '', // no faucet on mainnet — real XLM only
    }
  : {
      passphrase: Networks.TESTNET,
      rpcUrl: 'https://soroban-testnet.stellar.org',
      horizonUrl: 'https://horizon-testnet.stellar.org',
      friendbotUrl: 'https://friendbot.stellar.org',
    } as const;

export const USDC_SAC_TESTNET =
  (process.env.NEXT_PUBLIC_USDC_SAC_TESTNET ?? '').trim();

export const USDC_ISSUER_TESTNET =
  (process.env.NEXT_PUBLIC_USDC_ISSUER_TESTNET ?? '').trim();

export const USDC_CODE = 'USDC';

/** Active USDC SAC contract id for the current network. */
export const USDC_SAC = IS_MAINNET
  ? (process.env.NEXT_PUBLIC_USDC_SAC_MAINNET ?? '').trim()
  : USDC_SAC_TESTNET;

/** Active USDC classic issuer for the current network (Circle on mainnet). */
export const USDC_ISSUER = IS_MAINNET
  ? (process.env.NEXT_PUBLIC_USDC_ISSUER_MAINNET ?? '').trim()
  : USDC_ISSUER_TESTNET;

export const PADALOCK_CONTRACT_ID = IS_MAINNET
  ? (process.env.NEXT_PUBLIC_PADALOCK_CONTRACT_ID_MAINNET ?? '').trim()
  : (process.env.NEXT_PUBLIC_PADALOCK_CONTRACT_ID ?? '').trim();

/** XLM-bound PadaLock instance (native SAC token). Separate contract per asset. */
export const PADALOCK_XLM_CONTRACT_ID = IS_MAINNET
  ? (process.env.NEXT_PUBLIC_PADALOCK_XLM_CONTRACT_ID_MAINNET ?? '').trim()
  : (process.env.NEXT_PUBLIC_PADALOCK_XLM_CONTRACT_ID ?? '').trim();

/** XLM native Stellar Asset Contract id on testnet. */
export const XLM_SAC_TESTNET =
  (process.env.NEXT_PUBLIC_XLM_SAC_TESTNET ?? '').trim();

/** Asset a padala is denominated in. Each asset = its own PadaLock instance. */
export type PadalaAsset = 'USDC' | 'XLM';

/** Resolve the PadaLock contract id for the chosen asset. */
export function contractIdFor(asset: PadalaAsset): string {
  return asset === 'XLM' ? PADALOCK_XLM_CONTRACT_ID : PADALOCK_CONTRACT_ID;
}

/** Normalize an untrusted asset string (e.g. from a claim-link query param). */
export function parseAsset(raw: string | null | undefined): PadalaAsset {
  return String(raw).toLowerCase() === 'xlm' ? 'XLM' : 'USDC';
}

export const BASE_FEE = '1000000';
