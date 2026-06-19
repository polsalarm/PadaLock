import { StellarToml } from '@stellar/stellar-sdk';

/**
 * Real SEP-24 withdraw (off-ramp) wiring against an anchor.
 *
 * Default anchor is the SDF reference anchor `testanchor.stellar.org`. The full
 * protocol is implemented end-to-end: SEP-1 toml discovery -> SEP-10 web auth
 * (challenge sign) -> SEP-24 interactive withdraw -> transaction polling.
 *
 * Asset caveat: testanchor only off-ramps its OWN test assets (SRT / its USDC),
 * not the PadaLock-minted USDC held in escrow. The demo therefore claims FreeCash
 * to the recipient's wallet, then runs this genuine SEP-24 flow to prove the
 * off-ramp UX. Mainnet swaps PadaLock USDC -> a PH partner anchor's PHP rail.
 */

export const DEFAULT_ANCHOR_DOMAIN = 'testanchor.stellar.org';

export interface AnchorInfo {
  domain: string;
  webAuthEndpoint: string;
  transferServerSep24: string;
  signingKey: string;
  /** Off-ramp asset the anchor supports (prefers USDC, falls back to first). */
  asset: { code: string; issuer: string };
}

export interface Sep24Transaction {
  id: string;
  kind: string;
  status: string;
  amount_in?: string;
  amount_out?: string;
  amount_fee?: string;
  withdraw_anchor_account?: string;
  withdraw_memo?: string;
  withdraw_memo_type?: string;
  more_info_url?: string;
  message?: string;
  [k: string]: unknown;
}

/** SEP-1: resolve the anchor's stellar.toml and pick an off-ramp asset. */
export async function fetchAnchorInfo(
  domain: string = DEFAULT_ANCHOR_DOMAIN
): Promise<AnchorInfo> {
  const toml = await StellarToml.Resolver.resolve(domain);
  const webAuthEndpoint = toml.WEB_AUTH_ENDPOINT as string | undefined;
  const transferServerSep24 = toml.TRANSFER_SERVER_SEP0024 as string | undefined;
  const signingKey = toml.SIGNING_KEY as string | undefined;
  if (!webAuthEndpoint || !transferServerSep24 || !signingKey) {
    throw new Error(`Anchor ${domain} is missing SEP-10/SEP-24 toml entries.`);
  }

  const currencies = (toml.CURRENCIES ?? []) as Array<{
    code?: string;
    issuer?: string;
  }>;
  const withIssuer = currencies.filter((c) => c.code && c.issuer);
  const picked =
    withIssuer.find((c) => c.code === 'USDC') ?? withIssuer[0];
  if (!picked) {
    throw new Error(`Anchor ${domain} has no withdrawable asset in its toml.`);
  }

  return {
    domain,
    webAuthEndpoint,
    transferServerSep24,
    signingKey,
    asset: { code: picked.code as string, issuer: picked.issuer as string },
  };
}

/** SEP-10 step 1: fetch the challenge transaction the wallet must sign. */
export async function sep10Challenge(
  webAuthEndpoint: string,
  account: string,
  homeDomain: string
): Promise<string> {
  const url = new URL(webAuthEndpoint);
  url.searchParams.set('account', account);
  url.searchParams.set('home_domain', homeDomain);
  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`SEP-10 challenge failed: ${res.status} ${await res.text()}`);
  }
  const body = (await res.json()) as { transaction?: string; error?: string };
  if (!body.transaction) {
    throw new Error(`SEP-10 challenge missing transaction: ${body.error ?? '??'}`);
  }
  return body.transaction;
}

/** SEP-10 step 2: exchange the signed challenge for a JWT. */
export async function sep10Token(
  webAuthEndpoint: string,
  signedChallengeXdr: string
): Promise<string> {
  const res = await fetch(webAuthEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transaction: signedChallengeXdr }),
  });
  if (!res.ok) {
    throw new Error(`SEP-10 token failed: ${res.status} ${await res.text()}`);
  }
  const body = (await res.json()) as { token?: string; error?: string };
  if (!body.token) {
    throw new Error(`SEP-10 token missing: ${body.error ?? '??'}`);
  }
  return body.token;
}

/**
 * Full SEP-10 auth. `signChallenge` is the wallet's signing abstraction
 * (built-in keypair or external kit) — sdk never touches keys directly.
 */
export async function authenticate(
  anchor: AnchorInfo,
  account: string,
  signChallenge: (xdr: string) => Promise<string>
): Promise<string> {
  const challenge = await sep10Challenge(
    anchor.webAuthEndpoint,
    account,
    anchor.domain
  );
  const signed = await signChallenge(challenge);
  return sep10Token(anchor.webAuthEndpoint, signed);
}

/** SEP-24: start an interactive withdraw. Returns the popup url + tx id. */
export async function startWithdraw(
  anchor: AnchorInfo,
  token: string,
  account: string,
  amount?: string
): Promise<{ url: string; id: string }> {
  const res = await fetch(
    `${anchor.transferServerSep24}/transactions/withdraw/interactive`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        asset_code: anchor.asset.code,
        account,
        ...(amount ? { amount } : {}),
      }),
    }
  );
  if (!res.ok) {
    throw new Error(`SEP-24 withdraw failed: ${res.status} ${await res.text()}`);
  }
  const body = (await res.json()) as { url?: string; id?: string; error?: string };
  if (!body.url || !body.id) {
    throw new Error(`SEP-24 withdraw missing url/id: ${body.error ?? '??'}`);
  }
  return { url: body.url, id: body.id };
}

/** SEP-24: fetch a single transaction by id. */
export async function getTransaction(
  anchor: AnchorInfo,
  token: string,
  id: string
): Promise<Sep24Transaction> {
  const url = new URL(`${anchor.transferServerSep24}/transaction`);
  url.searchParams.set('id', id);
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`SEP-24 transaction failed: ${res.status} ${await res.text()}`);
  }
  const body = (await res.json()) as { transaction?: Sep24Transaction };
  if (!body.transaction) {
    throw new Error('SEP-24 transaction not found.');
  }
  return body.transaction;
}

/** Terminal SEP-24 statuses — polling stops here. */
export const SEP24_TERMINAL = new Set([
  'completed',
  'refunded',
  'expired',
  'error',
  'no_market',
  'too_small',
  'too_large',
]);

/**
 * Poll a withdraw until it leaves `pending_user_transfer_start` (the anchor is
 * ready for the user's payment) or reaches a terminal state. Returns the latest
 * transaction snapshot.
 */
export async function pollWithdraw(
  anchor: AnchorInfo,
  token: string,
  id: string,
  opts: { intervalMs?: number; timeoutMs?: number } = {}
): Promise<Sep24Transaction> {
  const intervalMs = opts.intervalMs ?? 3000;
  const timeoutMs = opts.timeoutMs ?? 5 * 60_000;
  const deadline = Date.now() + timeoutMs;
  let last = await getTransaction(anchor, token, id);
  while (Date.now() < deadline) {
    if (
      SEP24_TERMINAL.has(last.status) ||
      last.status === 'pending_user_transfer_start'
    ) {
      return last;
    }
    await new Promise((r) => setTimeout(r, intervalMs));
    last = await getTransaction(anchor, token, id);
  }
  return last;
}
