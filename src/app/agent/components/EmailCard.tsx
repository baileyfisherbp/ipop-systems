"use client";

import { Mail, Clock, User, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { useState } from "react";
import { EmailItem } from "../hooks/useAgentStream";

function formatEmailDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: "long" });
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}

function extractName(from: string): string {
  const match = from.match(/^(.+?)\s*<.*>$/);
  return match ? match[1].replace(/"/g, "") : from;
}

function extractEmail(from: string): string {
  const match = from.match(/<(.+?)>/);
  return match ? match[1] : from;
}

export default function EmailCard({ email }: { email: EmailItem }) {
  const [expanded, setExpanded] = useState(false);
  const hasBody = email.body && email.body.length > 0;
  const senderName = extractName(email.from);
  const senderEmail = extractEmail(email.from);

  return (
    <div
      className="group rounded-xl transition-all"
      style={{
        border: "1px solid var(--agent-border)",
        backgroundColor: "rgba(255,255,255,0.03)",
      }}
    >
      {/* Header */}
      <div
        className={`flex items-start gap-3 px-4 py-3 ${hasBody ? "cursor-pointer" : ""}`}
        onClick={() => hasBody && setExpanded(!expanded)}
      >
        {/* Icon */}
        <div
          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: "rgba(255,255,255,0.06)" }}
        >
          <Mail className="h-3.5 w-3.5" style={{ color: "var(--agent-text-secondary)" }} />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span
              className="truncate text-sm font-medium"
              style={{ color: "var(--agent-text-primary)" }}
            >
              {senderName}
            </span>
            <div className="flex shrink-0 items-center gap-2">
              <div className="flex items-center gap-1.5">
                <Clock className="h-3 w-3" style={{ color: "var(--agent-text-secondary)" }} />
                <span
                  className="text-[11px]"
                  style={{ color: "var(--agent-text-secondary)" }}
                >
                  {formatEmailDate(email.date)}
                </span>
              </div>
              {email.threadId && (
                <a
                  href={`https://mail.google.com/mail/u/0/#inbox/${email.threadId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="rounded-md p-1 transition-colors hover:text-blue-400"
                  style={{ color: "var(--agent-text-secondary)", opacity: 0.5 }}
                  title="Open in Gmail"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          </div>

          {senderName !== senderEmail && (
            <div className="mt-0.5 flex items-center gap-1">
              <User className="h-2.5 w-2.5" style={{ color: "var(--agent-text-secondary)", opacity: 0.5 }} />
              <span
                className="truncate text-[11px]"
                style={{ color: "var(--agent-text-secondary)", opacity: 0.5 }}
              >
                {senderEmail}
              </span>
            </div>
          )}

          <p
            className="mt-1 text-[13px] font-medium leading-snug"
            style={{ color: "var(--agent-text-primary)", opacity: 0.9 }}
          >
            {email.subject || "(No subject)"}
          </p>

          {!expanded && (email.snippet || email.body) && (
            <p
              className="mt-1 text-xs leading-relaxed"
              style={{
                color: "var(--agent-text-secondary)",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {email.snippet || email.body?.slice(0, 200)}
            </p>
          )}
        </div>

        {hasBody && (
          <div className="mt-1 shrink-0" style={{ color: "var(--agent-text-secondary)", opacity: 0.4 }}>
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </div>
        )}
      </div>

      {/* Expanded body */}
      {expanded && hasBody && (
        <div
          className="px-4 py-3"
          style={{ borderTop: "1px solid var(--agent-border)" }}
        >
          {email.to && (
            <div
              className="mb-2 flex items-center gap-1.5 text-[11px]"
              style={{ color: "var(--agent-text-secondary)" }}
            >
              <span className="font-medium">To:</span>
              <span className="truncate">{email.to}</span>
            </div>
          )}
          <div
            className="whitespace-pre-wrap text-xs leading-relaxed"
            style={{ color: "var(--agent-text-primary)", opacity: 0.8 }}
          >
            {email.body}
          </div>
        </div>
      )}
    </div>
  );
}
