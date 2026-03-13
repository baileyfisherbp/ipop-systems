import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/lib/auth";
import { getGmailClient, getDriveClient, getCalendarClient } from "@/lib/google";
import { extractFileContent } from "@/lib/drive-extract";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

const client = new Anthropic();

// ---------- Tool definitions grouped by category ----------

const GMAIL_TOOLS: Anthropic.Tool[] = [
  {
    name: "gmail_search",
    description:
      "Search the user's Gmail inbox. Returns matching emails with subject, sender, snippet, and date.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description:
            "Gmail search query (e.g., 'from:john@example.com', 'subject:invoice', 'is:unread', 'newer_than:7d')",
        },
        max_results: {
          type: "number",
          description: "Maximum number of results to return (default 10, max 20)",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "gmail_read_message",
    description:
      "Read the full content of a specific Gmail message by its ID.",
    input_schema: {
      type: "object" as const,
      properties: {
        message_id: {
          type: "string",
          description: "The Gmail message ID to read",
        },
      },
      required: ["message_id"],
    },
  },
  {
    name: "gmail_read_thread",
    description:
      "Read all messages in a Gmail thread to see the full conversation.",
    input_schema: {
      type: "object" as const,
      properties: {
        thread_id: {
          type: "string",
          description: "The Gmail thread ID to read",
        },
      },
      required: ["thread_id"],
    },
  },
  {
    name: "gmail_create_draft",
    description:
      "Create a draft email in the user's Gmail. Always confirm the content with the user before creating.",
    input_schema: {
      type: "object" as const,
      properties: {
        to: { type: "string", description: "Recipient email address" },
        subject: { type: "string", description: "Email subject line" },
        body: { type: "string", description: "Email body text" },
        thread_id: {
          type: "string",
          description: "Thread ID to reply to (optional)",
        },
        in_reply_to: {
          type: "string",
          description: "Message ID being replied to (optional)",
        },
      },
      required: ["to", "subject", "body"],
    },
  },
];

const CALENDAR_TOOLS: Anthropic.Tool[] = [
  {
    name: "calendar_list_events",
    description:
      "List upcoming calendar events. Returns events within a date range with title, time, location, and attendees.",
    input_schema: {
      type: "object" as const,
      properties: {
        time_min: {
          type: "string",
          description: "Start of date range in ISO 8601 format (e.g., '2026-03-12T00:00:00Z'). Defaults to now.",
        },
        time_max: {
          type: "string",
          description: "End of date range in ISO 8601 format. Defaults to 7 days from now.",
        },
        max_results: {
          type: "number",
          description: "Maximum number of events to return (default 10, max 50)",
        },
        query: {
          type: "string",
          description: "Free-text search term to filter events by title, description, or location",
        },
      },
      required: [],
    },
  },
  {
    name: "calendar_get_event",
    description: "Get full details of a specific calendar event by its ID.",
    input_schema: {
      type: "object" as const,
      properties: {
        event_id: {
          type: "string",
          description: "The Google Calendar event ID",
        },
      },
      required: ["event_id"],
    },
  },
  {
    name: "calendar_create_event",
    description:
      "Create a new calendar event. Always confirm the details with the user before creating.",
    input_schema: {
      type: "object" as const,
      properties: {
        summary: { type: "string", description: "Event title" },
        description: { type: "string", description: "Event description (optional)" },
        start: {
          type: "string",
          description: "Start time in ISO 8601 format (e.g., '2026-03-15T10:00:00-07:00')",
        },
        end: {
          type: "string",
          description: "End time in ISO 8601 format",
        },
        location: { type: "string", description: "Event location (optional)" },
        attendees: {
          type: "array",
          items: { type: "string" },
          description: "Array of attendee email addresses (optional)",
        },
      },
      required: ["summary", "start", "end"],
    },
  },
];

