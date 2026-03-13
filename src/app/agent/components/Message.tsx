"use client";

import ReactMarkdown from "react-markdown";
import { AgentMessage } from "../hooks/useAgentStream";
import ToolCallBadge from "./ToolCallBadge";
import EmailCard from "./EmailCard";
import CalendarEventCard from "./CalendarEventCard";
import DriveFileCard from "./DriveFileCard";

function getToolLabel(toolName: string): string {
  if (toolName.startsWith("gmail") || toolName.includes("email") || toolName.includes("draft")) return "Checking Gmail";
  if (toolName.startsWith("calendar") || toolName.includes("event")) return "Checking Google Calendar";
  if (toolName.startsWith("drive") || toolName.includes("file") || toolName.includes("folder")) return "Checking Google Drive";
  if (toolName.startsWith("scheduling") || toolName.includes("shift") || toolName.includes("staff")) return "Checking Schedule";
  return "Using " + toolName;
}

interface MessageProps {
  message: AgentMessage;
  isStreaming: boolean;
}

export default function Message({ message, isStreaming }: MessageProps) {
  const isUser = message.role === "user";
  const isAssistantStreaming = isStreaming && !isUser;
  const hasEmails = message.emails && message.emails.length > 0;
  const hasCalendarEvents = message.calendarEvents && message.calendarEvents.length > 0;
  const hasDriveFiles = message.driveFiles && message.driveFiles.length > 0;

  const hasContent = message.content.trim().length > 0;
  const hasToolCalls = message.toolCalls && message.toolCalls.length > 0;
  const hasAnyData = hasContent || hasEmails || hasCalendarEvents || hasDriveFiles || hasToolCalls;

  // Thinking / tool-use state — rendered without the bubble wrapper
  if (!hasContent && !isUser) {
    // Still streaming: show shimmer label
    if (isStreaming) {
      const lastTool = hasToolCalls
        ? message.toolCalls![message.toolCalls!.length - 1]
        : null;
      const label = lastTool ? getToolLabel(lastTool) : "Thinking";

      return (
        <div className="flex justify-start">
          <span
            key={label}
            className="animate-shimmer-text text-sm font-medium"
            style={{
              "--shimmer-base": "rgba(255,255,255,0.25)",
              "--shimmer-highlight": "var(--agent-accent)",
              fontFamily: "var(--font-dm-sans), sans-serif",
            } as React.CSSProperties}
          >
            {label}...
          </span>
        </div>
      );
    }

    // Done streaming with no content and no data — don't render an empty bubble
    if (!hasAnyData) {
      return null;
    }
  }

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className="max-w-[85%] rounded-2xl px-4 py-3"
        style={{
          backgroundColor: isUser
            ? "var(--agent-accent-dim)"
            : "rgba(255,255,255,0.05)",
          border: `1px solid ${isUser ? "rgba(216,255,41,0.2)" : "var(--agent-border)"}`,
        }}
      >
        {/* Tool call badges */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {message.toolCalls.map((tool, i) => (
              <ToolCallBadge key={i} toolName={tool} />
            ))}
          </div>
        )}

        {/* Email cards */}
        {hasEmails && (
          <div className="mb-3 space-y-2">
            {message.emails!.map((email, i) => (
              <EmailCard key={`${email.id ?? "email"}-${i}`} email={email} />
            ))}
          </div>
        )}

        {/* Calendar event cards */}
        {hasCalendarEvents && (
          <div className="mb-3 space-y-2">
            {message.calendarEvents!.map((event, i) => (
              <CalendarEventCard key={`${event.id ?? "event"}-${i}`} event={event} />
            ))}
          </div>
        )}

        {/* Drive file cards */}
        {hasDriveFiles && (
          <div className="mb-3 space-y-2">
            {message.driveFiles!.map((file, i) => (
              <DriveFileCard key={`${file.id ?? "file"}-${i}`} file={file} />
            ))}
          </div>
        )}

        {/* Message text */}
        {isUser ? (
          <div
            className="whitespace-pre-wrap text-sm leading-relaxed"
            style={{
              color: "var(--agent-accent)",
              fontFamily: "var(--font-dm-sans), sans-serif",
            }}
          >
            {message.content}
          </div>
        ) : (
          <div
            className="prose-chat text-sm leading-relaxed"
            style={{
              color: "var(--agent-text-primary)",
              fontFamily: "var(--font-dm-sans), sans-serif",
            }}
          >
            <ReactMarkdown>{message.content}</ReactMarkdown>
            {isAssistantStreaming && (
              <span
                className="ml-0.5 inline-block h-4 w-0.5 animate-pulse"
                style={{ backgroundColor: "var(--agent-accent)" }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
