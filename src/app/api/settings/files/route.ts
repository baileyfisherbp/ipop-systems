import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { anthropic } from "@/lib/anthropic";
import { NextResponse } from "next/server";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

async function extractTextFromFile(
  buffer: Buffer,
  mimeType: string,
  fileName: string
): Promise<{ content: string; summary: string }> {
  // Text-based files — decode directly
  const textTypes = [
    "text/plain",
    "text/markdown",
    "text/csv",
    "application/json",
    "text/xml",
    "application/xml",
    "text/html",
  ];

  if (textTypes.some((t) => mimeType.startsWith(t))) {
    const content = buffer.toString("utf-8");
    // Generate summary for text files
    const summaryResponse = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: `Summarize the following document in 2-4 sentences, focusing on what information it contains that would be useful for writing professional emails (company info, services, tone examples, etc.):\n\n${content.slice(0, 20000)}`,
        },
      ],
    });
    const summary =
      summaryResponse.content[0].type === "text"
        ? summaryResponse.content[0].text
        : "";
    return { content, summary };
  }

  // PDFs — send to Claude for extraction
  if (mimeType === "application/pdf") {
    const base64 = buffer.toString("base64");
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: { type: "base64", media_type: "application/pdf", data: base64 },
            },
            {
              type: "text",
              text: `Extract all text from this PDF while preserving structure. Then provide a 2-4 sentence summary focused on what information is useful for writing professional emails.

Return your response in this format:
<extracted>
[full extracted text here]
</extracted>
<summary>
[2-4 sentence summary here]
</summary>`,
            },
          ],
        },
      ],
    });

    const responseText =
      response.content[0].type === "text" ? response.content[0].text : "";
    const extractedMatch = responseText.match(
      /<extracted>([\s\S]*?)<\/extracted>/
    );
    const summaryMatch = responseText.match(/<summary>([\s\S]*?)<\/summary>/);

    return {
      content: extractedMatch?.[1]?.trim() ?? responseText,
      summary: summaryMatch?.[1]?.trim() ?? "",
    };
  }

  // Images — send to Claude for description
  const imageTypes = ["image/png", "image/jpeg", "image/gif", "image/webp"];
  if (imageTypes.includes(mimeType)) {
    const base64 = buffer.toString("base64");
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mimeType as
                  | "image/png"
                  | "image/jpeg"
                  | "image/gif"
                  | "image/webp",
                data: base64,
              },
            },
            {
              type: "text",
              text: `Describe this image and extract any visible text. Then provide a 2-4 sentence summary focused on what information is useful for writing professional emails.

Return your response in this format:
<extracted>
[description and extracted text here]
</extracted>
<summary>
[2-4 sentence summary here]
</summary>`,
            },
          ],
        },
      ],
    });

    const responseText =
      response.content[0].type === "text" ? response.content[0].text : "";
    const extractedMatch = responseText.match(
      /<extracted>([\s\S]*?)<\/extracted>/
    );
    const summaryMatch = responseText.match(/<summary>([\s\S]*?)<\/summary>/);

    return {
      content: extractedMatch?.[1]?.trim() ?? responseText,
      summary: summaryMatch?.[1]?.trim() ?? "",
    };
  }

  // Fallback for unsupported types
  return {
    content: `File: ${fileName} (${mimeType}, ${buffer.length} bytes)`,
    summary: `Uploaded file "${fileName}" — content extraction not supported for this file type.`,
  };
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role === "USER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const category = (formData.get("category") as string) || "general";

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "File too large (max 10MB)" },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const { content, summary } = await extractTextFromFile(
    buffer,
    file.type,
    file.name
  );

  const contextFile = await prisma.contextFile.create({
    data: {
      name: file.name,
      mimeType: file.type,
      size: file.size,
      content,
      summary,
      category: category as any,
      uploadedById: session.user.id,
    },
    include: { uploadedBy: { select: { name: true, email: true } } },
  });

  return NextResponse.json(contextFile);
}

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const files = await prisma.contextFile.findMany({
    orderBy: { createdAt: "desc" },
    include: { uploadedBy: { select: { name: true, email: true } } },
  });

  return NextResponse.json(files);
}
