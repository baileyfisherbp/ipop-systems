"use client";

import { AgentMessage } from "../hooks/useAgentStream";
import ToolCallBadge from "./ToolCallBadge";

interface MessageProps {
  message: AgentMessage;
  isStreaming: boolean;
}

export default function Message({ message, isStreaming }: MessageProps) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl border px-4 py-3 ${
          isUser
            ? "border-dm-border bg-dm-surface-raised"
            : "border-dm-border bg-dm-surface"
        }`}
      >
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {message.toolCalls.map((tool, i) => (
              <ToolCallBadge key={i} toolName={tool} />
            ))}
          </div>
        )}

        <div
          className={`whitespace-pre-wrap text-sm leading-relaxed ${
            isUser ? "text-dm-text" : "text-dm-text"
          }`}
        >
          {message.content}
          {isStreaming && (
            <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-dm-text" />
          )}
        </div>
      </div>
    </div>
  );
}
