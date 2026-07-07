import {
  InteractionType,
  InteractionResponseType,
} from 'discord-interactions';
import { ingest } from './ingest.js';
import { buildInsights } from './cluster.js';
import { pieChartUrl } from './chart.js';
import { exportCsv } from './export.js';
import { feedbackCount } from './pg.js';

const API = 'https://discord.com/api/v10';
const EPHEMERAL = 64;

interface InteractionUser {
  id: string;
  username: string;
}

interface Interaction {
  type: number;
  token: string;
  data?: {
    name: string;
    options?: { name: string; value: string }[];
  };
  member?: { user: InteractionUser };
  user?: InteractionUser;
}

function actor(i: Interaction): InteractionUser {
  return i.member?.user ?? i.user ?? { id: 'unknown', username: 'unknown' };
}

function opt(i: Interaction, name: string): string {
  return i.data?.options?.find((o) => o.name === name)?.value ?? '';
}

export interface InteractionResult {
  /** Immediate JSON response Discord expects within 3s. */
  body: Record<string, unknown>;
  /**
   * Work to finish AFTER acking (deferred commands). The serverless caller must
   * keep the function alive for this via waitUntil(), or it gets killed.
   */
  background?: Promise<void>;
}

/**
 * Handle a verified interaction. Returns the immediate response plus, for
 * deferred commands, a background promise the caller should waitUntil().
 */
export async function handleInteraction(
  i: Interaction,
): Promise<InteractionResult> {
  if (i.type === InteractionType.PING) {
    return { body: { type: InteractionResponseType.PONG } };
  }

  if (i.type === InteractionType.APPLICATION_COMMAND) {
    const name = i.data?.name;

    if (name === 'feedback') {
      const text = opt(i, 'text');
      const who = actor(i);
      try {
        await ingest(who.id, who.username, text);
        return { body: msg('Feedback logged ✅ — salamat!', true) };
      } catch (err) {
        return {
          body: msg(`Could not log feedback: ${(err as Error).message}`, true),
        };
      }
    }

    if (name === 'insights') {
      // Ack now, do the heavy lifting after (3s Discord deadline).
      return {
        body: {
          type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
        },
        background: runInsights(i.token),
      };
    }

    if (name === 'export') {
      // Ephemeral: the CSV contains wallet addresses, so only show it to the
      // person who ran the command.
      return {
        body: {
          type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
          data: { flags: EPHEMERAL },
        },
        background: runExport(i.token),
      };
    }

    return { body: msg('Unknown command.', true) };
  }

  return { body: msg('Unsupported interaction.', true) };
}

function msg(content: string, ephemeral = false): Record<string, unknown> {
  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: { content, ...(ephemeral ? { flags: EPHEMERAL } : {}) },
  };
}

async function runInsights(token: string): Promise<void> {
  try {
    const ins = await buildInsights();
    if (ins.total === 0) {
      await followup(token, { content: 'No feedback collected yet.' });
      return;
    }
    const stars =
      ins.avgRating != null
        ? `${'★'.repeat(Math.round(ins.avgRating))}${'☆'.repeat(5 - Math.round(ins.avgRating))} ${ins.avgRating.toFixed(1)}/5 (${ins.ratedCount} rated)`
        : 'no ratings yet';
    const embed = {
      title: `Feedback insights — ${ins.total} messages`,
      description: ins.summary,
      color: 0x4f46e5,
      image: { url: pieChartUrl(ins.themes) },
      fields: [
        { name: 'Overall rating', value: stars, inline: false },
        {
          name: 'Sources',
          value: `App ${ins.bySource.app} · Discord ${ins.bySource.discord}`,
          inline: false,
        },
        ...ins.themes.slice(0, 6).map((t) => ({
          name: `${t.label} — ${Math.round(t.share * 100)}%`,
          value: `${t.count} message(s)`,
          inline: true,
        })),
      ],
    };
    await followup(token, { embeds: [embed] });
  } catch (err) {
    await followup(token, {
      content: `Insights failed: ${(err as Error).message}`,
    });
  }
}

async function runExport(token: string): Promise<void> {
  try {
    const n = await feedbackCount();
    if (n === 0) {
      await followup(token, { content: 'No feedback to export yet.' });
      return;
    }
    const csv = await exportCsv();
    const stamp = new Date().toISOString().slice(0, 10);
    await followupFile(
      token,
      csv,
      `padalock-feedback-${stamp}.csv`,
      `📄 Exported ${n} feedback row(s).`,
    );
  } catch (err) {
    await followup(token, {
      content: `Export failed: ${(err as Error).message}`,
    });
  }
}

/** Edit the original deferred response (JSON body). */
async function followup(
  token: string,
  body: Record<string, unknown>,
): Promise<void> {
  const appId = process.env.DISCORD_APP_ID;
  if (!appId) throw new Error('DISCORD_APP_ID not set');
  const res = await fetch(
    `${API}/webhooks/${appId}/${token}/messages/@original`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) {
    throw new Error(`followup ${res.status}: ${await res.text()}`);
  }
}

/** Edit the original deferred response, attaching a file (multipart). */
async function followupFile(
  token: string,
  content: string,
  filename: string,
  message: string,
): Promise<void> {
  const appId = process.env.DISCORD_APP_ID;
  if (!appId) throw new Error('DISCORD_APP_ID not set');
  const form = new FormData();
  form.append(
    'payload_json',
    JSON.stringify({
      content: message,
      attachments: [{ id: 0, filename }],
    }),
  );
  form.append(
    'files[0]',
    new Blob([content], { type: 'text/csv' }),
    filename,
  );
  const res = await fetch(
    `${API}/webhooks/${appId}/${token}/messages/@original`,
    { method: 'PATCH', body: form },
  );
  if (!res.ok) {
    throw new Error(`followupFile ${res.status}: ${await res.text()}`);
  }
}