const DRIVE_TOOLS: Anthropic.Tool[] = [
  {
    name: "drive_search",
    description:
      "Search for files in the user's Google Drive. Returns file names, types, owners, and modification dates.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description:
            "Search query. Supports name search (e.g., 'Q4 Report'), file type filtering (e.g., 'type:spreadsheet'), and folder search. Use natural language.",
        },
        max_results: {
          type: "number",
          description: "Maximum number of results to return (default 10, max 30)",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "drive_get_file",
    description:
      "Get metadata and full text content of a specific Google Drive file by its ID. Supports reading Google Docs, Sheets, Slides, PDFs, Word (.docx), Excel (.xlsx), PowerPoint (.pptx), HTML, text, CSV, JSON, XML, Markdown, and more. Returns extracted text content for all supported formats.",
    input_schema: {
      type: "object" as const,
      properties: {
        file_id: {
          type: "string",
          description: "The Google Drive file ID",
        },
      },
      required: ["file_id"],
    },
  },
  {
    name: "drive_list_folder",
    description:
      "List files inside a specific Google Drive folder.",
    input_schema: {
      type: "object" as const,
      properties: {
        folder_id: {
          type: "string",
          description: "The Google Drive folder ID. Use 'root' for the top-level Drive.",
        },
        max_results: {
          type: "number",
          description: "Maximum number of results to return (default 20, max 50)",
        },
      },
      required: ["folder_id"],
    },
  },
];

const SCHEDULING_TOOLS: Anthropic.Tool[] = [
  {
    name: "scheduling_list_shifts",
    description:
      "List staff shifts for a date range. Returns who is working, when, and at which location.",
    input_schema: {
      type: "object" as const,
      properties: {
        start_date: {
          type: "string",
          description:
            "Start date in YYYY-MM-DD format (e.g., '2026-03-12'). Defaults to today.",
        },
        end_date: {
          type: "string",
          description:
            "End date in YYYY-MM-DD format. Defaults to 7 days from start_date.",
        },
        location: {
          type: "string",
          description:
            "Filter by location (e.g., 'Burnaby', 'Surrey'). Omit to show all locations.",
        },
        staff_name: {
          type: "string",
          description:
            "Filter by staff member name (partial match). Omit to show all staff.",
        },
      },
      required: [],
    },
  },
  {
    name: "scheduling_get_staff_today",
    description:
      "Quick lookup: who is working today (or a specific date) across all locations.",
    input_schema: {
      type: "object" as const,
      properties: {
        date: {
          type: "string",
          description:
            "Date to check in YYYY-MM-DD format. Defaults to today.",
        },
      },
      required: [],
    },
  },
];

// Maps tool category IDs (from the frontend) to tool definitions
const TOOL_CATEGORY_MAP: Record<string, Anthropic.Tool[]> = {
  gmail: GMAIL_TOOLS,
  calendar: CALENDAR_TOOLS,
  drive: DRIVE_TOOLS,
  scheduling: SCHEDULING_TOOLS,
};

// ---------- Tool execution ----------

