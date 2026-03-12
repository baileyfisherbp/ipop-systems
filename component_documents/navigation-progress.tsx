"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const start = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    if (timerRef.current) clearInterval(timerRef.current);

    setProgress(0);
    setVisible(true);

    // Quickly jump to ~15%, then slow-crawl toward 90%
    let p = 0;
    timerRef.current = setInterval(() => {
      p += p < 30 ? 8 : p < 60 ? 3 : p < 80 ? 1 : 0.5;
      if (p > 90) p = 90;
      setProgress(p);
    }, 200);
  }, []);

  const finish = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setProgress(100);
    hideTimerRef.current = setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 300);
  }, []);

  // Finish when the route changes
  useEffect(() => {
    finish();
  }, [pathname, searchParams, finish]);

  // Intercept link clicks and programmatic navigation to start the bar
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const anchor = (e.target as HTMLElement).closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (
        !href ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        anchor.target === "_blank" ||
        anchor.hasAttribute("download")
      )
        return;

      // Only trigger for internal same-origin links
      try {
        const url = new URL(href, window.location.origin);
        if (url.origin !== window.location.origin) return;
        // Don't start if navigating to the same page
        if (url.pathname === pathname && url.search === window.location.search) return;
      } catch {
        return;
      }

      start();
    }

    // Patch history.pushState to catch router.push() calls
    const originalPushState = history.pushState.bind(history);
    history.pushState = function (...args) {
      start();
      return originalPushState(...args);
    };

    document.addEventListener("click", handleClick, true);
    return () => {
      document.removeEventListener("click", handleClick, true);
      history.pushState = originalPushState;
      if (timerRef.current) clearInterval(timerRef.current);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [pathname, start]);

  if (!visible && progress === 0) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] h-[3px] pointer-events-none"
      style={{ opacity: visible ? 1 : 0, transition: "opacity 0.3s ease" }}
    >
      <div
        className="h-full bg-primary"
        style={{
          width: `${progress}%`,
          transition: progress === 0 ? "none" : "width 0.2s ease",
          boxShadow: "0 0 8px var(--primary), 0 0 4px var(--primary)",
        }}
      />
    </div>
  );
}
