"use client";

const TOOL_LABELS: Record<string, string> = {
  gmail_search: "Gmail Search",
  gmail_read_message: "Reading Email",
  gmail_read_thread: "Reading Thread",
  gmail_create_draft: "Creating Draft",
};

export default function ToolCallBadge({ toolName }: { toolName: string }) {
  const label = TOOL_LABELS[toolName] || toolName;

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-dm-surface-raised px-2 py-0.5 text-[10px] font-medium text-dm-text-muted">
      <span className="h-1 w-1 rounded-full bg-dm-text-muted" />
      {label}
    </span>
  );
}
