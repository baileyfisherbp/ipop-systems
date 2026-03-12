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
    <div className="grid grid-cols-2 gap-2">
      {SUGGESTED_PROMPTS.map((prompt, i) => (
        <button
          key={prompt}
          onClick={() => onSelect(prompt)}
          className="group rounded-xl border border-dm-border/60 px-4 py-3 text-left text-xs leading-snug text-dm-text-muted/70 transition-all duration-200 hover:border-dm-text-muted/30 hover:bg-dm-surface hover:text-dm-text"
          style={{ animationDelay: `${i * 50}ms` }}
        >
          {prompt}
        </button>
      ))}
    </div>
  );
}
