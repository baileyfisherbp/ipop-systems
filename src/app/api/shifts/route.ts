import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

/**
 * GET /api/shifts?start=2026-03-01&end=2026-03-31&location=Burnaby
 * Fetch all shifts in a date range, optionally filtered by location.
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const start = url.searchParams.get("start");
  const end = url.searchParams.get("end");
  const location = url.searchParams.get("location");

  if (!start || !end) {
    return NextResponse.json(
      { error: "start and end query params required" },
      { status: 400 }
    );
  }

  const shifts = await prisma.shift.findMany({
    where: {
      date: {
        gte: new Date(start),
        lte: new Date(end),
      },
      ...(location && { location }),
    },
    include: {
      user: {
        select: { id: true, name: true, email: true, image: true },
      },
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });

  return NextResponse.json(shifts);
}

/**
 * POST /api/shifts
 * Create a new shift. Admin/Owner only.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as any).role;
  if (role !== "ADMIN" && role !== "OWNER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { userId, date, startTime, endTime, note, location } = body;

  if (!userId || !date || !startTime || !endTime) {
    return NextResponse.json(
      { error: "userId, date, startTime, endTime are required" },
      { status: 400 }
    );
  }

  try {
    const shift = await prisma.shift.create({
      data: {
        userId,
        date: new Date(date),
        startTime,
        endTime,
        note: note || null,
        location: location || "Burnaby",
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    });

    return NextResponse.json(shift, { status: 201 });
  } catch (err: any) {
    console.error("Failed to create shift:", err);
    return NextResponse.json(
      { error: err.message || "Failed to create shift" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/shifts
 * Update an existing shift. Admin/Owner only.
 */
export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as any).role;
  if (role !== "ADMIN" && role !== "OWNER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { id, userId, date, startTime, endTime, note, location } = body;

  if (!id) {
    return NextResponse.json({ error: "Shift id is required" }, { status: 400 });
  }

  const shift = await prisma.shift.update({
    where: { id },
    data: {
      ...(userId && { userId }),
      ...(date && { date: new Date(date) }),
      ...(startTime && { startTime }),
      ...(endTime && { endTime }),
      ...(note !== undefined && { note: note || null }),
      ...(location && { location }),
    },
    include: {
      user: {
        select: { id: true, name: true, email: true, image: true },
      },
    },
  });

  return NextResponse.json(shift);
}

/**
 * DELETE /api/shifts?id=xxx
 * Delete a shift. Admin/Owner only.
 */
export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as any).role;
  if (role !== "ADMIN" && role !== "OWNER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const id = url.searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Shift id is required" }, { status: 400 });
  }

  await prisma.shift.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
