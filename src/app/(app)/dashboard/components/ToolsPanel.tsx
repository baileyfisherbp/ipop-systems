"use client";

const TOOLS = [
  { id: "gmail", label: "Gmail", desc: "Read emails, draft replies, manage inbox" },
  { id: "calendar", label: "Google Calendar", desc: "View, search, and create calendar events" },
  { id: "drive", label: "Google Drive", desc: "Search, browse, and read files" },
];

interface ToolsPanelProps {
  enabledTools: Set<string>;
  onToggle: (toolId: string) => void;
  activeTools: Set<string>;
}

export default function ToolsPanel({ enabledTools, onToggle, activeTools }: ToolsPanelProps) {
  const enabledCount = enabledTools.size;

  return (
    <aside className="flex h-full w-[220px] shrink-0 flex-col border-l border-dm-border bg-dm-surface">
      <div className="flex h-12 items-center justify-between border-b border-dm-border px-4">
        <span className="text-[11px] font-medium uppercase tracking-wider text-dm-text-muted">
          Tools
        </span>
        <span className="text-[10px] text-dm-text-muted">
          {enabledCount}/{TOOLS.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        <div className="space-y-1">
          {TOOLS.map((tool) => {
            const enabled = enabledTools.has(tool.id);
            const active = activeTools.has(tool.id);

            return (
              <div
                key={tool.id}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                  active
                    ? "bg-green-500/10"
                    : "hover:bg-dm-surface-raised"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <span
                    className={`block text-sm font-medium ${
                      active ? "text-green-400" : enabled ? "text-dm-text" : "text-dm-text-muted"
                    }`}
                  >
                    {tool.label}
                  </span>
                  <span className="block text-xs leading-snug text-dm-text-muted">
                    {tool.desc}
                  </span>
                </div>

                {/* Toggle switch */}
                <button
                  onClick={() => onToggle(tool.id)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                    enabled ? "bg-brand-lime" : "bg-dm-border"
                  }`}
                  role="switch"
                  aria-checked={enabled}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 rounded-full shadow-sm transition-transform duration-200 ${
                      enabled ? "translate-x-4 bg-dm-bg" : "translate-x-0 bg-dm-text-muted"
                    }`}
                  />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}

export { TOOLS };
