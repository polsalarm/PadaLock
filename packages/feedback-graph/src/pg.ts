import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

export type FeedbackSource = 'discord' | 'app';

export interface FeedbackRow {
  id: number;
  user_id: string;
  username: string;
  text: string;
  embedding: string; // JSON array of numbers (stored as text)
  source: FeedbackSource;
  rating: number | null;
  wallet: string | null;
  created_at: string; // already formatted to Asia/Manila local time
}

export interface FeedbackMeta {
  source?: FeedbackSource;
  rating?: number | null;
  wallet?: string | null;
}

function conn(): string {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) throw new Error('DATABASE_URL not set');
  return url;
}

// One neon() client per cold start.
let client: NeonQueryFunction<false, false> | null = null;
function sql(): NeonQueryFunction<false, false> {
  return (client ??= neon(conn()));
}

// Create the table once per cold start.
let schema: Promise<unknown> | null = null;
export function ensureSchema(): Promise<unknown> {
  return (schema ??= sql().query(`
    CREATE TABLE IF NOT EXISTS feedback (
      id         BIGSERIAL PRIMARY KEY,
      user_id    TEXT NOT NULL,
      username   TEXT NOT NULL,
      text       TEXT NOT NULL,
      embedding  TEXT NOT NULL,
      source     TEXT NOT NULL DEFAULT 'discord',
      rating     INT,
      wallet     TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `));
}

// Render created_at already converted to PH local time.
const SELECT_COLS = `id, user_id, username, text, embedding, source, rating, wallet,
  to_char(created_at AT TIME ZONE 'Asia/Manila', 'YYYY-MM-DD HH24:MI:SS') AS created_at`;

export async function insertFeedback(
  userId: string,
  username: string,
  text: string,
  embedding: number[],
  meta: FeedbackMeta = {},
): Promise<void> {
  await ensureSchema();
  await sql().query(
    `INSERT INTO feedback (user_id, username, text, embedding, source, rating, wallet)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      userId,
      username,
      text,
      JSON.stringify(embedding),
      meta.source ?? 'discord',
      meta.rating ?? null,
      meta.wallet ?? null,
    ],
  );
}

export async function allFeedback(): Promise<FeedbackRow[]> {
  await ensureSchema();
  const rows = await sql().query(
    `SELECT ${SELECT_COLS} FROM feedback ORDER BY created_at ASC`,
  );
  return rows as unknown as FeedbackRow[];
}

export async function feedbackCount(): Promise<number> {
  await ensureSchema();
  const rows = (await sql().query(
    `SELECT COUNT(*)::int AS n FROM feedback`,
  )) as { n: number }[];
  return rows[0]?.n ?? 0;
}
