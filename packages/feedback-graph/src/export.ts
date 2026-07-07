import { allFeedback, type FeedbackRow } from './pg.js';

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

/** Serialize feedback rows to CSV (embedding column omitted — it's huge). */
export function feedbackToCsv(rows: FeedbackRow[]): string {
  const header = COLUMNS.join(',');
  const lines = rows.map((r) => COLUMNS.map((c) => cell(r[c])).join(','));
  return [header, ...lines].join('\r\n');
}

/** Convenience: fetch all rows and serialize. */
export async function exportCsv(): Promise<string> {
  return feedbackToCsv(await allFeedback());
}
