import { NextResponse } from "next/server";

/**
 * Collects basic user feedback for the Level 4 submission.
 * Persistence is best-effort: if FEEDBACK_WEBHOOK_URL is set (Discord/Slack/
 * generic incoming webhook) each submission is forwarded there so the team gets
 * verbatim text. Rating/counts are also tracked client-side via Vercel Analytics
 * (`feedback_submitted`), so a summary is derivable even without a webhook.
 * No secrets, testnet-safe, never stores wallet keys.
 */

interface FeedbackBody {
  rating?: number;
  message?: string;
  address?: string;
}

export async function POST(req: Request) {
  let body: FeedbackBody;
  try {
    body = (await req.json()) as FeedbackBody;
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const rating = Number(body.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Rating must be 1–5" }, { status: 400 });
  }
  const message = (body.message ?? "").toString().slice(0, 1000);
  const address =
    typeof body.address === "string" && body.address.startsWith("G")
      ? body.address.slice(0, 56)
      : "";

  const webhook = process.env.FEEDBACK_WEBHOOK_URL;
  if (webhook) {
    const stars = "★".repeat(rating) + "☆".repeat(5 - rating);
    const content = [
      `**PadaLock feedback** — ${stars} (${rating}/5)`,
      message ? `> ${message}` : "_(no message)_",
      address ? `wallet: \`${address}\`` : "",
    ]
      .filter(Boolean)
      .join("\n");
    try {
      await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
    } catch {
      // best-effort — do not fail the user's submission on webhook error
    }
  }

  return NextResponse.json({ ok: true });
}
