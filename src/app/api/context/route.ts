import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const context = await prisma.userContext.findUnique({
    where: { userId: session.user.id },
  });

  return NextResponse.json(context || {});
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await req.json();

  const context = await prisma.userContext.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      companyName: data.companyName,
      companyDescription: data.companyDescription,
      role: data.role,
      writingStyle: data.writingStyle,
      signatureBlock: data.signatureBlock,
      additionalNotes: data.additionalNotes,
    },
    update: {
      companyName: data.companyName,
      companyDescription: data.companyDescription,
      role: data.role,
      writingStyle: data.writingStyle,
      signatureBlock: data.signatureBlock,
      additionalNotes: data.additionalNotes,
    },
  });

  return NextResponse.json(context);
}
