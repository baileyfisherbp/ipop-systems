"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOutAction } from "@/lib/actions";
import {
  LayoutDashboard,
  Mail,
  Settings,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebarCollapsed } from "@/hooks/use-sidebar-collapsed";
import { PresenceAvatars } from "@/components/presence-avatars";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "AI Email Drafter", href: "/email-drafter", icon: Mail },
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
  const isAdmin = userRole === "ADMIN" || userRole === "OWNER";

  return (
    <aside
      className={cn(
        "flex h-full flex-col bg-sidebar transition-all duration-200",
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
            src="/ipop_white_nowordmark.svg"
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
                  ? "bg-white/15 text-white"
                  : "text-sidebar-foreground hover:bg-white/[0.07] hover:text-white"
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
        <div className="border-t border-white/[0.08] pt-3 space-y-1">
          {/* User info */}
          {!collapsed && (
            <div className="px-3 py-1.5">
              <div className="flex items-center gap-2">
                <span className="truncate text-xs font-medium text-sidebar-foreground">{userName}</span>
                {isAdmin && (
                  <span className="shrink-0 rounded-full bg-white/15 px-1.5 py-0.5 text-[10px] font-medium text-white/80">
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
                "flex w-full items-center rounded-md text-sm font-medium text-sidebar-foreground transition-all duration-150 hover:bg-white/[0.07] hover:text-white",
                collapsed ? "justify-center p-2" : "gap-3 px-3 py-2"
              )}
            >
              <LogOut className="h-4 w-4 shrink-0" />
              {!collapsed && "Sign Out"}
            </button>
          </form>
          <button
            type="button"
            onClick={toggle}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn(
              "flex w-full items-center rounded-md text-sm font-medium text-sidebar-foreground/60 transition-all duration-150 hover:bg-white/[0.07] hover:text-white",
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
