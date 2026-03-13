"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AvailabilitySlot {
  id: string;
  userId: string;
  date: string;
  startTime: string;
  endTime: string;
  note: string | null;
}

const PRESET_SLOTS = [
  { label: "Open", start: "05:30", end: "10:30" },
  { label: "Daytime", start: "10:30", end: "15:30" },
  { label: "Evening", start: "15:30", end: "19:30" },
  { label: "Closing", start: "19:30", end: "00:30" },
];


function getWeekDates(baseDate: Date): Date[] {
  const start = new Date(baseDate);
  const day = start.getDay();
  start.setDate(start.getDate() - day);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function dateToString(d: Date): string {
  return d.toISOString().split("T")[0];
}

export function AvailabilityForm({ userName }: { userName: string | null }) {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);


  // Show 2 weeks for availability submission
  const week1 = getWeekDates(currentDate);
  const nextWeekDate = new Date(currentDate);
  nextWeekDate.setDate(nextWeekDate.getDate() + 7);
  const week2 = getWeekDates(nextWeekDate);
  const allDates = [...week1, ...week2];

  const rangeStart = dateToString(allDates[0]);
  const rangeEnd = dateToString(allDates[allDates.length - 1]);

  const fetchSlots = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/availability?start=${rangeStart}&end=${rangeEnd}`
      );
      if (res.ok) {
        setSlots(await res.json());
      }
    } catch (err) {
      console.error("Failed to fetch availability:", err);
    } finally {
      setLoading(false);
    }
  }, [rangeStart, rangeEnd]);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  const prevWeek = () => {
    setCurrentDate((d) => {
      const n = new Date(d);
      n.setDate(n.getDate() - 7);
      return n;
    });
  };

  const nextWeek = () => {
    setCurrentDate((d) => {
      const n = new Date(d);
      n.setDate(n.getDate() + 7);
      return n;
    });
  };

  const goToToday = () => setCurrentDate(new Date());

  const handleDeleteSlot = async (id: string) => {
    try {
      await fetch(`/api/availability?id=${id}`, { method: "DELETE" });
      fetchSlots();
    } catch (err) {
      console.error("Failed to delete availability:", err);
    }
  };

  const handleQuickPreset = async (
    date: string,
    start: string,
    end: string
  ) => {
    setSaving(true);
    try {
      const res = await fetch("/api/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          startTime: start,
          endTime: end,
        }),
      });
      if (res.ok) {
        fetchSlots();
      }
    } catch (err) {
      console.error("Failed to save availability:", err);
    } finally {
      setSaving(false);
    }
  };

  const today = dateToString(new Date());

  const renderWeek = (dates: Date[], label: string) => (
    <div className="mb-6">
      <h3 className="mb-3 text-base font-semibold text-dm-text">
        {label}
      </h3>
      <div className="grid grid-cols-7 gap-2">
        {dates.map((date) => {
          const ds = dateToString(date);
          const isToday = ds === today;
          const isPast = ds < today;
          const daySlots = slots.filter((s) => s.date.split("T")[0] === ds);

          return (
            <div
              key={ds}
              className={cn(
                "rounded-xl border p-3 transition-all",
                isToday
                  ? "border-brand-lime/50 bg-brand-lime/5"
                  : "border-dm-border bg-dm-surface",
                isPast && "opacity-50"
              )}
            >
              {/* Day header */}
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium uppercase text-dm-text-muted">
                    {date.toLocaleDateString("en-US", { weekday: "short" })}
                  </div>
                  <div
                    className={cn(
                      "text-xl font-bold",
                      isToday ? "text-brand-lime" : "text-dm-text"
                    )}
                  >
                    {date.getDate()}
                  </div>
                </div>
                {daySlots.length > 0 && (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500/20">
                    <Check className="h-4 w-4 text-green-500" />
                  </div>
                )}
              </div>

              {/* Preset buttons — tap to toggle availability */}
              {!isPast && (
                <div className="mt-2 grid grid-cols-1 gap-1">
                  {PRESET_SLOTS.slice(0, 3).map((p) => {
                    const isActive = daySlots.some(
                      (s) => s.startTime === p.start && s.endTime === p.end
                    );
                    return (
                      <button
                        key={p.label}
                        onClick={() => {
                          if (isActive) {
                            const slot = daySlots.find(
                              (s) => s.startTime === p.start && s.endTime === p.end
                            );
                            if (slot) handleDeleteSlot(slot.id);
                          } else {
                            handleQuickPreset(ds, p.start, p.end);
                          }
                        }}
                        disabled={saving}
                        className={cn(
                          "rounded-lg px-2 py-2 text-left text-xs font-semibold transition-colors",
                          isActive
                            ? "bg-green-500/15 text-green-400"
                            : "text-dm-text-muted hover:bg-green-500/10 hover:text-green-400"
                        )}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={prevWeek}
            className="rounded-lg border border-dm-border bg-dm-surface-raised p-2.5 text-dm-text-muted transition-colors hover:text-dm-text"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={nextWeek}
            className="rounded-lg border border-dm-border bg-dm-surface-raised p-2.5 text-dm-text-muted transition-colors hover:text-dm-text"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <button
            onClick={goToToday}
            className="rounded-lg border border-dm-border bg-dm-surface-raised px-4 py-2.5 text-sm font-medium text-dm-text-muted transition-colors hover:text-dm-text"
          >
            Today
          </button>
        </div>
        <p className="text-sm text-dm-text-muted">
          Tap a shift to toggle your availability
        </p>
      </div>

      {/* Two-week calendar */}
      {renderWeek(
        week1,
        `${week1[0].toLocaleDateString("en-US", { month: "long", day: "numeric" })} — ${week1[6].toLocaleDateString("en-US", { month: "long", day: "numeric" })}`
      )}
      {renderWeek(
        week2,
        `${week2[0].toLocaleDateString("en-US", { month: "long", day: "numeric" })} — ${week2[6].toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`
      )}

      {/* Legend */}
      <div className="flex items-center gap-5 rounded-xl border border-dm-border bg-dm-surface p-3 text-xs text-dm-text-muted">
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-full bg-green-500" />
          <span>Available</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-full bg-dm-border" />
          <span>Not set</span>
        </div>
      </div>
    </div>
  );
}
