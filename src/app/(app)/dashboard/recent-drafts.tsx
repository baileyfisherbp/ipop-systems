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
      <h3 className="mb-3 text-sm font-medium text-zinc-900 dark:text-zinc-100">
        Recent Auto-Drafts
      </h3>
      <div className="space-y-2">
        {drafts.map((draft) => (
          <div
            key={draft.id}
            className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
          >
            <button
              onClick={() =>
                setExpanded(expanded === draft.id ? null : draft.id)
              }
              className="flex w-full items-start justify-between p-4 text-left"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {draft.subject ?? "(no subject)"}
                </p>
                <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
                  {draft.recipientTo
                    ? `To: ${draft.recipientTo}`
                    : draft.context}
                  {" · "}
                  {new Date(draft.createdAt).toLocaleString()}
                </p>
              </div>
              <svg
                className={`ml-2 mt-1 h-4 w-4 shrink-0 text-zinc-400 transition-transform ${
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
              <div className="border-t border-zinc-100 px-4 py-3 dark:border-zinc-800">
                <pre className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                  {draft.body}
                </pre>
                {draft.gmailDraftId && (
                  <p className="mt-2 text-xs text-zinc-400">
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
