"use client";

import {
  createContext,
  forwardRef,
  useContext,
  useState,
  useRef,
  useEffect,
  useCallback,
} from "react";
import { cn } from "@/lib/utils";

// Context for delay configuration
const TooltipDelayContext = createContext(300);

export function TooltipProvider({
  delayDuration = 300,
  children,
}: {
  delayDuration?: number;
  children: React.ReactNode;
}) {
  return (
    <TooltipDelayContext.Provider value={delayDuration}>
      {children}
    </TooltipDelayContext.Provider>
  );
}

// Context for open state within a single Tooltip
interface TooltipContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  delay: number;
  triggerRef: React.RefObject<HTMLElement | null>;
}
const TooltipContext = createContext<TooltipContextValue | null>(null);

export function Tooltip({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const delay = useContext(TooltipDelayContext);
  const triggerRef = useRef<HTMLElement | null>(null);

  return (
    <TooltipContext.Provider value={{ open, setOpen, delay, triggerRef }}>
      {children}
    </TooltipContext.Provider>
  );
}

export const TooltipTrigger = forwardRef<
  HTMLElement,
  React.HTMLAttributes<HTMLElement> & { asChild?: boolean }
>(({ children, asChild, ...props }, _ref) => {
  const ctx = useContext(TooltipContext)!;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleEnter = useCallback(() => {
    timerRef.current = setTimeout(() => ctx.setOpen(true), ctx.delay);
  }, [ctx]);

  const handleLeave = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    ctx.setOpen(false);
  }, [ctx]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (asChild && children) {
    // Clone the child element and inject handlers
    const child = children as React.ReactElement<Record<string, unknown>>;
    return (
      <span
        ref={(el) => {
          ctx.triggerRef.current = el;
        }}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        onFocus={handleEnter}
        onBlur={handleLeave}
        {...props}
      >
        {child}
      </span>
    );
  }

  return (
    <span
      ref={(el) => {
        ctx.triggerRef.current = el;
      }}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onFocus={handleEnter}
      onBlur={handleLeave}
      {...props}
    >
      {children}
    </span>
  );
});
TooltipTrigger.displayName = "TooltipTrigger";

export const TooltipContent = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  const ctx = useContext(TooltipContext)!;

  if (!ctx.open) return null;

  return (
    <div
      ref={ref}
      className={cn(
        "absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 rounded-md bg-zinc-900 px-3 py-1.5 text-xs text-white shadow-md dark:bg-zinc-100 dark:text-zinc-900",
        "animate-in fade-in-0 zoom-in-95",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});
TooltipContent.displayName = "TooltipContent";