async function executeToolCall(
  toolName: string,
  input: Record<string, unknown>,
  userId: string
): Promise<string> {
  try {
    // --- Gmail tools ---
    if (toolName.startsWith("gmail_")) {
      const gmail = await getGmailClient(userId);

      switch (toolName) {
        case "gmail_search": {
          const query = input.query as string;
          const maxResults = Math.min((input.max_results as number) || 10, 20);

          const res = await gmail.users.messages.list({
            userId: "me",
            q: query,
            maxResults,
          });

          if (!res.data.messages?.length) {
            return JSON.stringify({ results: [], message: "No emails found matching that query." });
          }

          const messages = await Promise.all(
            res.data.messages.map(async (msg) => {
              const full = await gmail.users.messages.get({
                userId: "me",
                id: msg.id!,
                format: "metadata",
                metadataHeaders: ["From", "To", "Subject", "Date"],
              });
              const headers = full.data.payload?.headers ?? [];
              const getHeader = (name: string) =>
                headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? "";

              return {
                id: msg.id,
                threadId: full.data.threadId,
                from: getHeader("From"),
                to: getHeader("To"),
                subject: getHeader("Subject"),
                date: getHeader("Date"),
                snippet: full.data.snippet,
                labels: full.data.labelIds,
              };
            })
          );

          return JSON.stringify({ results: messages });
        }

        case "gmail_read_message": {
          const messageId = input.message_id as string;
          const full = await gmail.users.messages.get({
            userId: "me",
            id: messageId,
            format: "full",
          });

          const headers = full.data.payload?.headers ?? [];
          const getHeader = (name: string) =>
            headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? "";

          let body = "";
          const extractText = (part: { mimeType?: string; body?: { data?: string }; parts?: Array<{ mimeType?: string; body?: { data?: string }; parts?: unknown[] }> }) => {
            if (part.mimeType === "text/plain" && part.body?.data) {
              body += Buffer.from(part.body.data, "base64url").toString("utf-8");
            }
            if (part.parts) {
              for (const p of part.parts) extractText(p as typeof part);
            }
          };

          if (full.data.payload) {
            extractText(full.data.payload as Parameters<typeof extractText>[0]);
          }

          if (!body && full.data.snippet) {
            body = full.data.snippet;
          }

          return JSON.stringify({
            id: messageId,
            threadId: full.data.threadId,
            from: getHeader("From"),
            to: getHeader("To"),
            subject: getHeader("Subject"),
            date: getHeader("Date"),
            body: body.slice(0, 10000),
          });
        }

        case "gmail_read_thread": {
          const threadId = input.thread_id as string;
          const thread = await gmail.users.threads.get({
            userId: "me",
            id: threadId,
            format: "full",
          });

          const messages = (thread.data.messages ?? []).map((msg) => {
            const headers = msg.payload?.headers ?? [];
            const getHeader = (name: string) =>
              headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? "";

            let body = "";
            const extractText = (part: { mimeType?: string; body?: { data?: string }; parts?: Array<{ mimeType?: string; body?: { data?: string }; parts?: unknown[] }> }) => {
              if (part.mimeType === "text/plain" && part.body?.data) {
                body += Buffer.from(part.body.data, "base64url").toString("utf-8");
              }
              if (part.parts) {
                for (const p of part.parts) extractText(p as typeof part);
              }
            };

            if (msg.payload) {
              extractText(msg.payload as Parameters<typeof extractText>[0]);
            }
            if (!body && msg.snippet) body = msg.snippet;

            return {
              id: msg.id,
              from: getHeader("From"),
              to: getHeader("To"),
              subject: getHeader("Subject"),
              date: getHeader("Date"),
              body: body.slice(0, 5000),
            };
          });

          return JSON.stringify({ threadId, messages });
        }

        case "gmail_create_draft": {
          const to = input.to as string;
          const subject = input.subject as string;
          const body = input.body as string;
          const threadId = input.thread_id as string | undefined;
          const inReplyTo = input.in_reply_to as string | undefined;

          const rawParts = [
            `To: ${to}`,
            `Subject: ${subject}`,
          ];
          if (inReplyTo) {
            rawParts.push(`In-Reply-To: ${inReplyTo}`);
            rawParts.push(`References: ${inReplyTo}`);
          }
          rawParts.push("", body);

          const raw = Buffer.from(rawParts.join("\n"))
            .toString("base64")
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=+$/, "");

          const draft = await gmail.users.drafts.create({
            userId: "me",
            requestBody: {
              message: {
                raw,
                ...(threadId && { threadId }),
              },
            },
          });

          return JSON.stringify({
            status: "Draft created",
            draftId: draft.data.id,
            to,
            subject,
          });
        }
      }
    }

    // --- Calendar tools ---
    if (toolName.startsWith("calendar_")) {
      const calendar = await getCalendarClient(userId);

      switch (toolName) {
        case "calendar_list_events": {
          const now = new Date();
          const timeMin = (input.time_min as string) || now.toISOString();
          const defaultMax = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          const timeMax = (input.time_max as string) || defaultMax.toISOString();
          const maxResults = Math.min((input.max_results as number) || 10, 50);
          const query = input.query as string | undefined;

          const res = await calendar.events.list({
            calendarId: "primary",
            timeMin,
            timeMax,
            maxResults,
            singleEvents: true,
            orderBy: "startTime",
            ...(query && { q: query }),
          });

          const events = (res.data.items ?? []).map((event) => ({
            id: event.id,
            summary: event.summary,
            description: event.description?.slice(0, 500),
            start: event.start?.dateTime || event.start?.date,
            end: event.end?.dateTime || event.end?.date,
            location: event.location,
            status: event.status,
            organizer: event.organizer?.email,
            attendees: event.attendees?.map((a) => ({
              email: a.email,
              name: a.displayName,
              status: a.responseStatus,
            })),
            htmlLink: event.htmlLink,
          }));

          return JSON.stringify({
            results: events,
            message: events.length === 0 ? "No events found in that date range." : undefined,
          });
        }

        case "calendar_get_event": {
          const eventId = input.event_id as string;
          const event = await calendar.events.get({
            calendarId: "primary",
            eventId,
          });

          return JSON.stringify({
            id: event.data.id,
            summary: event.data.summary,
            description: event.data.description,
            start: event.data.start?.dateTime || event.data.start?.date,
            end: event.data.end?.dateTime || event.data.end?.date,
            location: event.data.location,
            status: event.data.status,
            organizer: event.data.organizer?.email,
            attendees: event.data.attendees?.map((a) => ({
              email: a.email,
              name: a.displayName,
              status: a.responseStatus,
            })),
            recurrence: event.data.recurrence,
            htmlLink: event.data.htmlLink,
            created: event.data.created,
            updated: event.data.updated,
          });
        }

        case "calendar_create_event": {
          const event = await calendar.events.insert({
            calendarId: "primary",
            requestBody: {
              summary: input.summary as string,
              description: (input.description as string) || undefined,
              start: {
                dateTime: input.start as string,
              },
              end: {
                dateTime: input.end as string,
              },
              location: (input.location as string) || undefined,
              attendees: (input.attendees as string[] | undefined)?.map((email) => ({ email })),
            },
          });

          return JSON.stringify({
            status: "Event created",
            eventId: event.data.id,
            summary: event.data.summary,
            start: event.data.start?.dateTime,
            end: event.data.end?.dateTime,
            htmlLink: event.data.htmlLink,
          });
        }
      }
    }

    // --- Drive tools ---
    if (toolName.startsWith("drive_")) {
      const drive = await getDriveClient(userId);

      switch (toolName) {
        case "drive_search": {
          const query = input.query as string;
          const maxResults = Math.min((input.max_results as number) || 10, 30);

          // Build Drive query from natural language
          const driveQuery = `fullText contains '${query.replace(/'/g, "\\'")}'  or name contains '${query.replace(/'/g, "\\'")}'`;

          const res = await drive.files.list({
            q: `${driveQuery} and trashed = false`,
            pageSize: maxResults,
            fields: "files(id, name, mimeType, modifiedTime, size, owners, webViewLink, parents)",
            orderBy: "modifiedTime desc",
          });

          const files = (res.data.files ?? []).map((file) => ({
            id: file.id,
            name: file.name,
            mimeType: file.mimeType,
            type: mimeTypeToLabel(file.mimeType),
            modifiedTime: file.modifiedTime,
            size: file.size ? formatFileSize(Number(file.size)) : undefined,
            owner: file.owners?.[0]?.displayName || file.owners?.[0]?.emailAddress,
            webViewLink: file.webViewLink,
          }));

          return JSON.stringify({
            results: files,
            message: files.length === 0 ? "No files found matching that query." : undefined,
          });
        }

        case "drive_get_file": {
          const fileId = input.file_id as string;

          const meta = await drive.files.get({
            fileId,
            fields: "id, name, mimeType, modifiedTime, size, owners, webViewLink, description, createdTime",
          });

          // Extract text content from any supported file type
          const content = meta.data.mimeType
            ? await extractFileContent(drive, fileId, meta.data.mimeType)
            : undefined;

          return JSON.stringify({
            id: meta.data.id,
            name: meta.data.name,
            mimeType: meta.data.mimeType,
            type: mimeTypeToLabel(meta.data.mimeType),
            modifiedTime: meta.data.modifiedTime,
            createdTime: meta.data.createdTime,
            size: meta.data.size ? formatFileSize(Number(meta.data.size)) : undefined,
            owner: meta.data.owners?.[0]?.displayName || meta.data.owners?.[0]?.emailAddress,
            description: meta.data.description,
            webViewLink: meta.data.webViewLink,
            content,
          });
        }

        case "drive_list_folder": {
          const folderId = input.folder_id as string;
          const maxResults = Math.min((input.max_results as number) || 20, 50);

          const res = await drive.files.list({
            q: `'${folderId}' in parents and trashed = false`,
            pageSize: maxResults,
            fields: "files(id, name, mimeType, modifiedTime, size, webViewLink)",
            orderBy: "folder,name",
          });

          const files = (res.data.files ?? []).map((file) => ({
            id: file.id,
            name: file.name,
            mimeType: file.mimeType,
            type: mimeTypeToLabel(file.mimeType),
            modifiedTime: file.modifiedTime,
            size: file.size ? formatFileSize(Number(file.size)) : undefined,
            webViewLink: file.webViewLink,
          }));

          return JSON.stringify({ folderId, results: files });
        }
      }
    }

    // --- Scheduling tools ---
    if (toolName.startsWith("scheduling_")) {
      switch (toolName) {
        case "scheduling_list_shifts": {
          const now = new Date();
          const startStr = (input.start_date as string) || now.toISOString().slice(0, 10);
          const startDate = new Date(startStr + "T00:00:00");
          const endStr =
            (input.end_date as string) ||
            new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000)
              .toISOString()
              .slice(0, 10);
          const endDate = new Date(endStr + "T23:59:59");
          const location = input.location as string | undefined;
          const staffName = input.staff_name as string | undefined;

          const where: Record<string, unknown> = {
            date: { gte: startDate, lte: endDate },
          };
          if (location) where.location = location;

          const shifts = await prisma.shift.findMany({
            where,
            include: { user: { select: { name: true, email: true } } },
            orderBy: [{ date: "asc" }, { startTime: "asc" }],
          });

          let filtered = shifts;
          if (staffName) {
            const lower = staffName.toLowerCase();
            filtered = shifts.filter(
              (s) =>
                s.user.name?.toLowerCase().includes(lower) ||
                s.user.email?.toLowerCase().includes(lower)
            );
          }

          const results = filtered.map((s) => ({
            id: s.id,
            staff: s.user.name || s.user.email,
            date: s.date.toISOString().slice(0, 10),
            startTime: s.startTime,
            endTime: s.endTime,
            location: s.location,
            note: s.note,
          }));

          return JSON.stringify({
            results,
            dateRange: { start: startStr, end: endStr },
            message:
              results.length === 0
                ? "No shifts found for that date range."
                : undefined,
          });
        }

        case "scheduling_get_staff_today": {
          const dateStr =
            (input.date as string) || new Date().toISOString().slice(0, 10);
          const dayStart = new Date(dateStr + "T00:00:00");
          const dayEnd = new Date(dateStr + "T23:59:59");

          const shifts = await prisma.shift.findMany({
            where: { date: { gte: dayStart, lte: dayEnd } },
            include: { user: { select: { name: true, email: true } } },
            orderBy: [{ location: "asc" }, { startTime: "asc" }],
          });

          const results = shifts.map((s) => ({
            staff: s.user.name || s.user.email,
            startTime: s.startTime,
            endTime: s.endTime,
            location: s.location,
            note: s.note,
          }));

          return JSON.stringify({
            date: dateStr,
            results,
            message:
              results.length === 0
                ? `No one is scheduled for ${dateStr}.`
                : undefined,
          });
        }
      }
    }

    return JSON.stringify({ error: `Unknown tool: ${toolName}` });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const lower = message.toLowerCase();

    // Detect expired / revoked OAuth tokens and give the user an actionable message
    if (
      lower.includes("invalid_grant") ||
      lower.includes("token has been expired or revoked") ||
      lower.includes("token refresh") ||
      lower.includes("unauthorized") ||
      lower.includes("401") ||
      lower.includes("google account not connected")
    ) {
      return JSON.stringify({
        error:
          "Your Google session has expired. Please sign out and sign back in to reconnect your account.",
        auth_error: true,
      });
    }

    return JSON.stringify({ error: `Tool execution failed: ${message}` });
  }
}

