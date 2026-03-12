"use client";

import { useState, useCallback } from "react";

export interface AgentMessage {
  role: "user" | "assistant";
  content: string;
  toolCalls?: string[];
}

export function useAgentStream() {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [activeTools, setActiveTools] = useState<Set<string>>(new Set());
  const [streaming, setStreaming] = useState(false);

  const send = useCallback(
    async (userMessage: string, location: string, enabledTools?: string[]) => {
      setStreaming(true);

      const newMessages: AgentMessage[] = [
        ...messages,
        { role: "user", content: userMessage },
      ];
      setMessages(newMessages);

      // Add empty assistant message for streaming into
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "", toolCalls: [] },
      ]);

      try {
        const response = await fetch("/api/agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: newMessages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
            location,
            enabledTools,
          }),
        });

        if (!response.ok) {
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1].content =
              "Sorry, something went wrong. Please try again.";
            return updated;
          });
          setStreaming(false);
          return;
        }

        const reader = response.body!.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value);
          const lines = text.split("\n").filter((l) => l.startsWith("data: "));

          for (const line of lines) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const event = JSON.parse(data);

              // Handle tool use start — light up the sidebar
              if (
                event.type === "content_block_start" &&
                event.content_block?.type === "tool_use"
              ) {
                const toolName = event.content_block.name;
                setActiveTools((prev) => new Set([...prev, toolName]));

                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  last.toolCalls = [...(last.toolCalls || []), toolName];
                  return updated;
                });

                // Remove glow after 2s
                setTimeout(() => {
                  setActiveTools((prev) => {
                    const next = new Set(prev);
                    next.delete(toolName);
                    return next;
                  });
                }, 2000);
              }

              // Stream text delta
              if (
                event.type === "content_block_delta" &&
                event.delta?.type === "text_delta"
              ) {
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  last.content += event.delta.text;
                  return updated;
                });
              }
            } catch {
              // skip malformed JSON chunks
            }
          }
        }
      } catch {
        setMessages((prev) => {
          const updated = [...prev];
          if (updated.length > 0) {
            updated[updated.length - 1].content =
              "Connection error. Please try again.";
          }
          return updated;
        });
      }

      setStreaming(false);
    },
    [messages]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return { messages, send, streaming, activeTools, clearMessages };
}
