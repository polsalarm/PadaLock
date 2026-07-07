import type { VercelRequest, VercelResponse } from '@vercel/node';
import { feedbackCount } from '../src/pg.js';

export default async function handler(
  _req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  try {
    const count = await feedbackCount();
    res.status(200).json({ ok: true, count });
  } catch (err) {
    res.status(500).json({ ok: false, error: (err as Error).message });
  }
}
