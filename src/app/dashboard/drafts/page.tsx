"use client";

import { useState, useEffect, useCallback } from "react";
import {
  HiOutlineCheck,
  HiOutlineTrash,
  HiOutlineArrowPath,
} from "react-icons/hi2";

interface Draft {
  id: string;
  originalFrom: string;
  originalSubject: string;
  originalSnippet: string;
  draftBody: string;
  status: string;
  createdAt: string;
}

export default function DraftsPage() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [selected, setSelected] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDrafts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/drafts");
      if (res.ok) {
        const data = await res.json();
        setDrafts(data);
      }
    } catch (err) {
      console.error("Failed to fetch drafts:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDrafts();
  }, [fetchDrafts]);

  async function updateStatus(id: string, status: string) {
    const res = await fetch(`/api/drafts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    if (res.ok) {
      setDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, status } : d)));
      if (selected?.id === id) setSelected((s) => s && { ...s, status });
    }
  }

  function statusBadge(status: string) {
    const styles: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      sent_to_gmail: "bg-blue-100 text-blue-800",
      approved: "bg-green-100 text-green-800",
      discarded: "bg-red-100 text-red-800",
    };
    return (
      <span
        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] || "bg-zinc-100 text-zinc-800"}`}
      >
        {status.replace("_", " ")}
      </span>
    );
  }

  return (
    <div className="flex h-full">
      <div className="w-96 border-r border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
            AI Drafts
          </h2>
          <button
            onClick={fetchDrafts}
            className="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <HiOutlineArrowPath className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900" />
          </div>
        ) : drafts.length === 0 ? (
          <div className="p-6 text-center text-sm text-zinc-500">
            No drafts yet. Go to Inbox and click &quot;Draft Reply&quot; on an
            email.
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {drafts.map((draft) => (
              <button
                key={draft.id}
                onClick={() => setSelected(draft)}
                className={`w-full px-6 py-4 text-left transition-colors ${
                  selected?.id === draft.id
                    ? "bg-zinc-100 dark:bg-zinc-800"
                    : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="truncate text-sm font-medium text-zinc-900 dark:text-white">
                    Re: {draft.originalSubject}
                  </p>
                  {statusBadge(draft.status)}
                </div>
                <p className="mt-0.5 truncate text-xs text-zinc-500">
                  To: {draft.originalFrom}
                </p>
                <p className="mt-1 line-clamp-2 text-xs text-zinc-400">
                  {draft.draftBody}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto">
        {selected ? (
          <div className="p-8">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">
                  Re: {selected.originalSubject}
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  To: {selected.originalFrom}
                </p>
                <div className="mt-2">{statusBadge(selected.status)}</div>
              </div>
              {selected.status === "sent_to_gmail" && (
                <div className="flex gap-2">
                  <button
                    onClick={() => updateStatus(selected.id, "approved")}
                    className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700"
                  >
                    <HiOutlineCheck className="h-4 w-4" />
                    Approve
                  </button>
                  <button
                    onClick={() => updateStatus(selected.id, "discarded")}
                    className="flex items-center gap-1 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
                  >
                    <HiOutlineTrash className="h-4 w-4" />
                    Discard
                  </button>
                </div>
              )}
            </div>

            <div className="mb-4 rounded-lg border border-zinc-200 bg-zinc-100 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
              <p className="mb-1 text-xs font-medium uppercase text-zinc-500">
                Original Email
              </p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {selected.originalSnippet}
              </p>
            </div>

            <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-800">
              <p className="mb-2 text-xs font-medium uppercase text-zinc-500">
                AI-Generated Draft
              </p>
              <pre className="whitespace-pre-wrap font-sans text-sm text-zinc-700 dark:text-zinc-300">
                {selected.draftBody}
              </pre>
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-zinc-400">
            Select a draft to view
          </div>
        )}
      </div>
    </div>
  );
}
