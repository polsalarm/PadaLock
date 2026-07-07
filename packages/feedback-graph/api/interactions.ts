import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyKey } from 'discord-interactions';
import { waitUntil } from '@vercel/functions';
import { handleInteraction } from '../src/discord.js';

// Discord signs the raw request body; we must verify against the exact bytes,
// so disable Vercel's automatic body parsing and read the stream ourselves.
export const config = { api: { bodyParser: false } };

async function rawBody(req: VercelRequest): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const c of req) {
    chunks.push(typeof c === 'string' ? Buffer.from(c) : c);
  }
  return Buffer.concat(chunks).toString('utf8');
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).end('method not allowed');
    return;
  }

  const sig = req.headers['x-signature-ed25519'] as string | undefined;
  const ts = req.headers['x-signature-timestamp'] as string | undefined;
  const raw = await rawBody(req);

  if (!sig || !ts) {
    res.status(401).end('missing signature');
    return;
  }
  const ok = await verifyKey(
    raw,
    sig,
    ts,
    process.env.DISCORD_PUBLIC_KEY ?? '',
  );
  if (!ok) {
    res.status(401).end('invalid signature');
    return;
  }

  const { body, background } = await handleInteraction(JSON.parse(raw));
  // Keep the function alive for deferred /insights + /export work.
  if (background) waitUntil(background);
  res.status(200).json(body);
}
