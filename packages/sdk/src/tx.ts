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
    })),
    {
      type: {
        category: ['symbol', 'u32'],
        amount: ['symbol', 'i128'],
      },
    }
  );
}

/**
 * Builds (sim + assemble) the create_padala tx. Caller signs + submits.
 */
export async function buildCreatePadala(args: {
  senderPub: string;
  recipientPub: string;
  buckets: BucketInput[];
  contractId?: string;
}): Promise<{ tx: ReturnType<TransactionBuilder['build']>; sim: rpc.Api.SimulateTransactionSuccessResponse }> {
  const server = getRpcServer();
  const source = await loadAccount(args.senderPub);
  const contract = new Contract(args.contractId ?? PADALOCK_CONTRACT_ID);

  const tx = new TransactionBuilder(source, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK.passphrase,
  })
    .addOperation(
      contract.call(
        'create_padala',
        new Address(args.senderPub).toScVal(),
        new Address(args.recipientPub).toScVal(),
        bucketsToScVal(args.buckets)
      )
    )
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
 * Builds the claim tx for a specific bucket.
 */
export async function buildClaim(args: {
  claimerPub: string;
  padalaId: string;
  bucketId: number;
  merchantPub: string;
  contractId?: string;
}): Promise<{ tx: ReturnType<TransactionBuilder['build']>; sim: rpc.Api.SimulateTransactionSuccessResponse }> {
  const server = getRpcServer();
  const source = await loadAccount(args.claimerPub);
  const contract = new Contract(args.contractId ?? PADALOCK_CONTRACT_ID);

  const tx = new TransactionBuilder(source, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK.passphrase,
  })
    .addOperation(
      contract.call(
        'claim',
        nativeToScVal(BigInt(args.padalaId), { type: 'u64' }),
        nativeToScVal(args.bucketId, { type: 'u32' }),
        new Address(args.merchantPub).toScVal()
      )
    )
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
