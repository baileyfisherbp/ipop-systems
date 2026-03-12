import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/lib/auth";
import { getGmailClient } from "@/lib/google";
import { NextRequest } from "next/server";

const client = new Anthropic();

const TOOL_DEFINITIONS: Anthropic.Tool[] = [
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

async function executeToolCall(
  toolName: string,
  input: Record<string, unknown>,
  userId: string
): Promise<string> {
  try {
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

        // Extract body text
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

        // Fallback to snippet if no plain text
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
          body: body.slice(0, 10000), // Cap at 10k chars
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

      default:
        return JSON.stringify({ error: `Unknown tool: ${toolName}` });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return JSON.stringify({ error: `Tool execution failed: ${message}` });
  }
}

function buildSystemPrompt(location: string): string {
  return `You are IPOP's internal AI operations agent. IPOP (Inclusive Place of Pickleball) is a Canadian multi-location indoor pickleball facility with locations in Burnaby, Surrey, Penticton, Victoria, and Nanaimo.

ACTIVE LOCATION CONTEXT: ${location === "All Locations" ? "You have visibility across all IPOP locations." : `You are focused on the ${location} location.`}

You have access to the user's Gmail via tools. You can:
- Search their inbox for emails
- Read full email messages and threads
- Create draft replies

BEHAVIOR:
- Be concise and direct. This is an internal ops tool, not a customer chat.
- When showing email data, format it clearly with sender, subject, and date.
- If asked to draft or reply to an email, show the draft content to the user and confirm before creating it in Gmail.
- Only use the tools you actually have access to. Do not claim to have access to tools you don't have.`;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.user.id;
  if (!userId) {
    return new Response("No user ID", { status: 401 });
  }

  const { messages, location } = await req.json();

  const systemPrompt = buildSystemPrompt(location || "All Locations");

  let currentMessages = [...messages];

  const stream = client.messages.stream({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    system: systemPrompt,
    messages: currentMessages,
    tools: TOOL_DEFINITIONS,
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
              toolUseBlocks.map(async (block) => ({
                type: "tool_result" as const,
                tool_use_id: block.id,
                content: await executeToolCall(block.name, block.input, userId),
              }))
            );

          currentMessages = [
            ...currentMessages,
            { role: "assistant" as const, content: assistantContent },
            { role: "user" as const, content: toolResults },
          ];

          const nextStream = client.messages.stream({
            model: "claude-sonnet-4-20250514",
            max_tokens: 2048,
            system: systemPrompt,
            messages: currentMessages,
            tools: TOOL_DEFINITIONS,
          });

          await processStream(nextStream);
        }
      };

      try {
        await processStream(stream);
      } catch (error) {
        const errorData = JSON.stringify({
          type: "error",
          error: { message: "Stream error" },
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
