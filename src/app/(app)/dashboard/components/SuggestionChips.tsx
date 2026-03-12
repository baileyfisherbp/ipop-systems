"use client";

const SUGGESTED_PROMPTS = [
  "What's our court utilization rate for Burnaby this week?",
  "Generate next week's staff schedule across all locations",
  "Which members haven't booked in 30+ days?",
  "What's our revenue per court hour vs last month?",
  "Draft an SMS campaign for Thursday evening open courts",
  "Flag any low inventory items in the pro shop",
  "What events are coming up in the next 2 weeks?",
  "Show me our top 10 most active members this month",
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
