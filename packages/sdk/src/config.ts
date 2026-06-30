import { Networks } from '@stellar/stellar-sdk';

export const NETWORK = {
  passphrase: Networks.TESTNET,
  rpcUrl: 'https://soroban-testnet.stellar.org',
  friendbotUrl: 'https://friendbot.stellar.org',
} as const;

export const USDC_SAC_TESTNET =
  process.env.NEXT_PUBLIC_USDC_SAC_TESTNET ?? '';

export const USDC_ISSUER_TESTNET =
  process.env.NEXT_PUBLIC_USDC_ISSUER_TESTNET ?? '';

export const USDC_CODE = 'USDC';

export const PADALOCK_CONTRACT_ID =
  process.env.NEXT_PUBLIC_PADALOCK_CONTRACT_ID ?? '';

/** XLM-bound PadaLock instance (native SAC token). Separate contract per asset. */
export const PADALOCK_XLM_CONTRACT_ID =
  process.env.NEXT_PUBLIC_PADALOCK_XLM_CONTRACT_ID ?? '';

/** XLM native Stellar Asset Contract id on testnet. */
export const XLM_SAC_TESTNET =
  process.env.NEXT_PUBLIC_XLM_SAC_TESTNET ?? '';

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
