"use client";

import { useEffect, useRef } from "react";
import { AgentMessage } from "../hooks/useAgentStream";
import Message from "./Message";

interface MessageListProps {
  messages: AgentMessage[];
  streaming: boolean;
}

export default function MessageList({ messages, streaming }: MessageListProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-6 py-6">
      {messages.map((msg, i) => (
        <Message
          key={i}
          message={msg}
          isStreaming={streaming && i === messages.length - 1 && msg.role === "assistant"}
        />
      ))}
      <div ref={endRef} />
    </div>
  );
}
