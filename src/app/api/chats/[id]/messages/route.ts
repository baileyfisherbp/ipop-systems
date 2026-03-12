import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

const anthropic = new Anthropic();

// Generate a short chat title from the conversation
async function generateChatTitle(
  userMessage: string,
  assistantMessage: string
): Promise<string> {
  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 30,
      messages: [
        {
          role: "user",
          content: `Summarize this conversation in 3-6 words for a chat title. No quotes, no punctuation at the end. Just the title.

User: ${userMessage.slice(0, 300)}
Assistant: ${assistantMessage.slice(0, 300)}`,
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    return text.trim().slice(0, 60) || userMessage.slice(0, 60);
  } catch {
    // Fallback to truncated user message
    return userMessage.slice(0, 60);
  }
}

// POST — append messages to a chat
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Verify ownership
  const chat = await prisma.chat.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!chat) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { messages } = await req.json();

  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "No messages provided" }, { status: 400 });
  }

  // Bulk insert messages
  await prisma.chatMessage.createMany({
    data: messages.map((msg: {
      role: string;
      content: string;
      toolCalls?: string[];
      emails?: Record<string, unknown>[];
      calendarEvents?: Record<string, unknown>[];
      driveFiles?: Record<string, unknown>[];
    }) => ({
      chatId: id,
      role: msg.role,
      content: msg.content,
      toolCalls: msg.toolCalls && msg.toolCalls.length > 0 ? (msg.toolCalls as Prisma.InputJsonValue) : undefined,
      emails: msg.emails && msg.emails.length > 0 ? (msg.emails as Prisma.InputJsonValue) : undefined,
      calendarEvents: msg.calendarEvents && msg.calendarEvents.length > 0 ? (msg.calendarEvents as Prisma.InputJsonValue) : undefined,
      driveFiles: msg.driveFiles && msg.driveFiles.length > 0 ? (msg.driveFiles as Prisma.InputJsonValue) : undefined,
    })),
  });

  // Update chat's updatedAt
  await prisma.chat.update({
    where: { id },
    data: { updatedAt: new Date() },
  });

  // Auto-generate title on first message pair (don't block the response)
  if (!chat.title) {
    const userMsg = messages.find((m: { role: string }) => m.role === "user");
    const assistantMsg = messages.find((m: { role: string }) => m.role === "assistant");

    if (userMsg && assistantMsg) {
      // Fire and forget — generate title in the background
      generateChatTitle(userMsg.content, assistantMsg.content).then(
        async (title) => {
          await prisma.chat.update({
            where: { id },
            data: { title },
          });
        }
      );
    }
  }

  return NextResponse.json({ ok: true });
}
