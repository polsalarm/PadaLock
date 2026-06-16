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

export const BASE_FEE = '1000000';
