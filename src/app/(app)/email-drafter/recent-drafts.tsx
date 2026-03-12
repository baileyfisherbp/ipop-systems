"use client";

import { useState } from "react";

interface Draft {
  id: string;
  subject: string | null;
  body: string | null;
  recipientTo: string | null;
  context: string | null;
  gmailDraftId: string | null;
  createdAt: Date;
}

export default function RecentDrafts({ drafts }: { drafts: Draft[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (drafts.length === 0) return null;

  return (
    <div className="mt-8">
      <h3 className="mb-3 text-sm font-medium text-dm-text">
        Recent Auto-Drafts
      </h3>
      <div className="space-y-2">
        {drafts.map((draft) => (
          <div
            key={draft.id}
            className="rounded-2xl border border-dm-border bg-dm-surface"
          >
            <button
              onClick={() =>
                setExpanded(expanded === draft.id ? null : draft.id)
              }
              className="flex w-full items-start justify-between p-4 text-left"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-dm-text">
                  {draft.subject ?? "(no subject)"}
                </p>
                <p className="mt-0.5 truncate text-xs text-dm-text-muted">
                  {draft.recipientTo
                    ? `To: ${draft.recipientTo}`
                    : draft.context}
                  {" · "}
                  {new Date(draft.createdAt).toLocaleString()}
                </p>
              </div>
              <svg
                className={`ml-2 mt-1 h-4 w-4 shrink-0 text-dm-text-muted transition-transform duration-200 ${
                  expanded === draft.id ? "rotate-180" : ""
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            {expanded === draft.id && draft.body && (
              <div className="border-t border-dm-border px-4 py-3">
                <pre className="whitespace-pre-wrap text-sm leading-relaxed text-dm-text">
                  {draft.body}
                </pre>
                {draft.gmailDraftId && (
                  <p className="mt-2 text-xs text-dm-text-muted">
                    Saved to Gmail Drafts
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
