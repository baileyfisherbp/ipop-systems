import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGmailClient } from "@/lib/google";
import { generateEmailDraft } from "@/lib/ai";

// GET — list all drafts for the user
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const drafts = await prisma.emailDraft.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(drafts);
}

// POST — generate a draft reply for an email
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { messageId, threadId, from, subject, snippet, body } =
    await req.json();

  // Get integration contexts
  const integrations = await prisma.integration.findMany({
    where: { userId: session.user.id, enabled: true },
  });

  const integrationContexts = integrations.map((i) => ({
    type: i.type,
    name: i.name,
    data: i.config
      ? `Connected ${i.name} integration available`
      : undefined,
  }));

  // Generate draft with AI
  const draftBody = await generateEmailDraft(
    session.user.id,
    { from, subject, body: body || snippet || "" },
    integrationContexts
  );

  // Create draft in Gmail
  const gmail = await getGmailClient(session.user.id);
  const rawMessage = [
    `To: ${from}`,
    `Subject: Re: ${subject}`,
    `In-Reply-To: ${messageId}`,
    `References: ${messageId}`,
    "",
    draftBody,
  ].join("\n");

  const encodedMessage = Buffer.from(rawMessage)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const gmailDraft = await gmail.users.drafts.create({
    userId: "me",
    requestBody: {
      message: {
        raw: encodedMessage,
        threadId,
      },
    },
  });

  // Save to database
  const draft = await prisma.emailDraft.create({
    data: {
      userId: session.user.id,
      gmailMessageId: messageId,
      threadId: threadId || "",
      originalFrom: from,
      originalSubject: subject,
      originalSnippet: snippet,
      originalBody: body,
      draftBody,
      draftGmailId: gmailDraft.data.id || undefined,
      status: "sent_to_gmail",
    },
  });

  return NextResponse.json(draft);
}
