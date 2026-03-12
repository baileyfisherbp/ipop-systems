"use client";

import { useState } from "react";

export default function GmailWatchToggle({
  initialActive,
}: {
  initialActive: boolean;
}) {
  const [active, setActive] = useState(initialActive);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleToggle = async () => {
    setLoading(true);
    setError(null);
    try {
      if (active) {
        const res = await fetch("/api/gmail/watch", { method: "DELETE" });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(
            data?.error ?? `Failed to disable Gmail watch (${res.status})`
          );
        }
        setActive(false);
      } else {
        const res = await fetch("/api/gmail/watch", { method: "POST" });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(
            data?.error ?? `Failed to enable Gmail watch (${res.status})`
          );
        }
        setActive(true);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred";
      setError(message);
      console.error("Failed to toggle Gmail watch:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleToggle}
        disabled={loading}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand-lime disabled:opacity-50 disabled:cursor-not-allowed ${
          active ? "bg-brand-lime" : "bg-dm-border"
        }`}
        role="switch"
        aria-checked={active}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ${
            active ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>

      {error && (
        <div className="mt-3 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <p className="font-medium">Gmail auto-draft error</p>
          <p className="mt-1 text-red-400/80">{error}</p>
        </div>
      )}
    </div>
  );
}
