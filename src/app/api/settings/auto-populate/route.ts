import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { anthropic } from "@/lib/anthropic";
import { NextResponse } from "next/server";

const MAX_CONTENT_LENGTH = 80_000;

export async function POST() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role === "USER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [files, currentSettings] = await Promise.all([
    prisma.contextFile.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.companySettings.findUnique({ where: { id: "default" } }),
  ]);

  if (files.length === 0) {
    return NextResponse.json(
      { error: "No files uploaded to extract from" },
      { status: 400 }
    );
  }

  // Build file content block respecting character limit
  let totalLength = 0;
  const fileBlocks: string[] = [];
  for (const file of files) {
    const text = file.content || file.summary || "";
    if (totalLength + text.length > MAX_CONTENT_LENGTH) break;
    fileBlocks.push(`--- ${file.name} (${file.category}) ---\n${text}`);
    totalLength += text.length;
  }

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `You are helping configure an email drafting tool. Below are uploaded reference documents and the current settings. Extract relevant information to populate the settings fields.

## Current Settings
${JSON.stringify(currentSettings ?? {}, null, 2)}

## Uploaded Documents
${fileBlocks.join("\n\n")}

## Instructions
Extract values for these fields from the documents. Return JSON with only the fields you can confidently extract. Use null for fields you cannot determine.

{
  "companyName": "string or null",
  "companyDescription": "string or null — what the company does, mission",
  "services": "string or null — services offered",
  "targetMarket": "string or null — ideal customers",
  "uniqueSellingPoints": "string or null — differentiators",
  "caseStudies": "string or null — past wins, results",
  "pricingInfo": "string or null — pricing structure",
  "writingStyle": "string or null — writing guidelines",
  "writingTone": "string or null — tone (e.g. Professional, Conversational)",
  "writingExamples": "string or null — example copy",
  "skills": "string or null — certifications, tools, expertise",
  "additionalContext": "string or null — other relevant context"
}

Return ONLY valid JSON, no markdown fences or explanation.`,
      },
    ],
  });

  const responseText =
    response.content[0].type === "text" ? response.content[0].text : "{}";

  try {
    // Strip markdown fences if present
    const cleaned = responseText
      .replace(/^```(?:json)?\n?/, "")
      .replace(/\n?```$/, "")
      .trim();
    const extracted = JSON.parse(cleaned);
    return NextResponse.json(extracted);
  } catch {
    return NextResponse.json(
      { error: "Failed to parse AI response" },
      { status: 500 }
    );
  }
}
