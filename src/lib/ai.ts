import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { getCalendarClient, getDriveClient } from "@/lib/google";

const anthropic = new Anthropic();

interface EmailForDraft {
  from: string;
  subject: string;
  body: string;
  threadMessages?: string[];
}

// Fetch upcoming calendar events to give the AI scheduling context
async function fetchCalendarContext(userId: string): Promise<string> {
  try {
    const calendar = await getCalendarClient(userId);
    const now = new Date();
    const twoWeeksOut = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    const res = await calendar.events.list({
      calendarId: "primary",
      timeMin: now.toISOString(),
      timeMax: twoWeeksOut.toISOString(),
      maxResults: 20,
      singleEvents: true,
      orderBy: "startTime",
    });

    const events = res.data.items ?? [];
    if (events.length === 0) return "";

    const lines = events.map((e) => {
      const start = e.start?.dateTime || e.start?.date || "";
      const end = e.end?.dateTime || e.end?.date || "";
      const attendees = e.attendees
        ?.map((a) => a.displayName || a.email)
        .join(", ");
      let line = `- ${e.summary} | ${start} → ${end}`;
      if (e.location) line += ` | Location: ${e.location}`;
      if (attendees) line += ` | Attendees: ${attendees}`;
      return line;
    });

    return `\n\nUPCOMING CALENDAR EVENTS (next 2 weeks):\n${lines.join("\n")}`;
  } catch {
    return "";
  }
}

// Search Drive for files related to the email subject/content
async function fetchDriveContext(
  userId: string,
  searchTerms: string
): Promise<string> {
  try {
    const drive = await getDriveClient(userId);

    // Extract meaningful keywords from subject (strip Re:, Fwd:, etc.)
    const cleaned = searchTerms
      .replace(/^(re|fwd|fw):\s*/gi, "")
      .trim();
    if (!cleaned || cleaned.length < 3) return "";

    const driveQuery = `fullText contains '${cleaned.replace(/'/g, "\\'")}' or name contains '${cleaned.replace(/'/g, "\\'")}'`;

    const res = await drive.files.list({
      q: `${driveQuery} and trashed = false`,
      pageSize: 5,
      fields:
        "files(id, name, mimeType, modifiedTime, webViewLink)",
      orderBy: "modifiedTime desc",
    });

    const files = res.data.files ?? [];
    if (files.length === 0) return "";

    const lines = files.map(
      (f) =>
        `- ${f.name} (${f.mimeType?.split(".").pop() || "file"}) | Modified: ${f.modifiedTime} | ${f.webViewLink}`
    );

    return `\n\nRELATED GOOGLE DRIVE FILES:\n${lines.join("\n")}`;
  } catch {
    return "";
  }
}

export async function generateEmailDraft(
  userId: string,
  email: EmailForDraft
) {
  // Fetch company settings, calendar, and drive context in parallel
  const [companySettings, calendarContext, driveContext] = await Promise.all([
    prisma.companySettings.findUnique({ where: { id: "default" } }),
    fetchCalendarContext(userId),
    fetchDriveContext(userId, email.subject),
  ]);

  const now = new Date();
  const todayStr = now.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  let systemPrompt = `You are an email assistant. Draft a professional reply to the email below.

Write ONLY the email body — no subject line, no metadata, no "Subject:" prefix. Start directly with the greeting or response content.

TODAY'S DATE: ${todayStr}. Use this to resolve relative date references.`;

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

  // Append live context from Google Workspace
  if (calendarContext) {
    systemPrompt += calendarContext;
    systemPrompt +=
      "\nUse this calendar data to inform your reply if the email references meetings, scheduling, or availability.";
  }
  if (driveContext) {
    systemPrompt += driveContext;
    systemPrompt +=
      "\nReference these files if the email mentions documents, reports, or shared files.";
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
