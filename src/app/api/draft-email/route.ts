import { auth } from "@/lib/auth";
import { anthropic } from "@/lib/anthropic";
import { loadAIContext, buildContextBlock } from "@/lib/settings-context";
import { buildSystemPrompt, buildEmailUserMessage } from "@/lib/prompt";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const {
    emailType,
    recipientName,
    recipientCompany,
    recipientRole,
    purpose,
    keyPoints,
    additionalContext,
  } = body;

  if (!emailType || !purpose) {
    return NextResponse.json(
      { error: "emailType and purpose are required" },
      { status: 400 }
    );
  }

  // Load AI context from settings
  const context = await loadAIContext();
  const contextBlock = buildContextBlock(context);
  const systemPrompt = buildSystemPrompt(
    contextBlock || undefined
  );

  const userMessage = buildEmailUserMessage({
    emailType,
    recipientName,
    recipientCompany,
    recipientRole,
    purpose,
    keyPoints,
    additionalContext,
  });

  // Stream the response
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await anthropic.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4096,
          system: systemPrompt,
          messages: [{ role: "user", content: userMessage }],
          stream: true,
        });

        let fullText = "";

        for await (const event of response) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            fullText += event.delta.text;
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`)
            );
          }
        }

        // Parse and save the draft
        try {
          const cleaned = fullText
            .replace(/^```(?:json)?\n?/, "")
            .replace(/\n?```$/, "")
            .trim();
          const parsed = JSON.parse(cleaned);

          const draft = await prisma.emailDraft.create({
            data: {
              subject: parsed.subject ?? null,
              body: parsed.body ?? null,
              recipientTo: recipientName
                ? `${recipientName}${recipientCompany ? ` (${recipientCompany})` : ""}`
                : null,
              context: purpose,
              createdById: session.user.id,
            },
          });

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ done: true, draftId: draft.id, parsed })}\n\n`
            )
          );
        } catch {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ done: true, raw: fullText })}\n\n`
            )
          );
        }

        controller.close();
      } catch (error: any) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ error: error.message })}\n\n`
          )
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
