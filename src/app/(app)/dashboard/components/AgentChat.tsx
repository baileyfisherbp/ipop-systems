"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { useAgentStream, AgentMessage } from "../hooks/useAgentStream";
import { useChatHistory } from "../hooks/useChatHistory";
import MessageList from "./MessageList";
import InputBar from "./InputBar";
import SuggestionChips from "./SuggestionChips";
import ToolsPanel, { TOOLS } from "./ToolsPanel";
import ChatHistorySidebar, { CollapsedSidebarButton } from "./ChatHistorySidebar";

const ALL_TOOL_IDS = TOOLS.map((t) => t.id);

export default function AgentChat() {
  const [enabledTools, setEnabledTools] = useState<Set<string>>(
    () => new Set(ALL_TOOL_IDS)
  );
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const chatHistory = useChatHistory();

  // Use a stable callback that reads from refs — avoids stale closure issues
  const onStreamComplete = useCallback(
    async (userMsg: AgentMessage, assistantMsg: AgentMessage) => {
      let chatId = chatHistory.activeChatIdRef.current;

      // Auto-create chat on first send
      if (!chatId) {
        chatId = await chatHistory.createChat();
      }

      await chatHistory.saveMessages(chatId, [userMsg, assistantMsg]);

      // Refresh again after a delay to pick up the AI-generated title
      setTimeout(() => chatHistory.refreshChats(), 3000);
    },
    [chatHistory.createChat, chatHistory.saveMessages, chatHistory.refreshChats, chatHistory.activeChatIdRef]
  );

  const { messages, send, streaming, activeTools, clearMessages, loadMessages } =
    useAgentStream(onStreamComplete);

  const handleSend = (message: string) => {
    send(message, "All Locations", Array.from(enabledTools));
  };

  const handleToggle = useCallback((toolId: string) => {
    setEnabledTools((prev) => {
      const next = new Set(prev);
      if (next.has(toolId)) {
        next.delete(toolId);
      } else {
        next.add(toolId);
      }
      return next;
    });
  }, []);

  const handleSelectChat = useCallback(
    async (chatId: string) => {
      const msgs = await chatHistory.loadChat(chatId);
      loadMessages(msgs);
    },
    [chatHistory.loadChat, loadMessages]
  );

  const handleNewChat = useCallback(() => {
    chatHistory.startNewChat();
    clearMessages();
  }, [chatHistory.startNewChat, clearMessages]);

  const handleDeleteChat = useCallback(
    async (chatId: string) => {
      const wasActive = chatHistory.activeChatIdRef.current === chatId;
      await chatHistory.deleteChat(chatId);
      if (wasActive) {
        clearMessages();
      }
    },
    [chatHistory.deleteChat, chatHistory.activeChatIdRef, clearMessages]
  );

  const hasMessages = messages.length > 0;

  return (
    <div className="relative flex h-full bg-dm-bg">
      {/* Chat history sidebar */}
      <ChatHistorySidebar
        chats={chatHistory.chats}
        activeChatId={chatHistory.activeChatId}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
        onDeleteChat={handleDeleteChat}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
      />

      {sidebarCollapsed && (
        <CollapsedSidebarButton onClick={() => setSidebarCollapsed(false)} />
      )}

      {/* Main chat area */}
      <div className="flex flex-1 flex-col">
        {hasMessages ? (
          <>
            <div className="flex-1 overflow-y-auto">
              <MessageList messages={messages} streaming={streaming} />
            </div>
            <InputBar onSend={handleSend} disabled={streaming} />
          </>
        ) : (
          <div className="flex flex-1 flex-col">
            <div className="flex flex-1 flex-col items-center justify-center px-6">
              <div
                className="animate-fade-in-up mb-8 opacity-[0.12]"
                style={{ animationDelay: "0ms" }}
              >
                <Image
                  src="/ipop_white_nowordmark.svg"
                  alt=""
                  width={96}
                  height={96}
                />
              </div>

              <div
                className="animate-fade-in-up w-full max-w-2xl"
                style={{ animationDelay: "120ms" }}
              >
                <SuggestionChips onSelect={handleSend} />
              </div>
            </div>

            <InputBar onSend={handleSend} disabled={streaming} showBorderAnimation />
          </div>
        )}
      </div>

      {/* Right-hand tools panel */}
      <ToolsPanel
        enabledTools={enabledTools}
        onToggle={handleToggle}
        activeTools={activeTools}
      />
    </div>
  );
}
