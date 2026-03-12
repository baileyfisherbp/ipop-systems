import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await prisma.companySettings.findUnique({
    where: { id: "default" },
  });

  return NextResponse.json(settings || {});
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await req.json();

  const settings = await prisma.companySettings.upsert({
    where: { id: "default" },
    create: {
      companyName: data.companyName,
      companyDescription: data.companyDescription,
      writingStyle: data.writingStyle,
      writingTone: data.writingTone,
      additionalContext: data.additionalContext,
    },
    update: {
      companyName: data.companyName,
      companyDescription: data.companyDescription,
      writingStyle: data.writingStyle,
      writingTone: data.writingTone,
      additionalContext: data.additionalContext,
    },
  });

  return NextResponse.json(settings);
}
