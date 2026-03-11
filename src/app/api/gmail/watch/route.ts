import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGmailAccessToken, watchMailbox, stopWatch } from "@/lib/gmail";
import { NextResponse } from "next/server";

const PUBSUB_TOPIC = process.env.GMAIL_PUBSUB_TOPIC!;

/**
 * POST /api/gmail/watch — Start watching a user's Gmail inbox.
 */
export async function POST() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const accessToken = await getGmailAccessToken(session.user.id);

    if (!PUBSUB_TOPIC) {
      return NextResponse.json(
        { error: "GMAIL_PUBSUB_TOPIC is not configured" },
        { status: 500 }
      );
    }

    const result = await watchMailbox(accessToken, PUBSUB_TOPIC);

    // Store or update the watch record
    await prisma.gmailWatch.upsert({
      where: { userId: session.user.id },
      update: {
        historyId: result.historyId,
        expiration: new Date(parseInt(result.expiration)),
        active: true,
      },
      create: {
        userId: session.user.id,
        historyId: result.historyId,
        expiration: new Date(parseInt(result.expiration)),
        active: true,
      },
    });

    return NextResponse.json({
      ok: true,
      historyId: result.historyId,
      expiration: result.expiration,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/gmail/watch — Stop watching a user's Gmail inbox.
 */
export async function DELETE() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const accessToken = await getGmailAccessToken(session.user.id);
    await stopWatch(accessToken);

    await prisma.gmailWatch.updateMany({
      where: { userId: session.user.id },
      data: { active: false },
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/gmail/watch — Check the current watch status.
 */
export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const watch = await prisma.gmailWatch.findUnique({
    where: { userId: session.user.id },
  });

  if (!watch) {
    return NextResponse.json({ active: false });
  }

  return NextResponse.json({
    active: watch.active,
    expiration: watch.expiration.toISOString(),
    isExpired: new Date() > watch.expiration,
  });
}
