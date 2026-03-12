"use client";

import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { X, CheckCircle2, Info, AlertTriangle, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface Toast {
  id: string;
  title: string;
  message: string;
  type?: "success" | "info" | "warning";
  link?: string | null;
  duration?: number;
}

interface ToastContextValue {
  addToast: (toast: Omit<Toast, "id">) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

const ICON_MAP = {
  success: CheckCircle2,
  info: Info,
  warning: AlertTriangle,
};

const COLOR_MAP = {
  success: "border-green-500/30 bg-white dark:bg-card",
  info: "border-blue-500/30 bg-white dark:bg-card",
  warning: "border-yellow-500/30 bg-white dark:bg-card",
};

const ICON_COLOR_MAP = {
  success: "text-green-600",
  info: "text-blue-600",
  warning: "text-yellow-600",
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const router = useRouter();
  const [exiting, setExiting] = useState(false);
  const type = toast.type ?? "info";
  const Icon = ICON_MAP[type];

  useEffect(() => {
    const duration = toast.duration ?? 5000;
    const timer = setTimeout(() => {
      setExiting(true);
      setTimeout(() => onDismiss(toast.id), 300);
    }, duration);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  const handleClick = () => {
    if (toast.link) {
      router.push(toast.link);
      onDismiss(toast.id);
    }
  };

  return (
    <div
      className={cn(
        "pointer-events-auto flex w-80 items-start gap-3 rounded-lg border p-4 shadow-lg transition-all duration-300",
        COLOR_MAP[type],
        exiting ? "translate-x-full opacity-0" : "translate-x-0 opacity-100",
        toast.link && "cursor-pointer hover:shadow-xl"
      )}
      onClick={handleClick}
      role={toast.link ? "button" : undefined}
    >
      <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", ICON_COLOR_MAP[type])} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{toast.title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{toast.message}</p>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setExiting(true);
          setTimeout(() => onDismiss(toast.id), 300);
        }}
        className="shrink-0 text-muted-foreground hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idCounter = useRef(0);

  const addToast = useCallback((toast: Omit<Toast, "id">) => {
    const id = `toast-${Date.now()}-${idCounter.current++}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {/* Toast container - top right */}
      <div className="pointer-events-none fixed right-4 top-20 z-40 flex flex-col gap-2">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={dismissToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
