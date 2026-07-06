import {
  InteractionType,
  InteractionResponseType,
} from 'discord-interactions';
import { ingest } from './ingest';
import { buildInsights } from './cluster';
import { pieChartUrl } from './chart';

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

/**
 * Handle a verified interaction. Returns the immediate JSON response.
 * For /insights it returns a DEFERRED ack and finishes the work in the
 * background via followup().
 */
export async function handleInteraction(
  i: Interaction,
): Promise<Record<string, unknown>> {
  if (i.type === InteractionType.PING) {
    return { type: InteractionResponseType.PONG };
  }

  if (i.type === InteractionType.APPLICATION_COMMAND) {
    const name = i.data?.name;

    if (name === 'feedback') {
      const text = opt(i, 'text');
      const who = actor(i);
      try {
        await ingest(who.id, who.username, text);
        return msg('Feedback logged ✅ — salamat!', true);
      } catch (err) {
        return msg(`Could not log feedback: ${(err as Error).message}`, true);
      }
    }

    if (name === 'insights') {
      // Ack now, do the heavy lifting after (3s Discord deadline).
      void runInsights(i.token);
      return { type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE };
    }

    return msg('Unknown command.', true);
  }

  return msg('Unsupported interaction.', true);
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

/** Edit the original deferred response. */
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
