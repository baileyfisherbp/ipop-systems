"use client";

import { useState } from "react";
import { ChatSummary } from "../hooks/useChatHistory";

interface ChatHistorySidebarProps {
  chats: ChatSummary[];
  activeChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onNewChat: () => void;
  onDeleteChat: (chatId: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

function groupChats(chats: ChatSummary[]) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const weekAgo = new Date(today.getTime() - 7 * 86400000);

  const groups: { label: string; chats: ChatSummary[] }[] = [
    { label: "Today", chats: [] },
    { label: "Yesterday", chats: [] },
    { label: "Previous 7 Days", chats: [] },
    { label: "Older", chats: [] },
  ];

  for (const chat of chats) {
    const d = new Date(chat.updatedAt);
    if (d >= today) groups[0].chats.push(chat);
    else if (d >= yesterday) groups[1].chats.push(chat);
    else if (d >= weekAgo) groups[2].chats.push(chat);
    else groups[3].chats.push(chat);
  }

  return groups.filter((g) => g.chats.length > 0);
}

export default function ChatHistorySidebar({
  chats,
  activeChatId,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  collapsed,
  onToggleCollapse,
}: ChatHistorySidebarProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const groups = groupChats(chats);

  return (
    <div
      className={`flex shrink-0 flex-col border-r border-dm-border bg-dm-surface transition-all duration-200 ${
        collapsed ? "w-0 overflow-hidden border-r-0" : "w-64"
      }`}
    >
      {/* Header */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-dm-border px-3">
        <span className="text-xs font-medium uppercase tracking-wider text-dm-text-muted">
          History
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={onNewChat}
            className="rounded-md p-1.5 text-dm-text-muted transition-colors hover:bg-dm-surface-raised hover:text-dm-text"
            title="New chat"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="8" y1="3" x2="8" y2="13" />
              <line x1="3" y1="8" x2="13" y2="8" />
            </svg>
          </button>
          <button
            onClick={onToggleCollapse}
            className="rounded-md p-1.5 text-dm-text-muted transition-colors hover:bg-dm-surface-raised hover:text-dm-text"
            title="Collapse sidebar"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="4" x2="13" y2="4" />
              <line x1="3" y1="8" x2="13" y2="8" />
              <line x1="3" y1="12" x2="13" y2="12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {chats.length === 0 ? (
          <p className="px-2 py-4 text-center text-xs text-dm-text-muted">
            No conversations yet
          </p>
        ) : (
          groups.map((group) => (
            <div key={group.label} className="mb-3">
              <p className="px-2 pb-1 text-[10px] font-medium uppercase tracking-wider text-dm-text-muted/60">
                {group.label}
              </p>
              {group.chats.map((chat) => (
                <div
                  key={chat.id}
                  onMouseEnter={() => setHoveredId(chat.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  className={`group relative flex cursor-pointer items-center rounded-lg px-2 py-2 text-sm transition-colors ${
                    chat.id === activeChatId
                      ? "bg-dm-surface-raised text-dm-text"
                      : "text-dm-text-muted hover:bg-dm-surface-raised/50 hover:text-dm-text"
                  }`}
                  onClick={() => onSelectChat(chat.id)}
                >
                  <span className="flex-1 truncate text-xs">
                    {chat.title || "New chat"}
                  </span>
                  {hoveredId === chat.id && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteChat(chat.id);
                      }}
                      className="shrink-0 rounded p-0.5 text-dm-text-muted transition-colors hover:text-red-400"
                      title="Delete chat"
                    >
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <line x1="4" y1="4" x2="12" y2="12" />
                        <line x1="12" y1="4" x2="4" y2="12" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// Small button shown when the sidebar is collapsed
export function CollapsedSidebarButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="absolute left-2 top-2 z-10 rounded-md border border-dm-border bg-dm-surface p-1.5 text-dm-text-muted shadow-sm transition-colors hover:bg-dm-surface-raised hover:text-dm-text"
      title="Show chat history"
    >
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <line x1="3" y1="4" x2="13" y2="4" />
        <line x1="3" y1="8" x2="13" y2="8" />
        <line x1="3" y1="12" x2="13" y2="12" />
      </svg>
    </button>
  );
}
