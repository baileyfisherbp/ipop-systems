"use client";

const SUGGESTED_PROMPTS = [
  "Summarize my unread emails",
  "What meetings do I have today?",
  "Draft a follow-up email to my last client thread",
  "Find recent files shared with me on Drive",
  "Any emails I haven't responded to this week?",
  "Show my calendar for the rest of the week",
];

interface SuggestionChipsProps {
  onSelect: (prompt: string) => void;
}

export default function SuggestionChips({ onSelect }: SuggestionChipsProps) {
  return (
    <div className="grid grid-cols-2 items-start gap-2">
      {SUGGESTED_PROMPTS.map((prompt, i) => (
        <button
          key={prompt}
          onClick={() => onSelect(prompt)}
          className="group truncate whitespace-nowrap rounded-xl border border-dm-border px-4 py-3 text-left text-xs leading-snug text-dm-text/80 transition-all duration-200 hover:border-dm-text-muted/50 hover:bg-dm-surface-raised hover:text-dm-text"
          style={{ animationDelay: `${i * 50}ms` }}
        >
          {prompt}
        </button>
      ))}
    </div>
  );
}
