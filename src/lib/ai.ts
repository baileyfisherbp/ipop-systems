import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

const anthropic = new Anthropic();

interface EmailForDraft {
  from: string;
  subject: string;
  body: string;
  threadMessages?: string[];
}

interface IntegrationContext {
  type: string;
  name: string;
  data?: string;
}

export async function generateEmailDraft(
  userId: string,
  email: EmailForDraft,
  integrationContexts: IntegrationContext[] = []
) {
  const userContext = await prisma.userContext.findUnique({
    where: { userId },
  });

  let systemPrompt = `You are an email assistant. Draft a professional reply to the email below.

Write ONLY the email body — no subject line, no metadata, no "Subject:" prefix. Start directly with the greeting or response content.`;

  if (userContext) {
    systemPrompt += "\n\nContext about the user:";
    if (userContext.companyName)
      systemPrompt += `\n- Company: ${userContext.companyName}`;
    if (userContext.companyDescription)
      systemPrompt += `\n- About the company: ${userContext.companyDescription}`;
    if (userContext.role) systemPrompt += `\n- Their role: ${userContext.role}`;
    if (userContext.writingStyle)
      systemPrompt += `\n- Writing style preferences: ${userContext.writingStyle}`;
    if (userContext.signatureBlock)
      systemPrompt += `\n- Email signature to use:\n${userContext.signatureBlock}`;
    if (userContext.additionalNotes)
      systemPrompt += `\n- Additional notes: ${userContext.additionalNotes}`;
  }

  if (integrationContexts.length > 0) {
    systemPrompt += "\n\nAdditional context from connected tools:";
    for (const ctx of integrationContexts) {
      systemPrompt += `\n\n[${ctx.name}]:\n${ctx.data || "No data available"}`;
    }
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
