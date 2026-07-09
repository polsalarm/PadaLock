# @padalock/feedback-graph

Discord-driven feedback collector + theme graph for PadaLock.

Users run **`/feedback <text>`** in Discord → each message is embedded (Gemini)
and stored in sqlite. Anyone runs **`/insights`** → all feedback is clustered
into themes, Gemini writes a short summary, and the bot posts it back with a
**pie chart** of the theme breakdown.

```
Discord  ──/feedback──►  server.ts ──► ingest.ts ──► Gemini embed ──► sqlite
Discord  ──/insights──►  server.ts ──► cluster.ts ──► themes + summary
                                          └──► chart.ts (pie) ──► Discord embed
```

## Pieces

| File | Job |
| ---- | --- |
| `db.ts` | sqlite store (feedback + cached embedding) |
| `gemini.ts` | Gemini embeddings + summary calls |
| `ingest.ts` | embed + persist one feedback message |
| `cluster.ts` | cosine-cluster feedback into labelled themes + summary |
| `chart.ts` | QuickChart pie-chart URL (no native canvas dep) |
| `discord.ts` | interaction router (`/feedback`, `/insights`) |
| `server.ts` | HTTP endpoint + Ed25519 signature verify |
| `register.ts` | register the two slash commands |

## Setup

1. Discord Developer Portal → **New Application**. Copy **Public Key**,
   **Application ID**, and (Bot tab) a **Bot Token**.
2. `cp .env.example .env` and fill in `GEMINI_API_KEY`, `DISCORD_PUBLIC_KEY`,
   `DISCORD_APP_ID`, `DISCORD_BOT_TOKEN`. For instant command updates during
   dev, also set `DISCORD_GUILD_ID`.
3. Register commands: `npm run register --workspace=@padalock/feedback-graph`
4. Start server: `npm run dev --workspace=@padalock/feedback-graph`
5. Expose it publicly (e.g. `ngrok http 3005`) and paste
   `https://<public-url>/api/interactions` into the app's **Interactions Endpoint
   URL** in the Developer Portal. Discord sends a PING to verify — the server
   answers PONG automatically.

## Notes

- **Deferred response:** `/insights` acks immediately, then edits the message
  once clustering + chart are ready (Discord's 3s limit).
- **Storage:** Postgres via `DATABASE_URL` or `POSTGRES_URL`.
- **Chart:** rendered by QuickChart via an embed image URL — zero local render
  deps. Swap `chart.ts` for `@napi-rs/canvas` if you want fully self-hosted.
- Embeddings are cached at write time, so `/insights` never re-embeds.
