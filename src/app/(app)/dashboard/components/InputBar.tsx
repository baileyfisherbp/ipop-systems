"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { ArrowUp } from "lucide-react";

interface InputBarProps {
  onSend: (message: string) => void;
  disabled: boolean;
}

export default function InputBar({ onSend, disabled }: InputBarProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 160) + "px";
  }, [value]);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const active = value.trim() && !disabled;

  return (
    <div className="shrink-0 px-6 pb-5 pt-3">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-end gap-3 rounded-2xl border border-dm-border bg-dm-surface px-4 py-3 transition-colors focus-within:border-dm-text-muted/30">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message IPOP AI..."
            rows={1}
            disabled={disabled}
            className="flex-1 resize-none bg-transparent text-sm leading-relaxed text-dm-text outline-none placeholder:text-dm-text-muted/60"
          />
          <button
            onClick={handleSubmit}
            disabled={disabled || !value.trim()}
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all ${
              active
                ? "bg-white text-black"
                : "bg-dm-border/50 text-dm-text-muted opacity-50"
            }`}
          >
            <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
          </button>
        </div>
        <p className="mt-2 text-center text-[10px] text-dm-text-muted/50">
          Connected to live data sources. Actions require confirmation.
        </p>
      </div>
    </div>
  );
}
