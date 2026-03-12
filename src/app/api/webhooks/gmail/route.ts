import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { anthropic } from "@/lib/anthropic";
import { loadAIContext, buildContextBlock } from "@/lib/settings-context";
import { buildSystemPrompt } from "@/lib/prompt";
import {
  getGmailAccessToken,
  listHistory,
  getMessage,
  getHeader,
  extractBody,
  createGmailDraft,
  shouldDraftReply,
} from "@/lib/gmail";

/**
 * Gmail Pub/Sub webhook endpoint.
 * Google Cloud Pub/Sub sends POST requests here when a user's mailbox changes.
 *
 * Pub/Sub payload format:
 * {
 *   "message": {
 *     "data": "<base64-encoded JSON>",  // { emailAddress, historyId }
 *     "messageId": "...",
 *     "publishTime": "..."
 *   },
 *   "subscription": "..."
 * }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const messageData = body.message?.data;

    if (!messageData) {
      return NextResponse.json({ error: "No message data" }, { status: 400 });
    }

    // Decode the Pub/Sub message
    const decoded = JSON.parse(
      Buffer.from(messageData, "base64").toString("utf-8")
    );
    const { emailAddress, historyId: newHistoryId } = decoded;

    if (!emailAddress) {
      return NextResponse.json(
        { error: "No email address in notification" },
        { status: 400 }
      );
    }

    // Find the user by email
    const user = await prisma.user.findUnique({
      where: { email: emailAddress.toLowerCase() },
      include: { gmailWatch: true },
    });

    if (!user || !user.gmailWatch?.active) {
      console.log(`[gmail-webhook] No active watch for ${emailAddress} (user found: ${!!user})`);
      return NextResponse.json({ ok: true });
    }

    const watch = user.gmailWatch;

    // Get a valid access token
    const accessToken = await getGmailAccessToken(user.id);

    // Fetch history since last known historyId
    const historyResult = await listHistory(accessToken, watch.historyId);

    // Update the stored historyId
    await prisma.gmailWatch.update({
      where: { id: watch.id },
      data: { historyId: String(newHistoryId) },
    });

    console.log(`[gmail-webhook] History entries: ${historyResult.history?.length ?? 0}, stored historyId: ${watch.historyId}, new historyId: ${newHistoryId}`);

    if (!historyResult.history?.length) {
      console.log(`[gmail-webhook] No history entries — nothing to process`);
      return NextResponse.json({ ok: true, processed: 0 });
    }

    // Collect new message IDs from INBOX
    const newMessageIds = new Set<string>();
    for (const entry of historyResult.history) {
      if (entry.messagesAdded) {
        for (const added of entry.messagesAdded) {
          if (added.message.labelIds?.includes("INBOX")) {
            newMessageIds.add(added.message.id);
          }
        }
      }
    }

    console.log(`[gmail-webhook] New INBOX messages: ${newMessageIds.size}`);

    if (newMessageIds.size === 0) {
      return NextResponse.json({ ok: true, processed: 0 });
    }

    // Load AI context once for all messages
    const aiContext = await loadAIContext();
    const contextBlock = buildContextBlock(aiContext);
    const systemPrompt = buildReplySystemPrompt(contextBlock || undefined);

    let draftsCreated = 0;

    // Process each new message (limit to 5 per webhook to avoid timeouts)
    const messageIds = Array.from(newMessageIds).slice(0, 5);
    for (const msgId of messageIds) {
      try {
        const message = await getMessage(accessToken, msgId);

        // Skip messages that shouldn't get auto-drafted
        const from = getHeader(message, "From") ?? "";
        if (!shouldDraftReply(message)) {
          console.log(`[gmail-webhook] Skipping message ${msgId} from ${from} (filtered out)`);
          continue;
        }

        // Skip if we already drafted a reply for this message
        const existingDraft = await prisma.emailDraft.findFirst({
          where: { gmailMessageId: msgId, createdById: user.id },
        });
        if (existingDraft) continue;

        // Extract email details
        const subject = getHeader(message, "Subject") ?? "(no subject)";
        const messageId = getHeader(message, "Message-ID") ?? "";
        const emailBody = extractBody(message);

        // Draft a reply using Claude
        const userMessage = buildReplyUserMessage({
          from,
          subject,
          body: emailBody,
        });

        const response = await anthropic.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 2048,
          system: systemPrompt,
          messages: [{ role: "user", content: userMessage }],
        });

        const responseText =
          response.content[0].type === "text"
            ? response.content[0].text
            : "";

        // Parse the response
        let replyBody: string;
        let replySubject: string;
        try {
          const cleaned = responseText
            .replace(/^```(?:json)?\n?/, "")
            .replace(/\n?```$/, "")
            .trim();
          const parsed = JSON.parse(cleaned);
          replyBody = parsed.body ?? responseText;
          replySubject = parsed.subject ?? `Re: ${subject}`;
        } catch {
          replyBody = responseText;
          replySubject = `Re: ${subject}`;
        }

        // Extract the reply-to address from the From header
        const replyTo = extractEmailAddress(from);
        if (!replyTo) continue;

        // Create a Gmail draft
        const draft = await createGmailDraft(accessToken, {
          to: replyTo,
          subject: replySubject,
          body: replyBody,
          threadId: message.threadId,
          inReplyTo: messageId,
          references: messageId,
        });

        // Save to our database
        await prisma.emailDraft.create({
          data: {
            subject: replySubject,
            body: replyBody,
            recipientTo: from,
            context: `Auto-reply to: ${subject}`,
            gmailMessageId: msgId,
            gmailThreadId: message.threadId,
            gmailDraftId: draft.id,
            createdById: user.id,
          },
        });

        console.log(`[gmail-webhook] Draft created for message ${msgId} from ${from}`);
        draftsCreated++;
      } catch (err) {
        // Log but don't fail the whole webhook for one message
        console.error(`Failed to process message ${msgId}:`, err);
      }
    }

    return NextResponse.json({ ok: true, processed: draftsCreated });
  } catch (error: any) {
    console.error("Gmail webhook error:", error);
    // Always return 200 to Pub/Sub to prevent retries on permanent failures
    return NextResponse.json({ ok: false, error: error.message });
  }
}

/**
 * Extract email address from a "Name <email>" formatted string.
 */
