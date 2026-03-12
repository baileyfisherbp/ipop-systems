import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const integrations = await prisma.integration.findMany({
    where: { userId: session.user.id },
    select: {
      id: true,
      type: true,
      name: true,
      enabled: true,
      createdAt: true,
    },
  });

  return NextResponse.json(integrations);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { type, name } = await req.json();

  const integration = await prisma.integration.upsert({
    where: {
      userId_type: {
        userId: session.user.id,
        type,
      },
    },
    create: {
      userId: session.user.id,
      type,
      name,
      enabled: true,
    },
    update: {
      name,
      enabled: true,
    },
  });

  return NextResponse.json(integration);
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "Integration ID required" },
      { status: 400 }
    );
  }

  await prisma.integration.deleteMany({
    where: { id, userId: session.user.id },
  });

  return NextResponse.json({ success: true });
}
