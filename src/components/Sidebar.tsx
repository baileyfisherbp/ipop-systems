"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOutAction } from "@/lib/actions";
import {
  LayoutDashboard,
  Mail,
  CalendarDays,
  Settings,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
  Moon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useSidebarCollapsed } from "@/hooks/use-sidebar-collapsed";
import { PresenceAvatars } from "@/components/presence-avatars";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "AI Email Drafter", href: "/email-drafter", icon: Mail },
  { label: "Scheduling", href: "/scheduling", icon: CalendarDays },
  { label: "Settings", href: "/settings/ai", icon: Settings },
];

export function Sidebar({
  userRole,
  userName,
  userEmail,
}: {
  userRole?: string;
  userName: string;
  userEmail: string;
}) {
  const pathname = usePathname();
  const { collapsed, toggle } = useSidebarCollapsed();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = !mounted || resolvedTheme === "dark";
  const isAdmin = userRole === "ADMIN" || userRole === "OWNER";

  return (
    <aside
      className={cn(
        "flex h-full flex-col bg-sidebar border-r border-sidebar-border transition-all duration-200",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo row + presence avatars */}
      <div className={cn(
        "flex items-center shrink-0",
        collapsed ? "h-14 justify-center px-2" : "h-14 justify-between px-4"
      )}>
        <Link href="/dashboard" className="shrink-0">
          <Image
            src={isDark ? "/ipop_white_nowordmark.svg" : "/ipop_black_nowordmark.svg"}
            alt="IPOP"
            width={collapsed ? 36 : 56}
            height={collapsed ? 36 : 56}
            priority
          />
        </Link>
        {!collapsed && (
          <PresenceAvatars currentUserEmail={userEmail} variant="sidebar" />
        )}
      </div>

      <nav className={cn("flex-1 space-y-0.5 overflow-y-auto", collapsed ? "px-2" : "px-3")}>
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center rounded-md text-sm font-medium transition-all duration-150",
                collapsed ? "justify-center p-2" : "gap-3 px-3 py-2",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom section: user info + sign out + collapse */}
      <div className={cn("shrink-0 pb-3", collapsed ? "px-2" : "px-3")}>
        <div className="border-t border-sidebar-border pt-3 space-y-1">
          {/* User info */}
          {!collapsed && (
            <div className="px-3 py-1.5">
              <div className="flex items-center gap-2">
                <span className="truncate text-xs font-medium text-sidebar-foreground">{userName}</span>
                {isAdmin && (
                  <span className="shrink-0 rounded-full bg-sidebar-accent px-1.5 py-0.5 text-[10px] font-medium text-sidebar-accent-foreground/80">
                    {userRole === "OWNER" ? "Owner" : "Admin"}
                  </span>
                )}
              </div>
              <p className="truncate text-[11px] text-sidebar-foreground/50">{userEmail}</p>
            </div>
          )}
          <form action={signOutAction}>
            <button
              type="submit"
              title={collapsed ? "Sign Out" : undefined}
              className={cn(
                "flex w-full items-center rounded-md text-sm font-medium text-sidebar-foreground transition-all duration-150 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                collapsed ? "justify-center p-2" : "gap-3 px-3 py-2"
              )}
            >
              <LogOut className="h-4 w-4 shrink-0" />
              {!collapsed && "Sign Out"}
            </button>
          </form>
          <button
            type="button"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            title={collapsed ? "Toggle theme" : isDark ? "Switch to light mode" : "Switch to dark mode"}
            className={cn(
              "flex w-full items-center rounded-md text-sm font-medium text-sidebar-foreground/60 transition-all duration-150 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              collapsed ? "justify-center p-2" : "gap-3 px-3 py-2"
            )}
          >
            {isDark ? (
              <Sun className="h-4 w-4 shrink-0" />
            ) : (
              <Moon className="h-4 w-4 shrink-0" />
            )}
            {!collapsed && (isDark ? "Light Mode" : "Dark Mode")}
          </button>
          <button
            type="button"
            onClick={toggle}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn(
              "flex w-full items-center rounded-md text-sm font-medium text-sidebar-foreground/60 transition-all duration-150 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              collapsed ? "justify-center p-2" : "gap-3 px-3 py-2"
            )}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4 shrink-0" />
            ) : (
              <>
                <PanelLeftClose className="h-4 w-4 shrink-0" />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>
      </div>
    </aside>
  );
}
