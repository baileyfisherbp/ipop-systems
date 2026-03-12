"use client";

import { useState } from "react";
import { useAgentStream } from "../hooks/useAgentStream";
import MessageList from "./MessageList";
import InputBar from "./InputBar";
import SuggestionChips from "./SuggestionChips";

export default function AgentChat() {
  const [location, setLocation] = useState("All Locations");
  const { messages, send, streaming, clearMessages } = useAgentStream();

  const handleSend = (message: string) => {
    send(message, location);
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="flex h-full flex-col bg-dm-bg">
      {/* Top bar */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-dm-border px-6">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold text-dm-text">
            Operations Agent
          </h1>
          <span className="text-xs text-dm-text-muted">/</span>
          <select
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="rounded-md border border-dm-border bg-dm-surface px-2 py-1 text-xs text-dm-text outline-none"
          >
            {["All Locations", "Burnaby", "Surrey", "Penticton", "Victoria", "Nanaimo"].map((loc) => (
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
              className={`h-2 w-2 rounded-full transition-all ${
                streaming ? "bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.6)]" : "bg-dm-border"
              }`}
            />
            <span className={`text-xs ${streaming ? "text-green-400" : "text-dm-text-muted"}`}>
              {streaming ? "Thinking..." : "Ready"}
            </span>
          </div>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto">
        {hasMessages ? (
          <MessageList messages={messages} streaming={streaming} />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-6 px-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-dm-text">
                IPOP Operations Agent
              </h2>
              <p className="mt-2 text-sm text-dm-text-muted">
                Ask me anything about bookings, staff, finances, members, and
                more.
              </p>
            </div>
            <SuggestionChips onSelect={handleSend} />
          </div>
        )}
      </div>

      {/* Input */}
      <InputBar onSend={handleSend} disabled={streaming} />
    </div>
  );
}
