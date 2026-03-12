"use client";

import { useEffect, useState } from "react";
import { usePresence, PresenceUser } from "@/hooks/use-presence";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

function getInitials(name: string | null, email: string): string {
  if (name) {
    return name
      .split(" ")
      .map((p) => p[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  return email[0].toUpperCase();
}

function getRelativeTime(lastSeenAt: string | null): string {
  if (!lastSeenAt) return "Never seen";
  const diffMs = Date.now() - new Date(lastSeenAt).getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 30) return "Online just now";
  if (diffSec < 60) return "Online within the last minute";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin === 1) return "Online a minute ago";
  if (diffMin < 60) return `Online ${diffMin} minutes ago`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs === 1) return "Online an hour ago";
  return `Online ${diffHrs} hours ago`;
}

function formatActualTime(lastSeenAt: string | null): string {
  if (!lastSeenAt) return "";
  return new Date(lastSeenAt).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function StatusDot({ status, small }: { status: PresenceUser["status"]; small?: boolean }) {
  const color = status === "online" ? "bg-green-500" : "bg-yellow-500";
  return (
    <span
      className={cn(
        "absolute bottom-0 right-0 rounded-full",
        small ? "h-2 w-2 border border-sidebar" : "h-2.5 w-2.5 border-2 border-background",
        color
      )}
    />
  );
}

/** Returns true while the user should show a pulse animation */
function usePulse(user: PresenceUser): boolean {
  const [pulsing, setPulsing] = useState(false);

  useEffect(() => {
    if (!user.becameActiveAt) {
      setPulsing(false);
      return;
    }

    const elapsed = Date.now() - user.becameActiveAt;
    if (elapsed > 4000) {
      setPulsing(false);
      return;
    }

    setPulsing(true);
    const timer = setTimeout(() => setPulsing(false), 4000 - elapsed);
    return () => clearTimeout(timer);
  }, [user.becameActiveAt]);

  return pulsing;
}

function PresenceAvatar({
  user,
  isMe,
  isSidebar,
}: {
  user: PresenceUser;
  isMe: boolean;
  isSidebar: boolean;
}) {
  const pulsing = usePulse(user);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="relative">
          {/* Pulse ring — sits behind the avatar */}
          {pulsing && (
            <span
              className={cn(
                "absolute inset-0 rounded-full animate-[presence-pulse_1.5s_ease-out_infinite]",
                user.status === "online"
                  ? "bg-green-400/40"
                  : "bg-yellow-400/40"
              )}
            />
          )}
          <Avatar
            className={cn(
              "relative transition-shadow duration-300",
              isSidebar ? "h-6 w-6" : "h-8 w-8",
              pulsing && user.status === "online" && "ring-2 ring-green-400 ring-offset-1 ring-offset-background",
              pulsing && user.status === "away" && "ring-2 ring-yellow-400 ring-offset-1 ring-offset-background",
              !pulsing && isMe && !isSidebar && "ring-2 ring-primary ring-offset-2 ring-offset-background",
              !pulsing && isMe && isSidebar && "ring-1 ring-white/50 ring-offset-1 ring-offset-sidebar",
              !pulsing && !isMe && !isSidebar && "border-2 border-background",
              !pulsing && !isMe && isSidebar && "border border-sidebar",
            )}
          >
            {user.image ? (
              <AvatarImage src={user.image} alt={user.name || user.email} />
            ) : null}
            <AvatarFallback className={cn(isSidebar ? "text-[9px]" : "text-xs")}>
              {getInitials(user.name, user.email)}
            </AvatarFallback>
          </Avatar>
          <StatusDot status={user.status} small={isSidebar} />
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>
          {user.name || user.email}
          {isMe && (
            <span className="ml-1.5 text-xs opacity-60">(you)</span>
          )}
        </p>
        <p className="text-xs opacity-75">{getRelativeTime(user.lastSeenAt)}</p>
        {user.lastSeenAt && (
          <p className="text-xs opacity-50">{formatActualTime(user.lastSeenAt)}</p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

export function PresenceAvatars({ currentUserEmail, variant = "header" }: { currentUserEmail: string; variant?: "header" | "sidebar" }) {
  const { users } = usePresence();

  const visible = users.filter((u) => u.status !== "offline");

  if (visible.length === 0) return null;

  // Sort so the current user appears last (rightmost)
  const sorted = [...visible].sort((a, b) => {
    const aIsMe = a.email.toLowerCase() === currentUserEmail.toLowerCase();
    const bIsMe = b.email.toLowerCase() === currentUserEmail.toLowerCase();
    if (aIsMe) return 1;
    if (bIsMe) return -1;
    return 0;
  });

  const isSidebar = variant === "sidebar";

  return (
    <TooltipProvider delayDuration={200}>
      <div
        className={cn(
          "group/presence flex transition-all duration-300",
          isSidebar
            ? "-space-x-1.5 hover:space-x-0.5"
            : "-space-x-2 hover:space-x-1"
        )}
      >
        {sorted.map((user) => {
          const isMe = user.email.toLowerCase() === currentUserEmail.toLowerCase();
          return (
            <div
              key={user.id}
              className="transition-all duration-300 ease-out"
            >
              <PresenceAvatar user={user} isMe={isMe} isSidebar={isSidebar} />
            </div>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
