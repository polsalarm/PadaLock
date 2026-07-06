import 'dotenv/config';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { allFeedback, type FeedbackRow } from './db';

const COLUMNS: (keyof FeedbackRow)[] = [
  'id',
  'created_at',
  'source',
  'rating',
  'wallet',
  'username',
  'text',
];

/** RFC-4180 field: quote always, double embedded quotes. */
function cell(v: unknown): string {
  const s = v == null ? '' : String(v);
  return `"${s.replace(/"/g, '""')}"`;
}

/** Serialize all feedback rows to CSV (embedding column omitted — it's huge). */
export function feedbackToCsv(rows: FeedbackRow[] = allFeedback()): string {
  const header = COLUMNS.join(',');
  const lines = rows.map((r) => COLUMNS.map((c) => cell(r[c])).join(','));
  return [header, ...lines].join('\r\n');
}

/** CLI: `npm run export` → writes data/feedback-export.csv */
function main(): void {
  const rows = allFeedback();
  const csv = feedbackToCsv(rows);
  const dir = resolve(process.cwd(), 'data');
  mkdirSync(dir, { recursive: true });
  const out = resolve(dir, 'feedback-export.csv');
  writeFileSync(out, csv, 'utf8');
  console.log(`Wrote ${rows.length} rows → ${out}`);
}

// Run only when invoked directly (not when imported by the server).
if (process.argv[1] && process.argv[1].endsWith('export.ts')) {
  main();
}
