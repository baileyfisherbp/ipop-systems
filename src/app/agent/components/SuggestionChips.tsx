"use client";

const SUGGESTED_PROMPTS = [
  "Summarize today's unread emails",
  "Draft a client follow-up",
  "Emails needing a response",
  "Draft a meeting request",
  "Summarize a recent thread",
  "Decline a sales pitch",
];

interface SuggestionChipsProps {
  onSelect: (prompt: string) => void;
}

export default function SuggestionChips({ onSelect }: SuggestionChipsProps) {
  return (
    <div className="grid max-w-2xl grid-cols-2 items-start gap-2">
      {SUGGESTED_PROMPTS.map((prompt) => (
        <button
          key={prompt}
          onClick={() => onSelect(prompt)}
          className="truncate whitespace-nowrap rounded-xl border px-4 py-3 text-left text-xs leading-snug transition-colors hover:bg-white/5"
          style={{
            borderColor: "var(--agent-border)",
            color: "var(--agent-text-secondary)",
            fontFamily: "var(--font-dm-sans), sans-serif",
          }}
        >
          {prompt}
        </button>
      ))}
    </div>
  );
}
