import {
  Account,
  Address,
  Contract,
  TransactionBuilder,
  rpc,
  scValToNative,
  nativeToScVal,
} from '@stellar/stellar-sdk';
import { BASE_FEE, NETWORK, PADALOCK_CONTRACT_ID } from './config';
import { getRpcServer } from './rpc';
import type { PadalaView, BucketCategory, BucketView } from './types';

const CATEGORY_NAMES: BucketCategory[] = [
  'Tuition',
  'Utility',
  'Medical',
  'Groceries',
  'FreeCash',
];

/** Dummy source acct used for simulate-only reads. */
const DUMMY_PUB = 'GAAAAAAAACGC6';

async function simRead(
  callerPub: string,
  fn: string,
  ...args: ReturnType<typeof nativeToScVal>[]
): Promise<unknown> {
  const server = getRpcServer();
  const acct = await server.getAccount(callerPub);
  const source = new Account(acct.accountId(), acct.sequenceNumber());
  const contract = new Contract(PADALOCK_CONTRACT_ID);
  const tx = new TransactionBuilder(source, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK.passphrase,
  })
    .addOperation(contract.call(fn, ...args))
    .setTimeout(30)
    .build();

  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) {
    throw new Error(`sim ${fn} failed: ${sim.error}`);
  }
  const result = (sim as rpc.Api.SimulateTransactionSuccessResponse).result?.retval;
  if (!result) return null;
  return scValToNative(result);
}

interface RawBucket {
  id: number;
  category: number;
  amount: bigint;
  claimed: boolean;
  claimed_by?: string | null;
}

interface RawPadala {
  sender: string;
  recipient: string;
  buckets: RawBucket[];
  created_at: bigint;
}

export async function getPadala(callerPub: string, padalaId: string): Promise<PadalaView> {
  const raw = (await simRead(
    callerPub,
    'get_padala',
    nativeToScVal(BigInt(padalaId), { type: 'u64' })
  )) as RawPadala;

  const buckets: BucketView[] = raw.buckets.map((b) => ({
    id: b.id,
    category: CATEGORY_NAMES[b.category] ?? 'FreeCash',
    amount: b.amount.toString(),
    claimed: b.claimed,
    claimedBy: b.claimed_by ?? undefined,
  }));

  return {
    id: padalaId,
    sender: raw.sender,
    recipient: raw.recipient,
    buckets,
    createdAt: Number(raw.created_at),
  };
}

export async function getMerchants(
  callerPub: string,
  category: BucketCategory
): Promise<string[]> {
  const idx = CATEGORY_NAMES.indexOf(category);
  if (idx < 0) return [];
  const raw = (await simRead(
    callerPub,
    'get_merchants',
    nativeToScVal(idx, { type: 'u32' })
  )) as Address[] | string[] | null;
  if (!raw) return [];
  return (raw as unknown[]).map((a) => String(a));
}

export { DUMMY_PUB };
