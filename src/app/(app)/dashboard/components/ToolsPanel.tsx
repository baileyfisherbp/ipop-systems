"use client";

const TOOLS = [
  { id: "gmail", label: "Gmail", desc: "Read emails, draft replies, manage inbox" },
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

      <div className="flex-1 overflow-y-auto px-2 py-2">
        <div className="space-y-0.5">
          {TOOLS.map((tool) => {
            const enabled = enabledTools.has(tool.id);
            const active = activeTools.has(tool.id);

            return (
              <button
                key={tool.id}
                onClick={() => onToggle(tool.id)}
                className={`flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors ${
                  active
                    ? "bg-green-500/10"
                    : enabled
                      ? "hover:bg-dm-surface-raised"
                      : "opacity-40 hover:opacity-60"
                }`}
              >
                {/* Toggle dot */}
                <div className="mt-1 shrink-0">
                  <div
                    className={`h-2 w-2 rounded-full transition-all ${
                      active
                        ? "bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.5)]"
                        : enabled
                          ? "bg-dm-text-muted"
                          : "bg-dm-border"
                    }`}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <span
                    className={`block text-xs font-medium ${
                      active ? "text-green-400" : enabled ? "text-dm-text" : "text-dm-text-muted"
                    }`}
                  >
                    {tool.label}
                  </span>
                  <span className="block text-[10px] leading-tight text-dm-text-muted/60">
                    {tool.desc}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}

export { TOOLS };
