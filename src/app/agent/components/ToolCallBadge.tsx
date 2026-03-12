"use client";

const TOOL_LABELS: Record<string, string> = {
  gmail_search: "Gmail Search",
  gmail_read_message: "Reading Email",
  gmail_read_thread: "Reading Thread",
  gmail_create_draft: "Creating Draft",
  calendar_list_events: "Checking Calendar",
  calendar_get_event: "Reading Event",
  calendar_create_event: "Creating Event",
  drive_search: "Searching Drive",
  drive_get_file: "Reading File",
  drive_list_folder: "Browsing Folder",
};

export default function ToolCallBadge({ toolName }: { toolName: string }) {
  const label = TOOL_LABELS[toolName] || toolName;

  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
      style={{
        backgroundColor: "var(--agent-accent-dim)",
        color: "var(--agent-accent)",
        fontFamily: "var(--font-dm-mono), monospace",
      }}
    >
      <span
        className="h-1 w-1 rounded-full"
        style={{ backgroundColor: "var(--agent-accent)" }}
      />
      {label}
    </span>
  );
}
