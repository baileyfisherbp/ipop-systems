import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await prisma.companySettings.findUnique({
    where: { id: "default" },
  });

  return NextResponse.json(settings ?? {});
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role === "USER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();

  const settings = await prisma.companySettings.upsert({
    where: { id: "default" },
    update: {
      companyName: body.companyName ?? null,
      companyDescription: body.companyDescription ?? null,
      services: body.services ?? null,
      targetMarket: body.targetMarket ?? null,
      uniqueSellingPoints: body.uniqueSellingPoints ?? null,
      caseStudies: body.caseStudies ?? null,
      pricingInfo: body.pricingInfo ?? null,
      writingStyle: body.writingStyle ?? null,
      writingTone: body.writingTone ?? null,
      writingExamples: body.writingExamples ?? null,
      skills: body.skills ?? null,
      additionalContext: body.additionalContext ?? null,
    },
    create: {
      id: "default",
      companyName: body.companyName ?? null,
      companyDescription: body.companyDescription ?? null,
      services: body.services ?? null,
      targetMarket: body.targetMarket ?? null,
      uniqueSellingPoints: body.uniqueSellingPoints ?? null,
      caseStudies: body.caseStudies ?? null,
      pricingInfo: body.pricingInfo ?? null,
      writingStyle: body.writingStyle ?? null,
      writingTone: body.writingTone ?? null,
      writingExamples: body.writingExamples ?? null,
      skills: body.skills ?? null,
      additionalContext: body.additionalContext ?? null,
    },
  });

  return NextResponse.json(settings);
}
