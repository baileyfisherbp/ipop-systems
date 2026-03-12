"use client";

import { Calendar, MapPin, Users, ExternalLink } from "lucide-react";
import { useState } from "react";
import { CalendarEventItem } from "../hooks/useAgentStream";

function formatEventTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    if (dateStr.length === 10) {
      return date.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
    }
    return date.toLocaleString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

function formatTimeRange(start: string, end: string): string {
  try {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const sameDay = startDate.toDateString() === endDate.toDateString();

    if (start.length === 10) {
      if (start === end || !end) return formatEventTime(start);
      return `${formatEventTime(start)} – ${formatEventTime(end)}`;
    }

    const startStr = formatEventTime(start);
    if (sameDay) {
      const endTime = endDate.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
      return `${startStr} – ${endTime}`;
    }
    return `${startStr} – ${formatEventTime(end)}`;
  } catch {
    return `${start} – ${end}`;
  }
}

function getStatusColor(status?: string): string {
  switch (status) {
    case "accepted": return "text-green-400";
    case "declined": return "text-red-400";
    case "tentative": return "text-yellow-400";
    default: return "";
  }
}

export default function CalendarEventCard({ event }: { event: CalendarEventItem }) {
  const [expanded, setExpanded] = useState(false);
  const hasDetails = (event.attendees && event.attendees.length > 0) || event.description;

  return (
    <div
      className="group rounded-xl transition-all"
      style={{ border: "1px solid var(--agent-border)", backgroundColor: "rgba(255,255,255,0.03)" }}
    >
      <div
        className={`flex items-start gap-3 px-4 py-3 ${hasDetails ? "cursor-pointer" : ""}`}
        onClick={() => hasDetails && setExpanded(!expanded)}
      >
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500/10">
          <Calendar className="h-3.5 w-3.5 text-blue-400" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium" style={{ color: "var(--agent-text-primary)" }}>
              {event.summary || "(No title)"}
            </span>
            {event.htmlLink && (
              <a
                href={event.htmlLink}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="shrink-0 rounded-md p-1 transition-colors hover:text-blue-400"
                style={{ color: "var(--agent-text-secondary)" }}
                title="Open in Google Calendar"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>

          <p className="mt-1 text-xs" style={{ color: "var(--agent-text-secondary)" }}>
            {formatTimeRange(event.start, event.end)}
          </p>

          {event.location && (
            <div className="mt-1 flex items-center gap-1">
              <MapPin className="h-3 w-3" style={{ color: "var(--agent-text-secondary)", opacity: 0.5 }} />
              <span className="truncate text-[11px]" style={{ color: "var(--agent-text-secondary)", opacity: 0.5 }}>
                {event.location}
              </span>
            </div>
          )}

          {!expanded && event.attendees && event.attendees.length > 0 && (
            <div className="mt-1.5 flex items-center gap-1">
              <Users className="h-3 w-3" style={{ color: "var(--agent-text-secondary)", opacity: 0.5 }} />
              <span className="text-[11px]" style={{ color: "var(--agent-text-secondary)", opacity: 0.5 }}>
                {event.attendees.length} attendee{event.attendees.length !== 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>
      </div>

      {expanded && hasDetails && (
        <div className="px-4 py-3" style={{ borderTop: "1px solid var(--agent-border)" }}>
          {event.description && (
            <p className="mb-2 whitespace-pre-wrap text-xs leading-relaxed" style={{ color: "var(--agent-text-primary)", opacity: 0.8 }}>
              {event.description}
            </p>
          )}
          {event.attendees && event.attendees.length > 0 && (
            <div className="space-y-1">
              <p className="text-[11px] font-medium" style={{ color: "var(--agent-text-secondary)" }}>Attendees</p>
              {event.attendees.map((a, i) => (
                <div key={i} className="flex items-center justify-between text-[11px]">
                  <span className="truncate" style={{ color: "var(--agent-text-primary)", opacity: 0.8 }}>
                    {a.name || a.email}
                  </span>
                  <span className={`shrink-0 capitalize ${getStatusColor(a.status)}`} style={!getStatusColor(a.status) ? { color: "var(--agent-text-secondary)" } : undefined}>
                    {a.status === "needsAction" ? "pending" : a.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
