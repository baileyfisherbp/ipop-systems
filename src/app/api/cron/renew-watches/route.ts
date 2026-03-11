import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getGmailAccessToken, watchMailbox } from "@/lib/gmail";

const PUBSUB_TOPIC = process.env.GMAIL_PUBSUB_TOPIC!;
const CRON_SECRET = process.env.CRON_SECRET;

/**
 * GET /api/cron/renew-watches
 *
 * Renews Gmail watches that are expiring within the next 24 hours.
 * Should be called daily via Vercel Cron or an external cron service.
 *
 * Secured with CRON_SECRET or Vercel's authorization header.
 */
export async function GET(request: Request) {
  // Verify the request is from our cron system
  const authHeader = request.headers.get("authorization");
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!PUBSUB_TOPIC) {
    return NextResponse.json(
      { error: "GMAIL_PUBSUB_TOPIC is not configured" },
      { status: 500 }
    );
  }

  // Find watches expiring in the next 24 hours
  const expiringThreshold = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const expiringWatches = await prisma.gmailWatch.findMany({
    where: {
      active: true,
      expiration: { lt: expiringThreshold },
    },
    include: { user: true },
  });

  let renewed = 0;
  let failed = 0;

  for (const watch of expiringWatches) {
    try {
      const accessToken = await getGmailAccessToken(watch.userId);
      const result = await watchMailbox(accessToken, PUBSUB_TOPIC);

      await prisma.gmailWatch.update({
        where: { id: watch.id },
        data: {
          historyId: result.historyId,
          expiration: new Date(parseInt(result.expiration)),
        },
      });

      renewed++;
    } catch (err) {
      console.error(
        `Failed to renew watch for user ${watch.userId}:`,
        err
      );
      failed++;
    }
  }

  return NextResponse.json({
    ok: true,
    renewed,
    failed,
    total: expiringWatches.length,
  });
}
