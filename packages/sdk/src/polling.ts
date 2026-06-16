import { rpc, scValToNative, xdr } from '@stellar/stellar-sdk';
import { getRpcServer } from './rpc';

export interface FinalityResult {
  status: 'SUCCESS' | 'FAILED' | 'NOT_FOUND';
  hash: string;
  /** Raw xdr.ScVal returned by the contract (if any). */
  returnValue?: unknown;
  /** Decoded native value of the contract return (e.g. u64 padala id -> bigint). */
  returnNative?: unknown;
  raw?: unknown;
}

/**
 * Polls Soroban RPC for final tx status. sendTransaction != success — always poll.
 */
export async function pollFinality(
  hash: string,
  opts: { intervalMs?: number; timeoutMs?: number } = {}
): Promise<FinalityResult> {
  const interval = opts.intervalMs ?? 1500;
  const timeout = opts.timeoutMs ?? 30_000;
  const server = getRpcServer();
  const start = Date.now();

  while (Date.now() - start < timeout) {
    const res = await server.getTransaction(hash);
    if (res.status === rpc.Api.GetTransactionStatus.SUCCESS) {
      let returnNative: unknown;
      try {
        if (res.returnValue instanceof xdr.ScVal) {
          returnNative = scValToNative(res.returnValue);
        }
      } catch {
        returnNative = undefined;
      }
      return {
        status: 'SUCCESS',
        hash,
        returnValue: res.returnValue,
        returnNative,
        raw: res,
      };
    }
    if (res.status === rpc.Api.GetTransactionStatus.FAILED) {
      return { status: 'FAILED', hash, raw: res };
    }
    await new Promise((r) => setTimeout(r, interval));
  }
  return { status: 'NOT_FOUND', hash };
}
