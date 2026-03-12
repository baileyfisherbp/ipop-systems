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
  // "John Doe <john@example.com>" -> "John Doe"
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
    <div className="group rounded-xl border border-dm-border/80 bg-dm-surface-raised/60 backdrop-blur-sm transition-all hover:border-dm-border">
      {/* Header - always visible */}
      <div
        className={`flex items-start gap-3 px-4 py-3 ${hasBody ? "cursor-pointer" : ""}`}
        onClick={() => hasBody && setExpanded(!expanded)}
      >
        {/* Avatar / Icon */}
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-dm-border/50">
          <Mail className="h-3.5 w-3.5 text-dm-text-muted" />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          {/* Top row: sender + date + open link */}
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-sm font-medium text-dm-text">
              {senderName}
            </span>
            <div className="flex shrink-0 items-center gap-2">
              <div className="flex items-center gap-1.5 text-dm-text-muted">
                <Clock className="h-3 w-3" />
                <span className="text-[11px]">{formatEmailDate(email.date)}</span>
              </div>
              {email.threadId && (
                <a
                  href={`https://mail.google.com/mail/u/0/#inbox/${email.threadId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="rounded-md p-1 text-dm-text-muted/50 transition-colors hover:bg-dm-surface-raised hover:text-dm-text"
                  title="Open in Gmail"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          </div>

          {/* Sender email (subtle) */}
          {senderName !== senderEmail && (
            <div className="flex items-center gap-1 mt-0.5">
              <User className="h-2.5 w-2.5 text-dm-text-muted/60" />
              <span className="text-[11px] text-dm-text-muted/60 truncate">
                {senderEmail}
              </span>
            </div>
          )}

          {/* Subject */}
          <p className="mt-1 text-[13px] font-medium text-dm-text/90 leading-snug">
            {email.subject || "(No subject)"}
          </p>

          {/* Snippet preview */}
          {!expanded && (email.snippet || email.body) && (
            <p className="mt-1 text-xs text-dm-text-muted line-clamp-2 leading-relaxed">
              {email.snippet || email.body?.slice(0, 200)}
            </p>
          )}
        </div>

        {/* Expand indicator */}
        {hasBody && (
          <div className="mt-1 shrink-0 text-dm-text-muted/50 transition-colors group-hover:text-dm-text-muted">
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
        <div className="border-t border-dm-border/50 px-4 py-3">
          {email.to && (
            <div className="mb-2 flex items-center gap-1.5 text-[11px] text-dm-text-muted">
              <span className="font-medium">To:</span>
              <span className="truncate">{email.to}</span>
            </div>
          )}
          <div className="whitespace-pre-wrap text-xs leading-relaxed text-dm-text/80">
            {email.body}
          </div>
        </div>
      )}
    </div>
  );
}
