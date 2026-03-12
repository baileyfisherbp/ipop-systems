"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { useAgentStream } from "../hooks/useAgentStream";
import MessageList from "./MessageList";
import InputBar from "./InputBar";
import SuggestionChips from "./SuggestionChips";
import ToolsPanel, { TOOLS } from "./ToolsPanel";

const ALL_TOOL_IDS = TOOLS.map((t) => t.id);

export default function AgentChat() {
  const [location, setLocation] = useState("All Locations");
  const [enabledTools, setEnabledTools] = useState<Set<string>>(
    () => new Set(ALL_TOOL_IDS)
  );
  const { messages, send, streaming, activeTools, clearMessages } =
    useAgentStream();

  const handleSend = (message: string) => {
    send(message, location, Array.from(enabledTools));
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

  const hasMessages = messages.length > 0;

  return (
    <div className="flex h-full bg-dm-bg">
      {/* Main chat area */}
      <div className="flex flex-1 flex-col">
        {/* Top bar */}
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-dm-border px-6">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-semibold text-dm-text">IPOP AI</h1>
            <span className="text-xs text-dm-text-muted">/</span>
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="rounded-md border border-dm-border bg-dm-surface px-2 py-1 text-xs text-dm-text outline-none"
            >
              {[
                "All Locations",
                "Burnaby",
                "Surrey",
                "Penticton",
                "Victoria",
                "Nanaimo",
              ].map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3">
            {hasMessages && (
              <button
                onClick={clearMessages}
                className="text-xs text-dm-text-muted transition-colors hover:text-dm-text"
              >
                New Chat
              </button>
            )}
            <div className="flex items-center gap-2">
              <div
                className={`h-1.5 w-1.5 rounded-full transition-all ${
                  streaming
                    ? "bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.6)]"
                    : "bg-dm-text-muted/40"
                }`}
              />
              <span
                className={`text-[11px] ${streaming ? "text-green-400" : "text-dm-text-muted"}`}
              >
                {streaming ? "Thinking..." : "Ready"}
              </span>
            </div>
          </div>
        </div>

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
                  width={48}
                  height={48}
                />
              </div>

              <div
                className="animate-fade-in-up w-full max-w-2xl"
                style={{ animationDelay: "120ms" }}
              >
                <SuggestionChips onSelect={handleSend} />
              </div>
            </div>

            <InputBar onSend={handleSend} disabled={streaming} />
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
