import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ingest } from '../src/ingest.js';

// App feedback widget posts structured ratings + comment + wallet here.
interface Body {
  text?: string;
  rating?: number;
  wallet?: string;
  user?: string;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  // CORS for the browser widget.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'content-type, x-ingest-secret');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method not allowed' });
    return;
  }

  const secret = process.env.INGEST_SECRET;
  if (secret && req.headers['x-ingest-secret'] !== secret) {
    res.status(401).json({ error: 'bad or missing x-ingest-secret' });
    return;
  }

  const body = (req.body ?? {}) as Body;
  const text = (body.text ?? '').toString();
  const rating =
    body.rating == null ? null : Math.max(1, Math.min(5, Number(body.rating)));
  const wallet = body.wallet ? body.wallet.toString() : null;
  const user = (body.user ?? wallet ?? 'app-user').toString();

  try {
    await ingest(user, user, text, { source: 'app', rating, wallet });
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
}