function extractEmailAddress(from: string): string | null {
  const match = from.match(/<([^>]+)>/);
  if (match) return match[1];
  // If no angle brackets, check if it's just an email
  if (from.includes("@")) return from.trim();
  return null;
}

/**
 * Build system prompt specifically for replying to incoming emails.
 */
function buildReplySystemPrompt(settingsContext?: string): string {
  const parts: string[] = [];

  parts.push(`You are an expert email reply assistant. Your job is to draft thoughtful, contextually appropriate replies to incoming emails.

## Core Rules
- Draft a reply that directly addresses the sender's email
- Match the company's configured writing tone and style
- Reference relevant company services, expertise, or case studies ONLY when naturally appropriate
- Be helpful and responsive — answer questions, acknowledge requests, provide next steps
- Keep replies concise and professional
- Never fabricate claims, metrics, or commitments not supported by the context provided
- If the email requires information you don't have, acknowledge it and suggest the user fill in the details before sending

## Output Format
Return the reply as structured JSON:
{
  "subject": "Re: [original subject]",
  "body": "Full reply body text",
  "notes": "Brief notes for the user on what to review/customize before sending"
}

## Important
- This is a DRAFT — the user will review and edit before sending
- Flag anything uncertain in the "notes" field
- Do NOT include greetings like "Dear" unless the tone calls for it — match modern email conventions
- Sign off naturally (the user's signature will be appended by Gmail)`);

  if (settingsContext) {
    parts.push(`
---

## AUTHORITATIVE Context from Settings

Use this information to personalize the reply with real company details when relevant.

${settingsContext}`);
  }

  return parts.join("\n");
}

/**
 * Build user message for reply drafting with the incoming email content.
 */
function buildReplyUserMessage(params: {
  from: string;
  subject: string;
  body: string;
}): string {
  // Truncate very long emails
  const truncatedBody =
    params.body.length > 8000
      ? params.body.slice(0, 8000) + "\n\n[... email truncated ...]"
      : params.body;

  return `## Incoming Email — Draft a Reply

**From:** ${params.from}
**Subject:** ${params.subject}

### Email Body
${truncatedBody}`;
}