// ---------- Helpers ----------

function mimeTypeToLabel(mimeType?: string | null): string {
  if (!mimeType) return "Unknown";
  const map: Record<string, string> = {
    "application/vnd.google-apps.document": "Google Doc",
    "application/vnd.google-apps.spreadsheet": "Google Sheet",
    "application/vnd.google-apps.presentation": "Google Slides",
    "application/vnd.google-apps.folder": "Folder",
    "application/vnd.google-apps.form": "Google Form",
    "application/pdf": "PDF",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "Word Document",
    "application/msword": "Word Document (Legacy)",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "Excel Spreadsheet",
    "application/vnd.ms-excel": "Excel Spreadsheet (Legacy)",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "PowerPoint",
    "application/vnd.ms-powerpoint": "PowerPoint (Legacy)",
    "application/rtf": "Rich Text",
    "text/html": "HTML",
    "text/plain": "Text File",
    "text/csv": "CSV",
    "text/markdown": "Markdown",
    "text/xml": "XML",
    "application/json": "JSON",
    "application/xml": "XML",
    "application/javascript": "JavaScript",
    "image/png": "PNG Image",
    "image/jpeg": "JPEG Image",
    "image/gif": "GIF Image",
    "image/svg+xml": "SVG Image",
    "application/zip": "ZIP Archive",
  };
  return map[mimeType] || mimeType.split("/").pop() || "File";
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

// ---------- System prompt ----------

function buildSystemPrompt(location: string, user: { name?: string | null; email?: string | null }): string {
  const now = new Date();
  const todayStr = now.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
  const timeStr = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });

  const userLine = user.name
    ? `CURRENT USER: ${user.name}${user.email ? ` (${user.email})` : ""}`
    : user.email
      ? `CURRENT USER: ${user.email}`
      : "";

  return `You are IPOP's internal AI operations agent. IPOP (Inclusive Place of Pickleball) is a Canadian multi-location indoor pickleball facility with locations in Burnaby, Surrey, Penticton, Victoria, and Nanaimo.

${userLine ? `${userLine}\n` : ""}TODAY'S DATE: ${todayStr}, ${timeStr}. Always use this date to resolve relative references like "today", "tomorrow", "Monday", "next week", etc.

ACTIVE LOCATION CONTEXT: ${location === "All Locations" ? "You have visibility across all IPOP locations." : `You are focused on the ${location} location.`}

You have access to the user's Google Workspace and internal systems via tools. You can:
- Search their inbox for emails, read messages and threads, and create drafts
- View and create calendar events
- Search, browse, and read files from Google Drive
- View staff shift schedules across all IPOP locations

BEHAVIOR:
- Be concise and direct. This is an internal ops tool, not a customer chat.
- IMPORTANT: Email, calendar, and Drive data from tools is automatically displayed as styled, clickable cards in the UI. Do NOT repeat the raw details (subject, from, date, body, event times, file names, etc.) in your text response. Instead, provide a brief summary or context about what you found (e.g., "Found 3 emails from John about the invoice", "Here are your meetings for tomorrow", "Found the budget spreadsheet"). The cards will show the full details with clickable links.
- If asked to draft or reply to an email, show the draft content to the user and confirm before creating it in Gmail.
- If asked to create a calendar event, confirm the details with the user before creating it.
- Only use the tools you actually have access to. Do not claim to have access to tools you don't have.`;
}

