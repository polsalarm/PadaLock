import { NextResponse } from "next/server";
import {
  Account,
  Address,
  Contract,
  Keypair,
  TransactionBuilder,
  nativeToScVal,
  rpc,
} from "@stellar/stellar-sdk";
import { BASE_FEE, NETWORK, USDC_SAC_TESTNET, pollFinality } from "@padalock/sdk";

/**
 * Testnet demo faucet: mints 1000 test USDC to the requested address.
 * Issuer key is server-side only. Testnet only — never reuse this pattern on mainnet.
 */

const MINT_AMOUNT = 10_000_000_000n; // 1000 USDC @ 7dp

export async function POST(req: Request) {
  const secret = process.env.FAUCET_ISSUER_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Faucet not configured" }, { status: 500 });
  }
  if (!USDC_SAC_TESTNET) {
    return NextResponse.json({ error: "USDC SAC not configured" }, { status: 500 });
  }

  let address: string;
  try {
    const body = (await req.json()) as { address?: string };
    address = body.address ?? "";
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  if (!address.startsWith("G") || address.length !== 56) {
    return NextResponse.json({ error: "Invalid Stellar address" }, { status: 400 });
  }

  try {
    const issuer = Keypair.fromSecret(secret);
    const server = new rpc.Server(NETWORK.rpcUrl);
    const acct = await server.getAccount(issuer.publicKey());
    const source = new Account(acct.accountId(), acct.sequenceNumber());
    const contract = new Contract(USDC_SAC_TESTNET);

    const tx = new TransactionBuilder(source, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK.passphrase,
    })
      .addOperation(
        contract.call(
          "mint",
          new Address(address).toScVal(),
          nativeToScVal(MINT_AMOUNT, { type: "i128" })
        )
      )
      .setTimeout(120)
      .build();

    const sim = await server.simulateTransaction(tx);
    if (rpc.Api.isSimulationError(sim)) {
      return NextResponse.json(
        { error: `Mint simulation failed: ${sim.error}` },
        { status: 422 }
      );
    }
    const assembled = rpc.assembleTransaction(tx, sim).build();
    assembled.sign(issuer);

    const sent = await server.sendTransaction(assembled);
    if (sent.status === "ERROR") {
      return NextResponse.json(
        { error: `Submit failed: ${JSON.stringify(sent.errorResult)}` },
        { status: 502 }
      );
    }
    const fin = await pollFinality(sent.hash);
    if (fin.status !== "SUCCESS") {
      return NextResponse.json(
        { error: `Mint tx ${fin.status}` },
        { status: 502 }
      );
    }
    return NextResponse.json({ ok: true, hash: sent.hash, amount: "1000" });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Faucet error" },
      { status: 500 }
    );
  }
}
