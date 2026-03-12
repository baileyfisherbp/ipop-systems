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

  return (
    <div className="shrink-0 border-t border-dm-border px-6 py-4">
      <div className="mx-auto flex max-w-3xl items-end gap-3 rounded-xl border border-dm-border bg-dm-surface px-4 py-3">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about bookings, staff, finances, members..."
          rows={1}
          disabled={disabled}
          className="flex-1 resize-none bg-transparent text-sm text-dm-text outline-none placeholder:text-dm-text-muted"
        />
        <button
          onClick={handleSubmit}
          disabled={disabled || !value.trim()}
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors disabled:opacity-30 ${
            value.trim() && !disabled
              ? "bg-dm-text text-dm-bg"
              : "bg-dm-border text-dm-text-muted"
          }`}
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      </div>
      <p className="mt-2 text-center text-[10px] text-dm-text-muted">
        Connected to live IPOP data sources. Actions require confirmation.
      </p>
    </div>
  );
}
