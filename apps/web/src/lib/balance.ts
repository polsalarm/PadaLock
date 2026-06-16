import {
  Account,
  Address,
  Asset,
  Contract,
  Horizon,
  Keypair,
  Operation,
  TransactionBuilder,
  rpc,
  scValToNative,
} from "@stellar/stellar-sdk";
import {
  BASE_FEE,
  NETWORK,
  USDC_CODE,
  USDC_ISSUER_TESTNET,
  USDC_SAC_TESTNET,
  getRpcServer,
  pollFinality,
} from "@padalock/sdk";

const HORIZON_URL = "https://horizon-testnet.stellar.org";

let _horizon: Horizon.Server | null = null;
function getHorizon(): Horizon.Server {
  if (!_horizon) _horizon = new Horizon.Server(HORIZON_URL);
  return _horizon;
}

/**
 * Native XLM balance for an account (classic). Returns human string e.g. "9999.50".
 * Returns "0" if the account is not yet funded.
 */
export async function getXlmBalance(publicKey: string): Promise<string> {
  try {
    const acct = await getHorizon().loadAccount(publicKey);
    const native = acct.balances.find((b) => b.asset_type === "native");
    return native ? native.balance : "0";
  } catch {
    return "0";
  }
}

/**
 * Plain XLM payment (Level-1 transaction flow). Signs with the active wallet,
 * submits to RPC, polls finality. Returns the tx hash.
 */
export async function sendXlm(args: {
  fromPublicKey: string;
  toPublicKey: string;
  amount: string; // human XLM, e.g. "10.5"
  sign: (xdr: string) => Promise<string>;
}): Promise<string> {
  const server = getRpcServer();
  const acct = await server.getAccount(args.fromPublicKey);
  const source = new Account(acct.accountId(), acct.sequenceNumber());

  const tx = new TransactionBuilder(source, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK.passphrase,
  })
    .addOperation(
      Operation.payment({
        destination: args.toPublicKey,
        asset: Asset.native(),
        amount: args.amount,
      })
    )
    .setTimeout(120)
    .build();

  const signedXdr = await args.sign(tx.toXDR());
  const signed = TransactionBuilder.fromXDR(signedXdr, NETWORK.passphrase);
  const sent = await server.sendTransaction(signed);
  if (sent.status === "ERROR") {
    throw new Error(`Submit failed: ${JSON.stringify(sent.errorResult)}`);
  }
  const fin = await pollFinality(sent.hash);
  if (fin.status !== "SUCCESS") {
    throw new Error(`Payment tx ${fin.status}`);
  }
  return sent.hash;
}

/**
 * Read-only USDC SAC balance for a Stellar account. Returns string in stroops.
 */
export async function getUsdcBalance(publicKey: string): Promise<string> {
  if (!USDC_SAC_TESTNET) return "0";
  const server = getRpcServer();
  const acct = await server.getAccount(publicKey);
  const source = new Account(acct.accountId(), acct.sequenceNumber());
  const contract = new Contract(USDC_SAC_TESTNET);

  const tx = new TransactionBuilder(source, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK.passphrase,
  })
    .addOperation(contract.call("balance", new Address(publicKey).toScVal()))
    .setTimeout(30)
    .build();

  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) {
    return "0";
  }
  const success = sim as rpc.Api.SimulateTransactionSuccessResponse;
  const result = success.result?.retval;
  if (!result) return "0";
  const v = scValToNative(result);
  return typeof v === "bigint" ? v.toString() : String(v);
}

export async function friendbotFund(publicKey: string): Promise<string> {
  const url = `${NETWORK.friendbotUrl}?addr=${encodeURIComponent(publicKey)}`;
  const res = await fetch(url);
  if (res.ok) return "funded";
  const body = (await res.json().catch(() => null)) as { detail?: string } | null;
  if (body?.detail?.includes("already funded")) return "already-funded";
  throw new Error(`Friendbot failed: ${body?.detail ?? res.status}`);
}

/**
 * Opt-in trustline for USDC, signed by the active wallet (local key OR external kit).
 * Idempotent — re-running with the same limit is a no-op on chain.
 */
export async function ensureUsdcTrustline(
  publicKey: string,
  sign: (xdr: string) => Promise<string>
): Promise<string> {
  if (!USDC_ISSUER_TESTNET) throw new Error("USDC issuer not configured");
  const server = getRpcServer();
  const acct = await server.getAccount(publicKey);
  const source = new Account(acct.accountId(), acct.sequenceNumber());

  const tx = new TransactionBuilder(source, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK.passphrase,
  })
    .addOperation(
      Operation.changeTrust({
        asset: new Asset(USDC_CODE, USDC_ISSUER_TESTNET),
      })
    )
    .setTimeout(120)
    .build();

  const signedXdr = await sign(tx.toXDR());
  const signed = TransactionBuilder.fromXDR(signedXdr, NETWORK.passphrase);
  const sent = await server.sendTransaction(signed);
  if (sent.status === "ERROR") {
    throw new Error(`Trustline submit failed: ${JSON.stringify(sent.errorResult)}`);
  }
  const fin = await pollFinality(sent.hash);
  if (fin.status !== "SUCCESS") {
    throw new Error(`Trustline tx ${fin.status}`);
  }
  return sent.hash;
}

export function fmtStroops(stroops: string, decimals = 7): string {
  const n = BigInt(stroops || "0");
  const divisor = 10n ** BigInt(decimals);
  const whole = n / divisor;
  const frac = (n % divisor).toString().padStart(decimals, "0").slice(0, 2);
  return `${whole.toString()}.${frac}`;
}

export function toStroops(human: string, decimals = 7): string {
  const [whole, frac = ""] = human.split(".");
  const fracPadded = (frac + "0".repeat(decimals)).slice(0, decimals);
  return (BigInt(whole || "0") * 10n ** BigInt(decimals) + BigInt(fracPadded || "0")).toString();
}

/** Display-only USDC ↔ PHP rate (testnet). Real version: pull from Reflector oracle. */
export const PHP_PER_USDC = 57;

export function usdcToPhp(usdcHuman: string | number): string {
  const n = typeof usdcHuman === "string" ? parseFloat(usdcHuman) : usdcHuman;
  if (isNaN(n)) return "0.00";
  return (n * PHP_PER_USDC).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function phpToUsdcHuman(phpHuman: string | number): number {
  const n = typeof phpHuman === "string" ? parseFloat(phpHuman) : phpHuman;
  if (isNaN(n)) return 0;
  return n / PHP_PER_USDC;
}

export function fmtStroopsPhp(stroops: string): string {
  const usdc = parseFloat(fmtStroops(stroops));
  return usdcToPhp(usdc);
}

/** convenience: keypair re-export */
export type { Keypair };
