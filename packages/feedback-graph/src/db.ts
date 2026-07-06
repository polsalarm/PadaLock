import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export type FeedbackSource = 'discord' | 'app';

export interface FeedbackRow {
  id: number;
  user_id: string;
  username: string;
  text: string;
  embedding: string; // JSON array of numbers
  source: FeedbackSource;
  rating: number | null; // overall 1..5, null if none
  wallet: string | null;
  created_at: string;
}

export interface FeedbackMeta {
  source?: FeedbackSource;
  rating?: number | null;
  wallet?: string | null;
}

const DB_PATH = resolve(
  process.env.FEEDBACK_DB || resolve(process.cwd(), 'data', 'feedback.db'),
);

let db: Database.Database | null = null;

/** Add a column if the table doesn't already have it (idempotent migration). */
function ensureColumn(
  d: Database.Database,
  column: string,
  ddl: string,
): void {
  const cols = d.prepare(`PRAGMA table_info(feedback)`).all() as {
    name: string;
  }[];
  if (!cols.some((c) => c.name === column)) {
    d.exec(`ALTER TABLE feedback ADD COLUMN ${ddl}`);
  }
}

export function getDb(): Database.Database {
  if (db) return db;
  mkdirSync(dirname(DB_PATH), { recursive: true });
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS feedback (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    TEXT NOT NULL,
      username   TEXT NOT NULL,
      text       TEXT NOT NULL,
      embedding  TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  // Migrate older DBs that predate these columns.
  ensureColumn(db, 'source', `source TEXT NOT NULL DEFAULT 'discord'`);
  ensureColumn(db, 'rating', `rating INTEGER`);
  ensureColumn(db, 'wallet', `wallet TEXT`);
  return db;
}

/** Local wall-clock timestamp "YYYY-MM-DD HH:MM:SS" (server machine's tz). */
function nowLocal(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ` +
    `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
  );
}

export function insertFeedback(
  userId: string,
  username: string,
  text: string,
  embedding: number[],
  meta: FeedbackMeta = {},
): void {
  getDb()
    .prepare(
      `INSERT INTO feedback (user_id, username, text, embedding, source, rating, wallet, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      userId,
      username,
      text,
      JSON.stringify(embedding),
      meta.source ?? 'discord',
      meta.rating ?? null,
      meta.wallet ?? null,
      nowLocal(),
    );
}

export function allFeedback(): FeedbackRow[] {
  return getDb()
    .prepare(`SELECT * FROM feedback ORDER BY created_at ASC`)
    .all() as FeedbackRow[];
}

export function feedbackCount(): number {
  const row = getDb().prepare(`SELECT COUNT(*) AS n FROM feedback`).get() as {
    n: number;
  };
  return row.n;
}
