"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export interface PresenceUser {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  status: "online" | "away" | "offline";
  lastSeenAt: string | null;
  becameActiveAt: number | null;
}

const HEARTBEAT_INTERVAL = 15_000; // 15 seconds
const FETCH_INTERVAL = 10_000; // 10 seconds

export function usePresence() {
  const [users, setUsers] = useState<PresenceUser[]>([]);
  const previousUsersRef = useRef<Map<string, PresenceUser>>(new Map());

  const fetchPresence = useCallback(async () => {
    try {
      const res = await fetch("/api/presence");
      if (!res.ok) return;
      const data: PresenceUser[] = await res.json();

      // Detect users who just became active (transition to online)
      const prevMap = previousUsersRef.current;
      const enriched = data.map((user) => {
        const prev = prevMap.get(user.id);
        let becameActiveAt = user.becameActiveAt;

        if (
          user.status === "online" &&
          prev &&
          prev.status !== "online"
        ) {
          becameActiveAt = Date.now();
        } else if (prev?.becameActiveAt && user.status === "online") {
          becameActiveAt = prev.becameActiveAt;
        }

        return { ...user, becameActiveAt };
      });

      // Update previous users map
      const newMap = new Map<string, PresenceUser>();
      enriched.forEach((u) => newMap.set(u.id, u));
      previousUsersRef.current = newMap;

      setUsers(enriched);
    } catch {
      // Silently fail — presence is non-critical
    }
  }, []);

  const sendHeartbeat = useCallback(async () => {
    try {
      await fetch("/api/presence", { method: "POST" });
    } catch {
      // Silently fail
    }
  }, []);

  useEffect(() => {
    // Initial heartbeat + fetch
    sendHeartbeat();
    fetchPresence();

    const heartbeatTimer = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);
    const fetchTimer = setInterval(fetchPresence, FETCH_INTERVAL);

    // Track visibility changes for away detection
    function handleVisibility() {
      if (document.visibilityState === "visible") {
        sendHeartbeat();
        fetchPresence();
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(heartbeatTimer);
      clearInterval(fetchTimer);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [sendHeartbeat, fetchPresence]);

  return { users };
}
