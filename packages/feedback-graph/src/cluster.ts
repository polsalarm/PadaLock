import { allFeedback, type FeedbackRow } from './pg.js';
import { generate } from './gemini.js';

export interface Theme {
  label: string;
  count: number;
  share: number; // 0..1 fraction of total feedback
  samples: string[]; // a few representative messages
}

export interface Insights {
  total: number;
  themes: Theme[];
  summary: string;
  avgRating: number | null; // mean overall rating across rated feedback
  ratedCount: number;
  bySource: { discord: number; app: number };
}

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

interface Cluster {
  centroid: number[];
  rows: FeedbackRow[];
}

/** Greedy single-pass clustering by cosine similarity to running centroid. */
function clusterRows(rows: FeedbackRow[], threshold: number): Cluster[] {
  const clusters: Cluster[] = [];
  for (const row of rows) {
    const vec = JSON.parse(row.embedding) as number[];
    let best: Cluster | null = null;
    let bestSim = threshold;
    for (const c of clusters) {
      const sim = cosine(vec, c.centroid);
      if (sim >= bestSim) {
        best = c;
        bestSim = sim;
      }
    }
    if (best) {
      // update centroid (running mean)
      const n = best.rows.length;
      for (let i = 0; i < best.centroid.length; i++) {
        best.centroid[i] = (best.centroid[i] * n + vec[i]) / (n + 1);
      }
      best.rows.push(row);
    } else {
      clusters.push({ centroid: [...vec], rows: [row] });
    }
  }
  return clusters;
}

/** Ask Gemini for a short human label given sample messages in a cluster. */
async function labelCluster(samples: string[]): Promise<string> {
  const prompt =
    `These user feedback messages belong to one theme. ` +
    `Reply with a SHORT label of 2-4 words, no punctuation, Title Case. ` +
    `Messages:\n` +
    samples.map((s) => `- ${s}`).join('\n');
  const raw = await generate(prompt);
  return raw.split('\n')[0].replace(/[."]/g, '').slice(0, 40) || 'Misc';
}

/** Cluster all stored feedback and produce labelled themes + a text summary. */
export async function buildInsights(): Promise<Insights> {
  const rows = await allFeedback();
  const total = rows.length;

  const rated = rows.filter((r) => r.rating != null);
  const avgRating =
    rated.length === 0
      ? null
      : rated.reduce((s, r) => s + (r.rating as number), 0) / rated.length;
  const bySource = {
    discord: rows.filter((r) => r.source === 'discord').length,
    app: rows.filter((r) => r.source === 'app').length,
  };

  if (total === 0) {
    return {
      total: 0,
      themes: [],
      summary: 'No feedback collected yet.',
      avgRating: null,
      ratedCount: 0,
      bySource,
    };
  }

  const threshold = Number(process.env.CLUSTER_THRESHOLD ?? 0.78);
  const clusters = clusterRows(rows, threshold).sort(
    (a, b) => b.rows.length - a.rows.length,
  );

  const themes: Theme[] = [];
  for (const c of clusters) {
    const samples = c.rows.slice(0, 4).map((r) => r.text);
    const label = await labelCluster(samples);
    themes.push({
      label,
      count: c.rows.length,
      share: c.rows.length / total,
      samples,
    });
  }

  const summary = await summarize(themes, total, avgRating);
  return {
    total,
    themes,
    summary,
    avgRating,
    ratedCount: rated.length,
    bySource,
  };
}

async function summarize(
  themes: Theme[],
  total: number,
  avgRating: number | null,
): Promise<string> {
  const lines = themes
    .map((t) => `${t.label}: ${t.count} (${Math.round(t.share * 100)}%)`)
    .join('\n');
  const ratingLine =
    avgRating != null ? `Average rating: ${avgRating.toFixed(1)}/5.\n` : '';
  const prompt =
    `You are summarizing user feedback for the PadaLock remittance app. ` +
    `${total} total messages. ${ratingLine}Themes:\n${lines}\n\n` +
    `Write 2-3 sentences: overall sentiment, top pain points, and one ` +
    `concrete suggestion. Plain text, no markdown headers.`;
  return generate(prompt);
}
