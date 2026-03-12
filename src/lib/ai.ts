import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

const anthropic = new Anthropic();

interface EmailForDraft {
  from: string;
  subject: string;
  body: string;
  threadMessages?: string[];
}

export async function generateEmailDraft(
  userId: string,
  email: EmailForDraft
) {
  const companySettings = await prisma.companySettings.findUnique({
    where: { id: "default" },
  });

  let systemPrompt = `You are an email assistant. Draft a professional reply to the email below.

Write ONLY the email body — no subject line, no metadata, no "Subject:" prefix. Start directly with the greeting or response content.`;

  if (companySettings) {
    systemPrompt += "\n\nContext about the company:";
    if (companySettings.companyName)
      systemPrompt += `\n- Company: ${companySettings.companyName}`;
    if (companySettings.companyDescription)
      systemPrompt += `\n- About the company: ${companySettings.companyDescription}`;
    if (companySettings.services)
      systemPrompt += `\n- Services: ${companySettings.services}`;
    if (companySettings.writingStyle)
      systemPrompt += `\n- Writing style preferences: ${companySettings.writingStyle}`;
    if (companySettings.writingTone)
      systemPrompt += `\n- Writing tone: ${companySettings.writingTone}`;
    if (companySettings.additionalContext)
      systemPrompt += `\n- Additional notes: ${companySettings.additionalContext}`;
  }

  let userMessage = `From: ${email.from}\nSubject: ${email.subject}\n\n${email.body}`;

  if (email.threadMessages && email.threadMessages.length > 0) {
    userMessage += "\n\n--- Previous messages in thread ---\n";
    userMessage += email.threadMessages.join("\n---\n");
  }

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  return textBlock?.text || "";
}
