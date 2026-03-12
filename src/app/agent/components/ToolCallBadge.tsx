"use client";

const TOOL_LABELS: Record<string, string> = {
  get_court_bookings: "Bookings & Courts",
  get_staff_schedules: "Staff & Scheduling",
  generate_schedule: "Schedule Generator",
  get_financial_data: "Finance",
  search_drive: "Google Drive",
  get_calendar_events: "Calendar",
  get_shop_inventory: "Pro Shop",
  get_member_data: "Members",
  send_sms_campaign: "Comms",
  get_analytics: "Analytics",
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
