"use client";

import { useState } from "react";

interface Draft {
  id: string;
  subject: string | null;
  body: string | null;
  recipientTo: string | null;
  context: string | null;
  gmailDraftId: string | null;
  rating?: number | null;
  feedback?: string | null;
  createdAt: Date;
}

function FeedbackSection({
  draft,
  onFeedbackSaved,
}: {
  draft: Draft;
  onFeedbackSaved: (id: string, rating: number, feedback: string | null) => void;
}) {
  const [rating, setRating] = useState<number | null>(draft.rating ?? null);
  const [feedback, setFeedback] = useState(draft.feedback ?? "");
  const [showFeedbackInput, setShowFeedbackInput] = useState(!!draft.feedback);
  const [saving, setSaving] = useState(false);

  const handleRate = async (newRating: number) => {
    const r = rating === newRating ? null : newRating;
    setRating(r);
    setSaving(true);
    try {
      const res = await fetch(`/api/drafts/${draft.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: r }),
      });
      if (res.ok) onFeedbackSaved(draft.id, r ?? 0, feedback || null);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitFeedback = async () => {
    if (!feedback.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/drafts/${draft.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback: feedback.trim() }),
      });
      if (res.ok) {
        onFeedbackSaved(draft.id, rating ?? 0, feedback.trim());
        setShowFeedbackInput(false);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-3 pt-2">
      <div className="flex items-center gap-1">
        <button
          onClick={() => handleRate(1)}
          disabled={saving}
          title="Good draft"
          className={`rounded-md p-1.5 transition-colors ${
            rating === 1
              ? "bg-green-500/20 text-green-400"
              : "text-dm-text-muted hover:text-green-400 hover:bg-green-500/10"
          }`}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z" />
          </svg>
        </button>
        <button
          onClick={() => handleRate(-1)}
          disabled={saving}
          title="Needs improvement"
          className={`rounded-md p-1.5 transition-colors ${
            rating === -1
              ? "bg-red-500/20 text-red-400"
              : "text-dm-text-muted hover:text-red-400 hover:bg-red-500/10"
          }`}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3H10z" />
          </svg>
        </button>
      </div>

      {!showFeedbackInput && !draft.feedback ? (
        <button
          onClick={() => setShowFeedbackInput(true)}
          className="text-xs text-dm-text-muted hover:text-dm-text transition-colors"
        >
          Add note
        </button>
      ) : null}

      {showFeedbackInput && (
        <div className="flex flex-1 items-center gap-2">
          <input
            type="text"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmitFeedback()}
            placeholder="What could be better? e.g. 'too formal', 'wrong product mentioned'"
            className="flex-1 rounded-lg border border-dm-border bg-dm-surface-raised px-3 py-1.5 text-xs text-dm-text placeholder:text-dm-text-muted focus:outline-none focus:ring-1 focus:ring-brand-lime"
          />
          <button
            onClick={handleSubmitFeedback}
            disabled={saving || !feedback.trim()}
            className="rounded-lg bg-success px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
          >
            Save
          </button>
        </div>
      )}

      {!showFeedbackInput && draft.feedback && (
        <button
          onClick={() => setShowFeedbackInput(true)}
          className="truncate text-xs text-dm-text-muted italic hover:text-dm-text transition-colors"
          title={draft.feedback}
        >
          &ldquo;{draft.feedback}&rdquo;
        </button>
      )}
    </div>
  );
}

export default function RecentDrafts({ drafts: initialDrafts }: { drafts: Draft[] }) {
  const [drafts, setDrafts] = useState(initialDrafts);
  const [expanded, setExpanded] = useState<string | null>(null);

  if (drafts.length === 0) return null;

  const handleFeedbackSaved = (id: string, rating: number, feedback: string | null) => {
    setDrafts((prev) =>
      prev.map((d) => (d.id === id ? { ...d, rating, feedback } : d))
    );
  };

  return (
    <div className="mt-8">
      <h3 className="mb-3 text-sm font-medium text-dm-text">
        Recent Drafts
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
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium text-dm-text">
                    {draft.subject ?? "(no subject)"}
                  </p>
                  {draft.rating === 1 && (
                    <span className="shrink-0 text-green-400" title="Rated good">
                      <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z" />
                      </svg>
                    </span>
                  )}
                  {draft.rating === -1 && (
                    <span className="shrink-0 text-red-400" title="Needs improvement">
                      <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3H10z" />
                      </svg>
                    </span>
                  )}
                </div>
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
            {expanded === draft.id && (
              <div className="border-t border-dm-border px-4 py-3">
                {draft.body && (
                  <pre className="whitespace-pre-wrap text-sm leading-relaxed text-dm-text">
                    {draft.body}
                  </pre>
                )}
                {draft.gmailDraftId && (
                  <p className="mt-2 text-xs text-dm-text-muted">
                    Saved to Gmail Drafts
                  </p>
                )}
                <FeedbackSection
                  draft={draft}
                  onFeedbackSaved={handleFeedbackSaved}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
