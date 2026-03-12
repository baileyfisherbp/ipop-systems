"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { AgentMessage } from "./useAgentStream";

export interface ChatSummary {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
}

export function useChatHistory() {
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const activeChatIdRef = useRef(activeChatId);
  activeChatIdRef.current = activeChatId;

  // Fetch chat list
  const refreshChats = useCallback(async () => {
    try {
      const res = await fetch("/api/chats");
      if (res.ok) {
        const data = await res.json();
        setChats(data);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshChats();
  }, [refreshChats]);

  // Create a new chat and return its ID
  const createChat = useCallback(async (): Promise<string> => {
    const res = await fetch("/api/chats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const chat = await res.json();
    setActiveChatId(chat.id);
    activeChatIdRef.current = chat.id;
    return chat.id;
  }, []);

  // Load a chat's messages
  const loadChat = useCallback(async (chatId: string): Promise<AgentMessage[]> => {
    setActiveChatId(chatId);
    activeChatIdRef.current = chatId;
    const res = await fetch(`/api/chats/${chatId}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.messages.map((m: {
      role: string;
      content: string;
      toolCalls?: string[] | null;
      emails?: unknown[] | null;
      calendarEvents?: unknown[] | null;
      driveFiles?: unknown[] | null;
    }) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
      toolCalls: m.toolCalls || undefined,
      emails: m.emails || undefined,
      calendarEvents: m.calendarEvents || undefined,
      driveFiles: m.driveFiles || undefined,
    }));
  }, []);

  // Save messages to the active chat
  const saveMessages = useCallback(async (chatId: string, messages: AgentMessage[]) => {
    await fetch(`/api/chats/${chatId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    });
    refreshChats();
  }, [refreshChats]);

  // Delete a chat
  const deleteChat = useCallback(async (chatId: string) => {
    await fetch(`/api/chats/${chatId}`, { method: "DELETE" });
    if (activeChatIdRef.current === chatId) {
      setActiveChatId(null);
      activeChatIdRef.current = null;
    }
    refreshChats();
  }, [refreshChats]);

  // Start a new chat (reset active)
  const startNewChat = useCallback(() => {
    setActiveChatId(null);
    activeChatIdRef.current = null;
  }, []);

  return {
    chats,
    activeChatId,
    activeChatIdRef,
    loading,
    createChat,
    loadChat,
    saveMessages,
    deleteChat,
    startNewChat,
    refreshChats,
  };
}
