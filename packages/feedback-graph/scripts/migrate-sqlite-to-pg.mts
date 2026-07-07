/**
 * One-off migration: copy every row from the legacy sqlite file into Neon
 * Postgres, preserving created_at (stored as PH local wall-clock, re-interpreted
 * as Asia/Manila so the tz math stays correct). Idempotent-ish: it TRUNCATEs
 * the target first so a re-run doesn't duplicate.
 *
 *   DATABASE_URL=postgres://... npx tsx scripts/migrate-sqlite-to-pg.mts
 */
import 'dotenv/config';
import Database from 'better-sqlite3';
import { resolve } from 'node:path';
import { neon } from '@neondatabase/serverless';

const DB_PATH = resolve(process.cwd(), 'data', 'feedback.db');
const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!url) throw new Error('DATABASE_URL not set');
const sql = neon(url);

interface Row {
  user_id: string;
  username: string;
  text: string;
  embedding: string;
  source: string;
  rating: number | null;
  wallet: string | null;
  created_at: string; // "YYYY-MM-DD HH:MM:SS" in PH local time
}

const rows = new Database(DB_PATH)
  .prepare(
    `SELECT user_id, username, text, embedding, source, rating, wallet, created_at
     FROM feedback ORDER BY id ASC`,
  )
  .all() as Row[];

await sql.query(`
  CREATE TABLE IF NOT EXISTS feedback (
    id BIGSERIAL PRIMARY KEY, user_id TEXT NOT NULL, username TEXT NOT NULL,
    text TEXT NOT NULL, embedding TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'discord', rating INT, wallet TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
`);
await sql.query(`TRUNCATE feedback RESTART IDENTITY`);

for (const r of rows) {
  await sql.query(
    `INSERT INTO feedback (user_id, username, text, embedding, source, rating, wallet, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7, ($8 AT TIME ZONE 'Asia/Manila'))`,
    [
      r.user_id,
      r.username,
      r.text,
      r.embedding,
      r.source,
      r.rating,
      r.wallet,
      r.created_at,
    ],
  );
}

const [{ n }] = (await sql.query(
  `SELECT COUNT(*)::int AS n FROM feedback`,
)) as { n: number }[];
console.log(`Migrated ${rows.length} sqlite rows → Postgres (now ${n} rows).`);
