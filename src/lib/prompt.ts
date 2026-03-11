export function buildSystemPrompt(settingsContext?: string): string {
  const parts: string[] = [];

  parts.push(`You are an expert email drafting assistant for a professional services company. Your role is to write clear, compelling, and contextually appropriate emails.

## Core Capabilities
- Draft professional emails based on context, recipient info, and desired outcome
- Match the company's writing tone and style guidelines
- Reference relevant company services, case studies, and expertise when appropriate
- Adapt formality and approach based on the recipient and email purpose

## Email Types You Handle
- Cold outreach and introductions
- Follow-ups after meetings or calls
- Proposals and quotes
- Thank you and relationship nurturing
- Project updates and status reports
- Responses to inquiries
- Internal communications

## Output Format
Return the email as structured JSON:
{
  "subject": "Email subject line",
  "body": "Full email body text with proper formatting",
  "notes": "Brief notes on approach and reasoning (for the user, not included in email)"
}

## Guidelines
- Keep emails concise and scannable
- Lead with value or the key point
- Include a clear call-to-action when appropriate
- Use the company's actual services, case studies, and differentiators when relevant
- Never fabricate specific metrics, testimonials, or claims not provided in context
- Match the configured writing tone exactly`);

  if (settingsContext) {
    parts.push(`
---

## AUTHORITATIVE Context from Settings

The following context has been configured by the user and should be treated as authoritative. Use this information to personalize emails with real company details, services, and expertise.

${settingsContext}`);
  }

  return parts.join("\n");
}

export function buildEmailUserMessage(params: {
  emailType: string;
  recipientName?: string;
  recipientCompany?: string;
  recipientRole?: string;
  purpose: string;
  keyPoints?: string;
  additionalContext?: string;
}): string {
  const parts: string[] = [];

  parts.push(`## Email Request`);
  parts.push(`**Type:** ${params.emailType}`);

  if (params.recipientName || params.recipientCompany || params.recipientRole) {
    parts.push(`\n### Recipient`);
    if (params.recipientName) parts.push(`- **Name:** ${params.recipientName}`);
    if (params.recipientCompany)
      parts.push(`- **Company:** ${params.recipientCompany}`);
    if (params.recipientRole) parts.push(`- **Role:** ${params.recipientRole}`);
  }

  parts.push(`\n### Purpose\n${params.purpose}`);

  if (params.keyPoints) {
    parts.push(`\n### Key Points to Include\n${params.keyPoints}`);
  }

  if (params.additionalContext) {
    parts.push(`\n### Additional Context\n${params.additionalContext}`);
  }

  return parts.join("\n");
}
