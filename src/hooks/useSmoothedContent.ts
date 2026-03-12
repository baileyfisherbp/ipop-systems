"use client";

import { useState, useEffect, useRef } from "react";

/**
 * Smoothly reveals streamed content at a consistent rate,
 * similar to ChatGPT/Gemini text appearance.
 *
 * Buffers incoming text and releases it character-by-character
 * using requestAnimationFrame for smooth animation.
 */
export function useSmoothedContent(content: string, isStreaming: boolean): string {
  const [displayed, setDisplayed] = useState(content);
  const targetRef = useRef(content);
  const displayedLenRef = useRef(content.length);

  // Always keep ref in sync with latest content
  targetRef.current = content;

  // When streaming stops, show everything immediately
  useEffect(() => {
    if (!isStreaming && targetRef.current) {
      setDisplayed(targetRef.current);
      displayedLenRef.current = targetRef.current.length;
    }
  }, [isStreaming]);

  // Animation loop while streaming
  useEffect(() => {
    if (!isStreaming) return;

    let raf: number;
    let lastTime = performance.now();

    const animate = (now: number) => {
      const dt = now - lastTime;
      lastTime = now;

      const target = targetRef.current;
      const targetLen = target.length;
      const currentLen = displayedLenRef.current;

      if (currentLen < targetLen) {
        // Adaptive speed: faster when buffer is large, steady baseline otherwise
        const behind = targetLen - currentLen;
        const charsPerMs = Math.max(0.04, Math.min(0.25, behind * 0.008));
        const charsToAdd = Math.max(1, Math.floor(dt * charsPerMs));
        const newLen = Math.min(currentLen + charsToAdd, targetLen);

        displayedLenRef.current = newLen;
        setDisplayed(target.slice(0, newLen));
      }

      raf = requestAnimationFrame(animate);
    };

    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [isStreaming]);

  return displayed;
}
