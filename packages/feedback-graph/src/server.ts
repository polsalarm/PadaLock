import 'dotenv/config';
import { createServer } from 'node:http';
import { verifyKey } from 'discord-interactions';
import { handleInteraction } from './discord';
import { ingest } from './ingest';
import { feedbackToCsv } from './export';

const PORT = Number(process.env.PORT ?? 3005);
const PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY ?? '';
const INGEST_SECRET = process.env.INGEST_SECRET ?? '';

function readRawBody(req: import('node:http').IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function json(res: import('node:http').ServerResponse, code: number, body: unknown): void {
  res.writeHead(code, {
    'Content-Type': 'application/json',
    // Allow the browser widget to POST from the web app.
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'content-type, x-ingest-secret',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  });
  res.end(JSON.stringify(body));
}

interface AppFeedbackBody {
  text?: string;
  rating?: number; // overall 1..5
  wallet?: string;
  user?: string; // display name / id (optional)
}

async function handleIngest(
  req: import('node:http').IncomingMessage,
  res: import('node:http').ServerResponse,
): Promise<void> {
  if (INGEST_SECRET) {
    const got = req.headers['x-ingest-secret'];
    if (got !== INGEST_SECRET) {
      json(res, 401, { error: 'bad or missing x-ingest-secret' });
      return;
    }
  }
  const raw = await readRawBody(req);
  let body: AppFeedbackBody;
  try {
    body = JSON.parse(raw);
  } catch {
    json(res, 400, { error: 'invalid JSON' });
    return;
  }

  const text = (body.text ?? '').toString();
  const rating =
    body.rating == null ? null : Math.max(1, Math.min(5, Number(body.rating)));
  const wallet = body.wallet ? body.wallet.toString() : null;
  const user = (body.user ?? wallet ?? 'app-user').toString();

  try {
    await ingest(user, user, text, { source: 'app', rating, wallet });
    json(res, 200, { ok: true });
  } catch (err) {
    json(res, 400, { error: (err as Error).message });
  }
}

const server = createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    json(res, 204, {});
    return;
  }

  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200).end('ok');
    return;
  }

  // CSV download of all feedback. Guarded by the ingest secret (?key= or
  // x-ingest-secret header) so it isn't world-readable.
  if (req.method === 'GET' && req.url?.startsWith('/export.csv')) {
    if (INGEST_SECRET) {
      const url = new URL(req.url, 'http://localhost');
      const key = url.searchParams.get('key') ?? req.headers['x-ingest-secret'];
      if (key !== INGEST_SECRET) {
        res.writeHead(401).end('bad or missing key');
        return;
      }
    }
    const csv = feedbackToCsv();
    res.writeHead(200, {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="padalock-feedback.csv"',
    });
    res.end(csv);
    return;
  }

  // App feedback widget posts structured ratings + comment here.
  if (req.method === 'POST' && req.url === '/ingest') {
    await handleIngest(req, res);
    return;
  }

  if (req.method !== 'POST' || req.url !== '/interactions') {
    res.writeHead(404).end('not found');
    return;
  }

  const signature = req.headers['x-signature-ed25519'] as string | undefined;
  const timestamp = req.headers['x-signature-timestamp'] as string | undefined;
  const raw = await readRawBody(req);

  if (!signature || !timestamp) {
    res.writeHead(401).end('missing signature');
    return;
  }

  const valid = await verifyKey(raw, signature, timestamp, PUBLIC_KEY);
  if (!valid) {
    res.writeHead(401).end('invalid signature');
    return;
  }

  try {
    const interaction = JSON.parse(raw);
    const response = await handleInteraction(interaction);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(response));
  } catch (err) {
    console.error('interaction error', err);
    res.writeHead(500).end('error');
  }
});

server.listen(PORT, () => {
  console.log(
    `feedback-graph listening on :${PORT}  (POST /interactions, POST /ingest)`,
  );
  if (!PUBLIC_KEY) console.warn('WARNING: DISCORD_PUBLIC_KEY not set');
});
