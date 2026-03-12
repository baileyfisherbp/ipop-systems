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
    where: { createdById: session.user.id },
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

  // Generate draft with AI
  const draftBody = await generateEmailDraft(session.user.id, {
    from,
    subject,
    body: body || snippet || "",
  });

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
      createdById: session.user.id,
      gmailMessageId: messageId,
      gmailThreadId: threadId || undefined,
      gmailDraftId: gmailDraft.data.id || undefined,
      recipientTo: from,
      subject,
      body: draftBody,
      context: body || snippet || undefined,
    },
  });

  return NextResponse.json(draft);
}
