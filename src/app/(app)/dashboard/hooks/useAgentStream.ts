"use client";

import { useState, useCallback, useRef } from "react";

export interface EmailItem {
  id?: string;
  threadId?: string;
  from: string;
  to: string;
  subject: string;
  date: string;
  snippet?: string;
  body?: string;
  labels?: string[];
}

export interface CalendarEventItem {
  id?: string;
  summary: string;
  description?: string;
  start: string;
  end: string;
  location?: string;
  status?: string;
  organizer?: string;
  attendees?: { email: string; name?: string; status: string }[];
  htmlLink?: string;
}

export interface DriveFileItem {
  id?: string;
  name: string;
  mimeType?: string;
  type?: string;
  modifiedTime?: string;
  size?: string;
  owner?: string;
  webViewLink?: string;
  content?: string;
}

export interface AgentMessage {
  role: "user" | "assistant";
  content: string;
  toolCalls?: string[];
  emails?: EmailItem[];
  calendarEvents?: CalendarEventItem[];
  driveFiles?: DriveFileItem[];
}

export function useAgentStream(
  onStreamComplete?: (userMsg: AgentMessage, assistantMsg: AgentMessage) => void
) {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [activeTools, setActiveTools] = useState<Set<string>>(new Set());
  const [streaming, setStreaming] = useState(false);
  const onStreamCompleteRef = useRef(onStreamComplete);
  onStreamCompleteRef.current = onStreamComplete;
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

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
            const last = { ...updated[updated.length - 1] };
            last.content = "Sorry, something went wrong. Please try again.";
            updated[updated.length - 1] = last;
            return updated;
          });
          setStreaming(false);
          return;
        }

        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Process only complete lines (terminated by \n)
          const parts = buffer.split("\n");
          buffer = parts.pop() ?? ""; // keep incomplete trailing line in buffer

          const lines = parts.filter((l) => l.startsWith("data: "));

          for (const line of lines) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const event = JSON.parse(data);

              // Clear interim text when a new tool round starts
              if (event.type === "clear_content") {
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = { ...updated[updated.length - 1] };
                  last.content = "";
                  updated[updated.length - 1] = last;
                  return updated;
                });
              }

              // Handle tool use start — light up the sidebar
              if (
                event.type === "content_block_start" &&
                event.content_block?.type === "tool_use"
              ) {
                const toolName = event.content_block.name as string;
                // Map tool name to category ID for sidebar glow
                const category = toolName.startsWith("gmail") ? "gmail"
                  : toolName.startsWith("calendar") ? "calendar"
                  : toolName.startsWith("drive") ? "drive"
                  : toolName.startsWith("scheduling") ? "scheduling"
                  : toolName;
                setActiveTools((prev) => new Set([...prev, category]));

                setMessages((prev) => {
                  const updated = [...prev];
                  const last = { ...updated[updated.length - 1] };
                  last.toolCalls = [...(last.toolCalls || []), toolName];
                  updated[updated.length - 1] = last;
                  return updated;
                });

                // Remove glow after 2s
                setTimeout(() => {
                  setActiveTools((prev) => {
                    const next = new Set(prev);
                    next.delete(category);
                    return next;
                  });
                }, 2000);
              }

              // Handle structured email data from tool results
              if (event.type === "email_data") {
                const emailItems: EmailItem[] = [];
                if (event.tool === "gmail_search" && event.data?.results) {
                  emailItems.push(...event.data.results);
                } else if (event.tool === "gmail_read_message" && event.data?.subject) {
                  emailItems.push(event.data);
                } else if (event.tool === "gmail_read_thread" && event.data?.messages) {
                  emailItems.push(...event.data.messages);
                }
                if (emailItems.length > 0) {
                  setMessages((prev) => {
                    const updated = [...prev];
                    const last = { ...updated[updated.length - 1] };
                    last.emails = [...(last.emails || []), ...emailItems];
                    updated[updated.length - 1] = last;
                    return updated;
                  });
                }
              }

              // Handle structured calendar data from tool results
              if (event.type === "calendar_data") {
                const items: CalendarEventItem[] = [];
                if (event.tool === "calendar_list_events" && event.data?.results) {
                  items.push(...event.data.results);
                } else if (event.tool === "calendar_get_event" && event.data?.summary) {
                  items.push(event.data);
                } else if (event.tool === "calendar_create_event" && event.data?.summary) {
                  items.push(event.data);
                }
                if (items.length > 0) {
                  setMessages((prev) => {
                    const updated = [...prev];
                    const last = { ...updated[updated.length - 1] };
                    last.calendarEvents = [...(last.calendarEvents || []), ...items];
                    updated[updated.length - 1] = last;
                    return updated;
                  });
                }
              }

              // Handle structured drive data from tool results
              if (event.type === "drive_data") {
                const items: DriveFileItem[] = [];
                if ((event.tool === "drive_search" || event.tool === "drive_list_folder") && event.data?.results) {
                  items.push(...event.data.results);
                } else if (event.tool === "drive_get_file" && event.data?.name) {
                  items.push(event.data);
                }
                if (items.length > 0) {
                  setMessages((prev) => {
                    const updated = [...prev];
                    const last = { ...updated[updated.length - 1] };
                    last.driveFiles = [...(last.driveFiles || []), ...items];
                    updated[updated.length - 1] = last;
                    return updated;
                  });
                }
              }

              // Stream text delta
              if (
                event.type === "content_block_delta" &&
                event.delta?.type === "text_delta"
              ) {
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = { ...updated[updated.length - 1] };
                  last.content += event.delta.text;
                  updated[updated.length - 1] = last;
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
            const last = { ...updated[updated.length - 1] };
            last.content = "Connection error. Please try again.";
            updated[updated.length - 1] = last;
          }
          return updated;
        });
      }

      setStreaming(false);

      // Notify caller that streaming is done — use refs to get latest state
      const currentMsgs = messagesRef.current;
      const userMsg = currentMsgs[currentMsgs.length - 2];
      const assistantMsg = currentMsgs[currentMsgs.length - 1];
      if (userMsg && assistantMsg && onStreamCompleteRef.current) {
        onStreamCompleteRef.current(userMsg, assistantMsg);
      }
    },
    [messages]
  );

  const loadMessages = useCallback((msgs: AgentMessage[]) => {
    setMessages(msgs);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return { messages, send, streaming, activeTools, clearMessages, loadMessages };
}
