import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

/**
 * GET /api/availability?start=2026-03-01&end=2026-03-31
 * Fetch availability for a date range.
 * Admins see all staff. Regular users see only their own.
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const start = url.searchParams.get("start");
  const end = url.searchParams.get("end");
  const userId = url.searchParams.get("userId");

  if (!start || !end) {
    return NextResponse.json(
      { error: "start and end query params required" },
      { status: 400 }
    );
  }

  const role = (session.user as any).role;
  const isAdmin = role === "ADMIN" || role === "OWNER";

  const availability = await prisma.availability.findMany({
    where: {
      date: {
        gte: new Date(start),
        lte: new Date(end),
      },
      // Non-admins can only see their own availability
      // Admins can optionally filter by userId
      ...(!isAdmin
        ? { userId: session.user.id }
        : userId
          ? { userId }
          : {}),
    },
    include: {
      user: {
        select: { id: true, name: true, email: true, image: true },
      },
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });

  return NextResponse.json(availability);
}

/**
 * POST /api/availability
 * Create or bulk-create availability slots. Any authenticated user can set their own.
 * Admins can set availability for any user.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const role = (session.user as any).role;
  const isAdmin = role === "ADMIN" || role === "OWNER";

  // Support bulk creation: body can be an array or single object
  const entries = Array.isArray(body) ? body : [body];

  const results = [];
  for (const entry of entries) {
    const { date, startTime, endTime, note, userId: targetUserId } = entry;

    if (!date || !startTime || !endTime) {
      return NextResponse.json(
        { error: "date, startTime, endTime are required" },
        { status: 400 }
      );
    }

    // Non-admins can only set their own availability
    const userId = isAdmin && targetUserId ? targetUserId : session.user.id;

    const availability = await prisma.availability.upsert({
      where: {
        userId_date_startTime_endTime: {
          userId,
          date: new Date(date),
          startTime,
          endTime,
        },
      },
      update: { note: note || null },
      create: {
        userId,
        date: new Date(date),
        startTime,
        endTime,
        note: note || null,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    });

    results.push(availability);
  }

  return NextResponse.json(results.length === 1 ? results[0] : results, {
    status: 201,
  });
}

/**
 * DELETE /api/availability?id=xxx
 * Delete an availability slot. Users can delete their own. Admins can delete any.
 */
export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const id = url.searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "Availability id is required" },
      { status: 400 }
    );
  }

  const role = (session.user as any).role;
  const isAdmin = role === "ADMIN" || role === "OWNER";

  // Check ownership for non-admins
  if (!isAdmin) {
    const existing = await prisma.availability.findUnique({ where: { id } });
    if (!existing || existing.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  await prisma.availability.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
