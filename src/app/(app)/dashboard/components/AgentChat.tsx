"use client";

import { useState } from "react";
import { useAgentStream } from "../hooks/useAgentStream";
import AgentSidebar from "./AgentSidebar";
import MessageList from "./MessageList";
import InputBar from "./InputBar";
import SuggestionChips from "./SuggestionChips";

export default function AgentChat() {
  const [location, setLocation] = useState("All Locations");
  const { messages, send, streaming, activeTools, clearMessages } =
    useAgentStream();

  const handleSend = (message: string) => {
    send(message, location);
  };

  const hasMessages = messages.length > 0;

  return (
    <div
      className="flex h-full"
      style={{ backgroundColor: "var(--agent-bg-base)" }}
    >
      <style jsx global>{`
        :root {
          --agent-bg-base: #0a0d0a;
          --agent-bg-sidebar: #0d110d;
          --agent-accent: #d8ff29;
          --agent-accent-dim: rgba(216, 255, 41, 0.15);
          --agent-border: rgba(255, 255, 255, 0.07);
          --agent-text-primary: rgba(255, 255, 255, 0.9);
          --agent-text-secondary: rgba(255, 255, 255, 0.5);
          --agent-text-muted: rgba(255, 255, 255, 0.25);
        }
      `}</style>

      {/* Grid background */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundImage: `linear-gradient(rgba(216,255,41,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(216,255,41,0.02) 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
        }}
      />

      <AgentSidebar
        location={location}
        onLocationChange={setLocation}
        activeTools={activeTools}
        onNewChat={clearMessages}
      />

      <div className="relative z-10 flex flex-1 flex-col">
        {/* Top bar */}
        <div
          className="flex h-14 shrink-0 items-center justify-between border-b px-6"
          style={{
            borderColor: "var(--agent-border)",
            fontFamily: "var(--font-dm-mono), monospace",
          }}
        >
          <div className="flex items-center gap-3">
            <h1
              className="text-sm font-semibold"
              style={{
                color: "var(--agent-text-primary)",
                fontFamily: "var(--font-syne), sans-serif",
              }}
            >
              Operations Agent
            </h1>
            <span
              className="text-xs"
              style={{ color: "var(--agent-text-muted)" }}
            >
              /
            </span>
            <span
              className="text-xs"
              style={{ color: "var(--agent-text-secondary)" }}
            >
              {location}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="h-2 w-2 rounded-full"
              style={{
                backgroundColor: streaming
                  ? "var(--agent-accent)"
                  : "rgba(255,255,255,0.2)",
                boxShadow: streaming
                  ? "0 0 8px var(--agent-accent)"
                  : "none",
                transition: "all 0.3s",
              }}
            />
            <span
              className="text-xs"
              style={{
                color: streaming
                  ? "var(--agent-accent)"
                  : "var(--agent-text-muted)",
                fontFamily: "var(--font-dm-mono), monospace",
              }}
            >
              {streaming ? "Thinking..." : "Ready"}
            </span>
          </div>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto">
          {hasMessages ? (
            <MessageList messages={messages} streaming={streaming} />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-6 px-6">
              <div className="text-center">
                <h2
                  className="text-2xl font-bold"
                  style={{
                    color: "var(--agent-text-primary)",
                    fontFamily: "var(--font-syne), sans-serif",
                  }}
                >
                  IPOP Operations Agent
                </h2>
                <p
                  className="mt-2 text-sm"
                  style={{ color: "var(--agent-text-secondary)" }}
                >
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
    </div>
  );
}
