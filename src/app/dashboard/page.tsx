"use client";

import { useState, useEffect, useCallback } from "react";
import { HiOutlineSparkles, HiOutlineArrowPath } from "react-icons/hi2";

interface Email {
  id: string;
  threadId: string;
  from: string;
  subject: string;
  date: string;
  snippet: string;
  body: string;
  labelIds: string[];
}

export default function InboxPage() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [selected, setSelected] = useState<Email | null>(null);
  const [loading, setLoading] = useState(true);
  const [drafting, setDrafting] = useState<string | null>(null);

  const fetchEmails = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/emails");
      if (res.ok) {
        const data = await res.json();
        setEmails(data);
      }
    } catch (err) {
      console.error("Failed to fetch emails:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

  async function handleDraftReply(email: Email) {
    setDrafting(email.id);
    try {
      const res = await fetch("/api/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageId: email.id,
          threadId: email.threadId,
          from: email.from,
          subject: email.subject,
          snippet: email.snippet,
          body: email.body,
        }),
      });

      if (res.ok) {
        alert("Draft created! Check your Gmail Drafts or the Drafts tab.");
      } else {
        const err = await res.json();
        alert(`Error: ${err.error}`);
      }
    } catch (err) {
      console.error("Failed to create draft:", err);
      alert("Failed to create draft");
    } finally {
      setDrafting(null);
    }
  }

  function formatSender(from: string) {
    const match = from.match(/^(.+?)\s*<.*>$/);
    return match ? match[1].replace(/"/g, "") : from;
  }

  return (
    <div className="flex h-full">
      {/* Email List */}
      <div className="w-96 border-r border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
            Inbox
          </h2>
          <button
            onClick={fetchEmails}
            className="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <HiOutlineArrowPath className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900" />
          </div>
        ) : emails.length === 0 ? (
          <div className="p-6 text-center text-sm text-zinc-500">
            No emails found. Make sure Gmail access is connected.
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {emails.map((email) => (
              <button
                key={email.id}
                onClick={() => setSelected(email)}
                className={`w-full px-6 py-4 text-left transition-colors ${
                  selected?.id === email.id
                    ? "bg-zinc-100 dark:bg-zinc-800"
                    : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                }`}
              >
                <p className="truncate text-sm font-medium text-zinc-900 dark:text-white">
                  {formatSender(email.from)}
                </p>
                <p className="mt-0.5 truncate text-sm text-zinc-700 dark:text-zinc-300">
                  {email.subject}
                </p>
                <p className="mt-1 line-clamp-2 text-xs text-zinc-500">
                  {email.snippet}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Email Detail */}
      <div className="flex-1 overflow-auto">
        {selected ? (
          <div className="p-8">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">
                  {selected.subject}
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  From: {selected.from}
                </p>
                <p className="text-xs text-zinc-400">{selected.date}</p>
              </div>
              <button
                onClick={() => handleDraftReply(selected)}
                disabled={drafting === selected.id}
                className="flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                {drafting === selected.id ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white dark:border-zinc-900/30 dark:border-t-zinc-900" />
                    Drafting...
                  </>
                ) : (
                  <>
                    <HiOutlineSparkles className="h-4 w-4" />
                    Draft Reply
                  </>
                )}
              </button>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-800">
              <pre className="whitespace-pre-wrap font-sans text-sm text-zinc-700 dark:text-zinc-300">
                {selected.body || selected.snippet}
              </pre>
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-zinc-400">
            Select an email to view
          </div>
        )}
      </div>
    </div>
  );
}
