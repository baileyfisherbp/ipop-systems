"use client";

const SUGGESTED_PROMPTS = [
  "Summarize my unread emails from today",
  "Draft a follow-up to my last conversation with a client",
  "What emails need a response this week?",
  "Draft a meeting request for next Tuesday",
  "Summarize the email thread about the new project",
  "Help me write a professional decline to a sales pitch",
];

interface SuggestionChipsProps {
  onSelect: (prompt: string) => void;
}

export default function SuggestionChips({ onSelect }: SuggestionChipsProps) {
  return (
    <div className="grid max-w-2xl grid-cols-2 gap-2">
      {SUGGESTED_PROMPTS.map((prompt) => (
        <button
          key={prompt}
          onClick={() => onSelect(prompt)}
          className="rounded-xl border px-4 py-3 text-left text-xs leading-snug transition-colors hover:bg-white/5"
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
