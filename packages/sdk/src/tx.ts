import {
  Account,
  Address,
  Contract,
  Keypair,
  Operation,
  rpc,
  TransactionBuilder,
  nativeToScVal,
  xdr,
} from '@stellar/stellar-sdk';
import { BASE_FEE, NETWORK, PADALOCK_CONTRACT_ID } from './config';
import { getRpcServer } from './rpc';
import { CATEGORY_TO_NUM, type BucketInput } from './types';

async function loadAccount(sourcePub: string): Promise<Account> {
  const server = getRpcServer();
  const acct = await server.getAccount(sourcePub);
  return new Account(acct.accountId(), acct.sequenceNumber());
}

function bucketsToScVal(buckets: BucketInput[]): xdr.ScVal {
  return nativeToScVal(
    buckets.map((b) => ({
      category: CATEGORY_TO_NUM[b.category],
      amount: b.amount,
      recipient: new Address(b.recipient),
    })),
    {
      type: {
        category: ['symbol', 'u32'],
        amount: ['symbol', 'i128'],
        recipient: ['symbol', 'address'],
      },
    }
  );
}

type Built = {
  tx: ReturnType<TransactionBuilder['build']>;
  sim: rpc.Api.SimulateTransactionSuccessResponse;
};

/** Build an invocation, simulate, assemble. Caller signs + submits. */
async function buildInvoke(
  sourcePub: string,
  contractId: string | undefined,
  fn: string,
  args: xdr.ScVal[]
): Promise<Built> {
  const server = getRpcServer();
  const source = await loadAccount(sourcePub);
  const contract = new Contract(contractId ?? PADALOCK_CONTRACT_ID);

  const tx = new TransactionBuilder(source, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK.passphrase,
  })
    .addOperation(contract.call(fn, ...args))
    .setTimeout(60)
    .build();

  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) {
    throw new Error(`Simulation failed: ${sim.error}`);
  }
  const assembled = rpc.assembleTransaction(tx, sim).build();
  return { tx: assembled, sim: sim as rpc.Api.SimulateTransactionSuccessResponse };
}

/**
 * Builds (sim + assemble) the create_padala tx. Each bucket names its own
 * recipient (single-recipient = all buckets share one address).
 */
export async function buildCreatePadala(args: {
  senderPub: string;
  buckets: BucketInput[];
  contractId?: string;
}): Promise<Built> {
  return buildInvoke(args.senderPub, args.contractId, 'create_padala', [
    new Address(args.senderPub).toScVal(),
    bucketsToScVal(args.buckets),
  ]);
}

/** Builds the create_recurring tx — prefunds `occurrences * total` up front. */
export async function buildCreateRecurring(args: {
  senderPub: string;
  template: BucketInput[];
  intervalSecs: number;
  occurrences: number;
  contractId?: string;
}): Promise<Built> {
  return buildInvoke(args.senderPub, args.contractId, 'create_recurring', [
    new Address(args.senderPub).toScVal(),
    bucketsToScVal(args.template),
    nativeToScVal(BigInt(args.intervalSecs), { type: 'u64' }),
    nativeToScVal(args.occurrences, { type: 'u32' }),
  ]);
}

/** Builds the execute_due tx — permissionless trigger of the next due run. */
export async function buildExecuteDue(args: {
  callerPub: string;
  recId: string;
  contractId?: string;
}): Promise<Built> {
  return buildInvoke(args.callerPub, args.contractId, 'execute_due', [
    nativeToScVal(BigInt(args.recId), { type: 'u64' }),
  ]);
}

/** Builds the cancel_recurring tx — sender refunds the unspent prefund. */
export async function buildCancelRecurring(args: {
  senderPub: string;
  recId: string;
  contractId?: string;
}): Promise<Built> {
  return buildInvoke(args.senderPub, args.contractId, 'cancel_recurring', [
    nativeToScVal(BigInt(args.recId), { type: 'u64' }),
  ]);
}

/**
 * Builds the claim tx for a specific bucket.
 */
export async function buildClaim(args: {
  claimerPub: string;
  padalaId: string;
  bucketId: number;
  merchantPub: string;
  contractId?: string;
}): Promise<Built> {
  return buildInvoke(args.claimerPub, args.contractId, 'claim', [
    nativeToScVal(BigInt(args.padalaId), { type: 'u64' }),
    nativeToScVal(args.bucketId, { type: 'u32' }),
    new Address(args.merchantPub).toScVal(),
  ]);
}

/**
 * Signs + submits to Soroban RPC. Returns send hash; caller must poll for finality.
 */
export async function signAndSubmit(
  tx: ReturnType<TransactionBuilder['build']>,
  keypair: Keypair
): Promise<string> {
  tx.sign(keypair);
  const server = getRpcServer();
  const sent = await server.sendTransaction(tx);
  if (sent.status === 'ERROR') {
    throw new Error(`sendTransaction error: ${JSON.stringify(sent)}`);
  }
  return sent.hash;
}

/**
 * Submits an already-signed tx XDR (external-wallet path). Returns send hash.
 */
export async function submitSignedXdr(signedXdr: string): Promise<string> {
  const tx = TransactionBuilder.fromXDR(signedXdr, NETWORK.passphrase);
  const server = getRpcServer();
  const sent = await server.sendTransaction(tx);
  if (sent.status === 'ERROR') {
    throw new Error(`sendTransaction error: ${JSON.stringify(sent)}`);
  }
  return sent.hash;
}
