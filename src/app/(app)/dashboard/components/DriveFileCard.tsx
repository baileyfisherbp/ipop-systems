"use client";

import { ExternalLink } from "lucide-react";
import { DriveFileItem } from "../hooks/useAgentStream";

function getFileIcon(type?: string, mimeType?: string): { icon: string; color: string } {
  const t = (type || mimeType || "").toLowerCase();
  if (t.includes("doc") || t.includes("document")) return { icon: "doc", color: "text-blue-400 bg-blue-500/10" };
  if (t.includes("sheet") || t.includes("spreadsheet") || t.includes("csv")) return { icon: "xls", color: "text-green-400 bg-green-500/10" };
  if (t.includes("slide") || t.includes("presentation")) return { icon: "ppt", color: "text-orange-400 bg-orange-500/10" };
  if (t.includes("pdf")) return { icon: "pdf", color: "text-red-400 bg-red-500/10" };
  if (t.includes("image") || t.includes("png") || t.includes("jpg") || t.includes("jpeg")) return { icon: "img", color: "text-purple-400 bg-purple-500/10" };
  if (t.includes("folder")) return { icon: "dir", color: "text-yellow-400 bg-yellow-500/10" };
  if (t.includes("video")) return { icon: "vid", color: "text-pink-400 bg-pink-500/10" };
  if (t.includes("form")) return { icon: "form", color: "text-purple-400 bg-purple-500/10" };
  return { icon: "file", color: "text-dm-text-muted bg-dm-border/50" };
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
  const { icon, color } = getFileIcon(file.type, file.mimeType);

  return (
    <div className="group rounded-xl border border-dm-border/80 bg-dm-surface-raised/60 backdrop-blur-sm transition-all hover:border-dm-border">
      <div className="flex items-center gap-3 px-4 py-3">
        {/* File type icon */}
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${color}`}>
          <span className="text-[10px] font-bold uppercase">{icon}</span>
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-dm-text">
            {file.name}
          </span>
          <div className="mt-0.5 flex items-center gap-2 text-[11px] text-dm-text-muted/60">
            {file.type && <span>{file.type}</span>}
            {file.type && (file.size || file.modifiedTime) && <span>·</span>}
            {file.size && <span>{file.size}</span>}
            {file.size && file.modifiedTime && <span>·</span>}
            {file.modifiedTime && <span>{formatDate(file.modifiedTime)}</span>}
          </div>
          {file.owner && (
            <div className="mt-0.5 text-[11px] text-dm-text-muted/50">
              {file.owner}
            </div>
          )}
        </div>

        {/* Open link */}
        {file.webViewLink && (
          <a
            href={file.webViewLink}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 rounded-md p-1.5 text-dm-text-muted/50 transition-colors hover:bg-dm-surface-raised hover:text-dm-text"
            title="Open in Google Drive"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
    </div>
  );
}