// ---------- Route handler ----------

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.user.id;
  if (!userId) {
    return new Response("No user ID", { status: 401 });
  }

  const { messages, location, enabledTools } = await req.json();

  // Build tool list from enabled categories
  const enabledSet: Set<string> = enabledTools
    ? new Set(enabledTools as string[])
    : new Set(Object.keys(TOOL_CATEGORY_MAP));

  const activeTools: Anthropic.Tool[] = [];
  for (const [category, tools] of Object.entries(TOOL_CATEGORY_MAP)) {
    if (enabledSet.has(category)) {
      activeTools.push(...tools);
    }
  }

  const systemPrompt = buildSystemPrompt(location || "All Locations", session.user);

  let currentMessages = [...messages];

  const stream = client.messages.stream({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    system: systemPrompt,
    messages: currentMessages,
    tools: activeTools,
  });

  const readable = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      const processStream = async (
        messageStream: ReturnType<typeof client.messages.stream>
      ) => {
        const toolUseBlocks: Array<{
          id: string;
          name: string;
          input: Record<string, unknown>;
        }> = [];
        let currentToolBlock: {
          id: string;
          name: string;
          inputJson: string;
        } | null = null;

        for await (const event of messageStream) {
          const data = JSON.stringify(event);
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));

          if (
            event.type === "content_block_start" &&
            event.content_block?.type === "tool_use"
          ) {
            currentToolBlock = {
              id: event.content_block.id,
              name: event.content_block.name,
              inputJson: "",
            };
          }

          if (
            event.type === "content_block_delta" &&
            event.delta?.type === "input_json_delta" &&
            currentToolBlock
          ) {
            currentToolBlock.inputJson += event.delta.partial_json;
          }

          if (event.type === "content_block_stop" && currentToolBlock) {
            let parsedInput: Record<string, unknown> = {};
            try {
              parsedInput = JSON.parse(currentToolBlock.inputJson || "{}");
            } catch {
              // empty input
            }
            toolUseBlocks.push({
              id: currentToolBlock.id,
              name: currentToolBlock.name,
              input: parsedInput,
            });
            currentToolBlock = null;
          }
        }

        if (toolUseBlocks.length > 0) {
          const assistantContent = toolUseBlocks.map((block) => ({
            type: "tool_use" as const,
            id: block.id,
            name: block.name,
            input: block.input,
          }));

          // Execute real tool calls
          const toolResults: Anthropic.ToolResultBlockParam[] =
            await Promise.all(
              toolUseBlocks.map(async (block) => {
                const result = await executeToolCall(block.name, block.input, userId);

                // Emit auth error event so the frontend can show a sign-out prompt
                try {
                  const parsed = JSON.parse(result);
                  if (parsed.auth_error) {
                    const authEvent = JSON.stringify({
                      type: "auth_error",
                      message: parsed.error,
                    });
                    controller.enqueue(encoder.encode(`data: ${authEvent}\n\n`));
                  }
                } catch {
                  // not JSON, skip
                }

                // Emit structured data for frontend card rendering
                if (["gmail_search", "gmail_read_message", "gmail_read_thread"].includes(block.name)) {
                  try {
                    const parsed = JSON.parse(result);
                    const emailEvent = JSON.stringify({
                      type: "email_data",
                      tool: block.name,
                      data: parsed,
                    });
                    controller.enqueue(encoder.encode(`data: ${emailEvent}\n\n`));
                  } catch {
                    // skip if result isn't valid JSON
                  }
                }

                if (["calendar_list_events", "calendar_get_event", "calendar_create_event"].includes(block.name)) {
                  try {
                    const parsed = JSON.parse(result);
                    const calEvent = JSON.stringify({
                      type: "calendar_data",
                      tool: block.name,
                      data: parsed,
                    });
                    controller.enqueue(encoder.encode(`data: ${calEvent}\n\n`));
                  } catch {
                    // skip if result isn't valid JSON
                  }
                }

                if (["drive_search", "drive_get_file", "drive_list_folder"].includes(block.name)) {
                  try {
                    const parsed = JSON.parse(result);
                    const driveEvent = JSON.stringify({
                      type: "drive_data",
                      tool: block.name,
                      data: parsed,
                    });
                    controller.enqueue(encoder.encode(`data: ${driveEvent}\n\n`));
                  } catch {
                    // skip if result isn't valid JSON
                  }
                }

                return {
                  type: "tool_result" as const,
                  tool_use_id: block.id,
                  content: result,
                };
              })
            );

          currentMessages = [
            ...currentMessages,
            { role: "assistant" as const, content: assistantContent },
            { role: "user" as const, content: toolResults },
          ];

          // Tell the frontend to clear interim text before the next round
          const clearEvent = JSON.stringify({ type: "clear_content" });
          controller.enqueue(encoder.encode(`data: ${clearEvent}\n\n`));

          const nextStream = client.messages.stream({
            model: "claude-sonnet-4-20250514",
            max_tokens: 2048,
            system: systemPrompt,
            messages: currentMessages,
            tools: activeTools,
          });

          await processStream(nextStream);
        }
      };

      try {
        await processStream(stream);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown stream error";
        console.error("[Agent API] Stream error:", message, error);
        const errorData = JSON.stringify({
          type: "error",
          error: { message },
        });
        controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
      }

      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
