import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// In-memory presence store (per server instance)
// Maps userId -> { lastSeenAt, status }
const presenceStore = new Map<
  string,
  { lastSeenAt: Date; status: "online" | "away" }
>();

const ONLINE_THRESHOLD_MS = 30_000; // 30 seconds
const AWAY_THRESHOLD_MS = 5 * 60_000; // 5 minutes

function getStatus(lastSeenAt: Date): "online" | "away" | "offline" {
  const elapsed = Date.now() - lastSeenAt.getTime();
  if (elapsed < ONLINE_THRESHOLD_MS) return "online";
  if (elapsed < AWAY_THRESHOLD_MS) return "away";
  return "offline";
}

// POST — heartbeat: report that the current user is active
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  presenceStore.set(session.user.id, {
    lastSeenAt: new Date(),
    status: "online",
  });

  return NextResponse.json({ ok: true });
}

// GET — fetch all online/away users
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Clean up offline users from the store
  const now = Date.now();
  for (const [userId, data] of presenceStore.entries()) {
    if (now - data.lastSeenAt.getTime() > AWAY_THRESHOLD_MS) {
      presenceStore.delete(userId);
    }
  }

  // Get user details from the database for all present users
  const userIds = Array.from(presenceStore.keys());
  if (userIds.length === 0) {
    return NextResponse.json([]);
  }

  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, email: true, image: true },
  });

  const result = users.map((user) => {
    const presence = presenceStore.get(user.id);
    const lastSeenAt = presence?.lastSeenAt ?? null;
    const status = lastSeenAt ? getStatus(lastSeenAt) : "offline";

    return {
      id: user.id,
      name: user.name,
      email: user.email ?? "",
      image: user.image,
      status,
      lastSeenAt: lastSeenAt?.toISOString() ?? null,
      becameActiveAt: null,
    };
  });

  return NextResponse.json(result);
}
