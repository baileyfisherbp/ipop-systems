"use client";

import Image from "next/image";
import { Plus } from "lucide-react";

const LOCATIONS = [
  "All Locations",
  "Burnaby",
  "Surrey",
  "Penticton",
  "Victoria",
  "Nanaimo",
];

const TOOLS = [
  {
    id: "gmail",
    icon: "\u{2709}\uFE0F",
    label: "Gmail",
    desc: "Read emails, draft replies, manage inbox",
  },
];

interface AgentSidebarProps {
  location: string;
  onLocationChange: (location: string) => void;
  activeTools: Set<string>;
  onNewChat: () => void;
}

export default function AgentSidebar({
  location,
  onLocationChange,
  activeTools,
  onNewChat,
}: AgentSidebarProps) {
  return (
    <aside
      className="relative z-10 flex h-full w-[260px] shrink-0 flex-col border-r"
      style={{
        backgroundColor: "var(--agent-bg-sidebar)",
        borderColor: "var(--agent-border)",
      }}
    >
      {/* Logo + label */}
      <div
        className="flex h-14 items-center gap-3 border-b px-5"
        style={{ borderColor: "var(--agent-border)" }}
      >
        <Image
          src="/ipop_white_nowordmark.svg"
          alt="IPOP"
          width={32}
          height={32}
        />
        <span
          className="text-xs font-medium tracking-wider uppercase"
          style={{
            color: "var(--agent-accent)",
            fontFamily: "var(--font-dm-mono), monospace",
          }}
        >
          Operations Agent
        </span>
      </div>

      {/* New chat + Location selector */}
      <div
        className="space-y-3 border-b px-4 py-4"
        style={{ borderColor: "var(--agent-border)" }}
      >
        <button
          onClick={onNewChat}
          className="flex w-full items-center justify-center gap-2 rounded-lg py-2 text-xs font-medium transition-colors"
          style={{
            backgroundColor: "var(--agent-accent-dim)",
            color: "var(--agent-accent)",
            fontFamily: "var(--font-dm-mono), monospace",
          }}
        >
          <Plus className="h-3.5 w-3.5" />
          New Chat
        </button>
        <select
          value={location}
          onChange={(e) => onLocationChange(e.target.value)}
          className="w-full rounded-lg border px-3 py-2 text-xs outline-none"
          style={{
            backgroundColor: "rgba(255,255,255,0.04)",
            borderColor: "var(--agent-border)",
            color: "var(--agent-text-primary)",
            fontFamily: "var(--font-dm-mono), monospace",
          }}
        >
          {LOCATIONS.map((loc) => (
            <option key={loc} value={loc} style={{ backgroundColor: "#0d110d" }}>
              {loc}
            </option>
          ))}
        </select>
      </div>

      {/* Connected Tools */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <p
          className="mb-3 text-[10px] font-medium tracking-wider uppercase"
          style={{
            color: "var(--agent-text-muted)",
            fontFamily: "var(--font-dm-mono), monospace",
          }}
        >
          Connected Tools
        </p>
        <div className="space-y-1">
          {TOOLS.map((tool) => {
            const isActive = activeTools.has(tool.id);
            return (
              <div
                key={tool.id}
                className="flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors"
                style={{
                  backgroundColor: isActive
                    ? "var(--agent-accent-dim)"
                    : "transparent",
                }}
              >
                <span className="mt-0.5 text-sm">{tool.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs font-medium"
                      style={{
                        color: isActive
                          ? "var(--agent-accent)"
                          : "var(--agent-text-primary)",
                      }}
                    >
                      {tool.label}
                    </span>
                    <div
                      className="h-1.5 w-1.5 shrink-0 rounded-full transition-all duration-300"
                      style={{
                        backgroundColor: isActive
                          ? "var(--agent-accent)"
                          : "rgba(255,255,255,0.15)",
                        boxShadow: isActive
                          ? "0 0 8px var(--agent-accent), 0 0 16px var(--agent-accent)"
                          : "none",
                      }}
                    />
                  </div>
                  <p
                    className="mt-0.5 text-[10px] leading-tight"
                    style={{ color: "var(--agent-text-muted)" }}
                  >
                    {tool.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
