"use client";

import { ExternalLink } from "lucide-react";
import { DriveFileItem } from "../hooks/useAgentStream";

function getFileIcon(type?: string, mimeType?: string): { icon: string; color: string; bg: string } {
  const t = (type || mimeType || "").toLowerCase();
  if (t.includes("doc") || t.includes("document")) return { icon: "doc", color: "text-blue-400", bg: "bg-blue-500/10" };
  if (t.includes("sheet") || t.includes("spreadsheet") || t.includes("csv")) return { icon: "xls", color: "text-green-400", bg: "bg-green-500/10" };
  if (t.includes("slide") || t.includes("presentation")) return { icon: "ppt", color: "text-orange-400", bg: "bg-orange-500/10" };
  if (t.includes("pdf")) return { icon: "pdf", color: "text-red-400", bg: "bg-red-500/10" };
  if (t.includes("image") || t.includes("png") || t.includes("jpg") || t.includes("jpeg")) return { icon: "img", color: "text-purple-400", bg: "bg-purple-500/10" };
  if (t.includes("folder")) return { icon: "dir", color: "text-yellow-400", bg: "bg-yellow-500/10" };
  if (t.includes("video")) return { icon: "vid", color: "text-pink-400", bg: "bg-pink-500/10" };
  if (t.includes("form")) return { icon: "form", color: "text-purple-400", bg: "bg-purple-500/10" };
  return { icon: "file", color: "", bg: "" };
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "";
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return date.toLocaleDateString([], { weekday: "long" });
    return date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return dateStr;
  }
}

export default function DriveFileCard({ file }: { file: DriveFileItem }) {
  const { icon, color, bg } = getFileIcon(file.type, file.mimeType);

  return (
    <div
      className="group rounded-xl transition-all"
      style={{ border: "1px solid var(--agent-border)", backgroundColor: "rgba(255,255,255,0.03)" }}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${color} ${bg}`}
          style={!bg ? { backgroundColor: "rgba(255,255,255,0.06)" } : undefined}
        >
          <span className="text-[10px] font-bold uppercase" style={!color ? { color: "var(--agent-text-secondary)" } : undefined}>
            {icon}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium" style={{ color: "var(--agent-text-primary)" }}>
            {file.name}
          </span>
          <div className="mt-0.5 flex items-center gap-2 text-[11px]" style={{ color: "var(--agent-text-secondary)", opacity: 0.6 }}>
            {file.type && <span>{file.type}</span>}
            {file.type && (file.size || file.modifiedTime) && <span>·</span>}
            {file.size && <span>{file.size}</span>}
            {file.size && file.modifiedTime && <span>·</span>}
            {file.modifiedTime && <span>{formatDate(file.modifiedTime)}</span>}
          </div>
          {file.owner && (
            <div className="mt-0.5 text-[11px]" style={{ color: "var(--agent-text-secondary)", opacity: 0.4 }}>
              {file.owner}
            </div>
          )}
        </div>

        {file.webViewLink && (
          <a
            href={file.webViewLink}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 rounded-md p-1.5 transition-colors"
            style={{ color: "var(--agent-text-secondary)" }}
            title="Open in Google Drive"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
    </div>
  );
}
