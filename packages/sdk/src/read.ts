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
import type {
  PadalaView,
  BucketCategory,
  BucketView,
  RecurringView,
  ReputationView,
} from './types';

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
  contractId: string,
  fn: string,
  ...args: ReturnType<typeof nativeToScVal>[]
): Promise<unknown> {
  const server = getRpcServer();
  const acct = await server.getAccount(callerPub);
  const source = new Account(acct.accountId(), acct.sequenceNumber());
  const contract = new Contract(contractId || PADALOCK_CONTRACT_ID);
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
  recipient: string;
  claimed: boolean;
  claimed_by?: string | null;
}

interface RawPadala {
  sender: string;
  buckets: RawBucket[];
  created_at: bigint;
  recurring_id: bigint;
}

export async function getPadala(
  callerPub: string,
  padalaId: string,
  contractId = PADALOCK_CONTRACT_ID
): Promise<PadalaView> {
  const raw = (await simRead(
    callerPub,
    contractId,
    'get_padala',
    nativeToScVal(BigInt(padalaId), { type: 'u64' })
  )) as RawPadala;

  const buckets: BucketView[] = raw.buckets.map((b) => ({
    id: b.id,
    category: CATEGORY_NAMES[b.category] ?? 'FreeCash',
    amount: b.amount.toString(),
    recipient: String(b.recipient),
    claimed: b.claimed,
    claimedBy: b.claimed_by ?? undefined,
  }));

  return {
    id: padalaId,
    sender: raw.sender,
    buckets,
    createdAt: Number(raw.created_at),
    recurringId: Number(raw.recurring_id ?? 0),
  };
}

interface RawRecurring {
  sender: string;
  template: { category: number; amount: bigint; recipient: string }[];
  interval_secs: bigint;
  next_run: bigint;
  remaining: number;
  per_run_total: bigint;
  prefunded: bigint;
  active: boolean;
}

export async function getRecurring(
  callerPub: string,
  recId: string,
  contractId = PADALOCK_CONTRACT_ID
): Promise<RecurringView> {
  const raw = (await simRead(
    callerPub,
    contractId,
    'get_recurring',
    nativeToScVal(BigInt(recId), { type: 'u64' })
  )) as RawRecurring;

  return {
    id: recId,
    sender: raw.sender,
    template: raw.template.map((t) => ({
      category: CATEGORY_NAMES[t.category] ?? 'FreeCash',
      amount: t.amount.toString(),
      recipient: String(t.recipient),
    })),
    intervalSecs: Number(raw.interval_secs),
    nextRun: Number(raw.next_run),
    remaining: raw.remaining,
    perRunTotal: raw.per_run_total.toString(),
    prefunded: raw.prefunded.toString(),
    active: raw.active,
  };
}

export async function getMerchants(
  callerPub: string,
  category: BucketCategory,
  contractId = PADALOCK_CONTRACT_ID
): Promise<string[]> {
  const idx = CATEGORY_NAMES.indexOf(category);
  if (idx < 0) return [];
  const raw = (await simRead(
    callerPub,
    contractId,
    'get_merchants',
    nativeToScVal(idx, { type: 'u32' })
  )) as Address[] | string[] | null;
  if (!raw) return [];
  return (raw as unknown[]).map((a) => String(a));
}

interface RawReputation {
  claims: number;
  volume: bigint;
  last_claim_at: bigint;
}

export async function getReputation(
  callerPub: string,
  merchant: string,
  contractId = PADALOCK_CONTRACT_ID
): Promise<ReputationView> {
  const raw = (await simRead(
    callerPub,
    contractId,
    'get_reputation',
    nativeToScVal(new Address(merchant), { type: 'address' })
  )) as RawReputation;

  return {
    merchant,
    claims: Number(raw.claims ?? 0),
    volume: (raw.volume ?? 0n).toString(),
    lastClaimAt: Number(raw.last_claim_at ?? 0),
  };
}

export { DUMMY_PUB };
