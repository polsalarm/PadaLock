/**
 * Register the /feedback and /insights slash commands with Discord.
 * Run once (and again whenever command defs change):  npm run register
 *
 * Uses guild-scoped registration when DISCORD_GUILD_ID is set (updates
 * instantly — good for dev), else global (can take up to ~1h to propagate).
 */
import 'dotenv/config';

const API = 'https://discord.com/api/v10';

const commands = [
  {
    name: 'feedback',
    description: 'Send feedback about PadaLock',
    options: [
      {
        name: 'text',
        description: 'What do you want us to know?',
        type: 3, // STRING
        required: true,
      },
    ],
  },
  {
    name: 'insights',
    description: 'Summary + pie chart of all feedback themes',
  },
  {
    name: 'export',
    description: 'Download all feedback as a CSV file (private to you)',
  },
];

async function main() {
  const appId = process.env.DISCORD_APP_ID;
  const token = process.env.DISCORD_BOT_TOKEN;
  const guildId = process.env.DISCORD_GUILD_ID;
  if (!appId || !token) throw new Error('DISCORD_APP_ID and DISCORD_BOT_TOKEN required');

  const url = guildId
    ? `${API}/applications/${appId}/guilds/${guildId}/commands`
    : `${API}/applications/${appId}/commands`;

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bot ${token}`,
    },
    body: JSON.stringify(commands),
  });

  if (!res.ok) throw new Error(`register ${res.status}: ${await res.text()}`);
  console.log(
    `Registered ${commands.length} commands (${guildId ? `guild ${guildId}` : 'global'}).`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
