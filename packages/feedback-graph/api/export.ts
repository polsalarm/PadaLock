import type { VercelRequest, VercelResponse } from '@vercel/node';
import { exportCsv } from '../src/export.js';

// GET /api/export.csv?key=SECRET → CSV download of all feedback.
export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).end('method not allowed');
    return;
  }
  const secret = process.env.INGEST_SECRET;
  if (secret) {
    const key = (req.query.key as string) ?? req.headers['x-ingest-secret'];
    if (key !== secret) {
      res.status(401).end('bad or missing key');
      return;
    }
  }
  const csv = await exportCsv();
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    'attachment; filename="padalock-feedback.csv"',
  );
  res.status(200).send(csv);
}
