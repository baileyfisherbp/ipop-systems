"use client";

import { Sidebar } from "@/components/Sidebar";

export function SidebarWrapper({
  userRole,
  userName,
  userEmail,
}: {
  userRole?: string;
  userName: string;
  userEmail: string;
}) {
  return (
    <Sidebar userRole={userRole} userName={userName} userEmail={userEmail} />
  );
}
