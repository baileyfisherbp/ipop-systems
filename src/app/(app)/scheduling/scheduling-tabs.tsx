"use client";

import { useState } from "react";
import { CalendarDays, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { ShiftCalendar } from "./shift-calendar";
import { AvailabilityForm } from "./availability-form";

interface StaffMember {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

const TABS = [
  { id: "schedule", label: "Schedule", icon: CalendarDays },
  { id: "availability", label: "My Availability", icon: Clock },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function SchedulingTabs({
  staff,
  isAdmin,
  userName,
}: {
  staff: StaffMember[];
  isAdmin: boolean;
  userName: string | null;
}) {
  const [activeTab, setActiveTab] = useState<TabId>(
    isAdmin ? "schedule" : "availability"
  );

  return (
    <div>
      {/* Tab bar */}
      <div className="mb-6 flex items-center gap-1 rounded-xl border border-dm-border bg-dm-surface p-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all",
                isActive
                  ? "bg-brand-lime text-black"
                  : "text-dm-text-muted hover:text-dm-text"
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === "schedule" && (
        <ShiftCalendar staff={staff} isAdmin={isAdmin} />
      )}
      {activeTab === "availability" && (
        <AvailabilityForm userName={userName} />
      )}
    </div>
  );
}
