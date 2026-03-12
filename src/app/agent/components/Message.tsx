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

        {/* Message text */}
        <div
          className="whitespace-pre-wrap text-sm leading-relaxed"
          style={{
            color: isUser
              ? "var(--agent-accent)"
              : "var(--agent-text-primary)",
            fontFamily: "var(--font-dm-sans), sans-serif",
          }}
        >
          {message.content}
          {isStreaming && (
            <span
              className="ml-0.5 inline-block h-4 w-0.5 animate-pulse"
              style={{ backgroundColor: "var(--agent-accent)" }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
