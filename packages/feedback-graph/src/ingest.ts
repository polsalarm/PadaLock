import { insertFeedback, type FeedbackMeta } from './pg.js';
import { embed } from './gemini.js';

/**
 * Store one piece of feedback. Embeds at write time so /insights stays fast.
 * `text` is what gets embedded/clustered; meta carries source/rating/wallet.
 */
export async function ingest(
  userId: string,
  username: string,
  text: string,
  meta: FeedbackMeta = {},
): Promise<void> {
  const clean = text.trim();
  // Comment is optional for app ratings — synthesize a stub so it still
  // embeds and clusters instead of being dropped.
  const forEmbed =
    clean ||
    (meta.rating != null
      ? `Rated ${meta.rating} out of 5, no written comment`
      : '');
  if (!forEmbed) throw new Error('empty feedback');
  const vector = await embed(forEmbed);
  await insertFeedback(userId, username, clean || forEmbed, vector, meta);
}
