"use client";

import { useState, useEffect } from "react";

interface UserContext {
  companyName?: string;
  companyDescription?: string;
  role?: string;
  writingStyle?: string;
  signatureBlock?: string;
  additionalNotes?: string;
}

export default function SettingsPage() {
  const [context, setContext] = useState<UserContext>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/context")
      .then((r) => r.json())
      .then(setContext)
      .catch(console.error);
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);

    try {
      const res = await fetch("/api/context", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(context),
      });

      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (err) {
      console.error("Failed to save:", err);
    } finally {
      setSaving(false);
    }
  }

  function field(
    label: string,
    key: keyof UserContext,
    type: "input" | "textarea",
    placeholder: string,
    hint?: string
  ) {
    return (
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {label}
        </label>
        {hint && <p className="mt-0.5 text-xs text-zinc-400">{hint}</p>}
        {type === "input" ? (
          <input
            type="text"
            value={context[key] || ""}
            onChange={(e) => setContext({ ...context, [key]: e.target.value })}
            placeholder={placeholder}
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
          />
        ) : (
          <textarea
            value={context[key] || ""}
            onChange={(e) => setContext({ ...context, [key]: e.target.value })}
            placeholder={placeholder}
            rows={4}
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
          />
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl p-8">
      <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">
        Settings
      </h2>
      <p className="mt-1 text-sm text-zinc-500">
        Configure your AI assistant with context about you and your company.
        This information shapes how drafts are written.
      </p>

      <form onSubmit={handleSave} className="mt-8 space-y-6">
        {field(
          "Company Name",
          "companyName",
          "input",
          "Acme Corp"
        )}
        {field(
          "Company Description",
          "companyDescription",
          "textarea",
          "We are a B2B SaaS company that provides...",
          "What does your company do? This helps the AI understand context."
        )}
        {field(
          "Your Role",
          "role",
          "input",
          "CEO, Sales Manager, etc."
        )}
        {field(
          "Writing Style",
          "writingStyle",
          "textarea",
          "Professional but friendly. Keep responses concise. Use first names...",
          "How should your emails sound? The AI will try to match this."
        )}
        {field(
          "Email Signature",
          "signatureBlock",
          "textarea",
          "Best regards,\nJohn Doe\nCEO, Acme Corp\n(555) 123-4567",
          "Your email signature to append to drafts."
        )}
        {field(
          "Additional Notes",
          "additionalNotes",
          "textarea",
          "Never offer discounts. Always mention our free trial...",
          "Any other instructions for the AI when drafting replies."
        )}

        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-zinc-900 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
          {saved && (
            <span className="text-sm text-green-600">Settings saved!</span>
          )}
        </div>
      </form>
    </div>
  );
}
