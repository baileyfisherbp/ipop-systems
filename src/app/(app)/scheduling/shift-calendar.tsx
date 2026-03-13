"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { ChevronLeft, ChevronRight, Plus, X, Trash2, MapPin, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface StaffMember {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

interface Shift {
  id: string;
  userId: string;
  location: string;
  date: string;
  startTime: string;
  endTime: string;
  note: string | null;
  user: StaffMember;
}

interface AvailabilitySlot {
  id: string;
  userId: string;
  date: string;
  startTime: string;
  endTime: string;
  note: string | null;
  user: StaffMember;
}

const LOCATIONS = ["Burnaby", "Surrey"];

const PRESET_SHIFTS = [
  { label: "Open", start: "05:30", end: "10:30" },
  { label: "Daytime", start: "10:30", end: "15:30" },
  { label: "Evening", start: "15:30", end: "19:30" },
  { label: "Closing", start: "19:30", end: "00:30" },
];

// Generate half-hour time slots from 5:00 AM to midnight
const TIME_SLOTS: string[] = [];
for (let h = 5; h <= 24; h++) {
  TIME_SLOTS.push(`${String(h % 24).padStart(2, "0")}:00`);
  if (h < 24) TIME_SLOTS.push(`${String(h).padStart(2, "0")}:30`);
}

function formatTime(time: string): string {
  const [h, m] = time.split(":");
  const hour = parseInt(h);
  if (hour === 0 || hour === 24) return "12:00 AM";
  if (hour === 12) return `12:${m} PM`;
  if (hour > 12) return `${hour - 12}:${m} PM`;
  return `${hour}:${m} AM`;
}

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

function getShiftColorLight(userId: string): string {
  const colors = [
    "bg-blue-100 border-blue-300 text-blue-800 dark:bg-blue-500/20 dark:border-blue-500/40 dark:text-blue-300",
    "bg-purple-100 border-purple-300 text-purple-800 dark:bg-purple-500/20 dark:border-purple-500/40 dark:text-purple-300",
    "bg-amber-100 border-amber-300 text-amber-800 dark:bg-amber-500/20 dark:border-amber-500/40 dark:text-amber-300",
    "bg-rose-100 border-rose-300 text-rose-800 dark:bg-rose-500/20 dark:border-rose-500/40 dark:text-rose-300",
    "bg-teal-100 border-teal-300 text-teal-800 dark:bg-teal-500/20 dark:border-teal-500/40 dark:text-teal-300",
    "bg-indigo-100 border-indigo-300 text-indigo-800 dark:bg-indigo-500/20 dark:border-indigo-500/40 dark:text-indigo-300",
    "bg-emerald-100 border-emerald-300 text-emerald-800 dark:bg-emerald-500/20 dark:border-emerald-500/40 dark:text-emerald-300",
    "bg-orange-100 border-orange-300 text-orange-800 dark:bg-orange-500/20 dark:border-orange-500/40 dark:text-orange-300",
  ];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) | 0;
  }
  return colors[Math.abs(hash) % colors.length];
}

// Merge overlapping/adjacent time ranges into continuous blocks
function mergeTimeRanges(
  slots: { startTime: string; endTime: string }[]
): { startTime: string; endTime: string }[] {
  if (slots.length === 0) return [];

  const toMinutes = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    // Treat 00:xx as 24:xx so midnight sorts after evening times
    return (h === 0 ? 24 : h) * 60 + m;
  };
  const fromMinutes = (mins: number) => {
    const h = Math.floor(mins / 60) % 24;
    const m = mins % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };

  const sorted = slots
    .map((s) => ({ start: toMinutes(s.startTime), end: toMinutes(s.endTime) }))
    .sort((a, b) => a.start - b.start);

  const merged: { start: number; end: number }[] = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1];
    if (sorted[i].start <= last.end) {
      last.end = Math.max(last.end, sorted[i].end);
    } else {
      merged.push({ ...sorted[i] });
    }
  }

  return merged.map((r) => ({
    startTime: fromMinutes(r.start),
    endTime: fromMinutes(r.end),
  }));
}

function getAvatarBg(userId: string): string {
  const colors = [
    "bg-blue-500",
    "bg-purple-500",
    "bg-amber-500",
    "bg-rose-500",
    "bg-teal-500",
    "bg-indigo-500",
    "bg-emerald-500",
    "bg-orange-500",
  ];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) | 0;
  }
  return colors[Math.abs(hash) % colors.length];
}

export function ShiftCalendar({
  staff,
  isAdmin,
}: {
  staff: StaffMember[];
  isAdmin: boolean;
}) {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [selectedLocation, setSelectedLocation] = useState(LOCATIONS[0]);

  // Confirm-from-availability modal state
  const [confirmModal, setConfirmModal] = useState<{
    member: StaffMember;
    date: string;
    startTime: string;
    endTime: string;
  } | null>(null);
  const [confirming, setConfirming] = useState(false);

  // Drag state
  const [draggingStaff, setDraggingStaff] = useState<StaffMember | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);

  // Form state
  const [formUserId, setFormUserId] = useState("");
  const [formStart, setFormStart] = useState("05:30");
  const [formEnd, setFormEnd] = useState("10:30");
  const [formNote, setFormNote] = useState("");
  const [formLocation, setFormLocation] = useState(LOCATIONS[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const weekDates = getWeekDates(currentDate);
  const weekStart = dateToString(weekDates[0]);
  const weekEnd = dateToString(weekDates[6]);

  const fetchShifts = useCallback(async () => {
    setLoading(true);
    try {
      const [shiftsRes, availRes] = await Promise.all([
        fetch(
          `/api/shifts?start=${weekStart}&end=${weekEnd}&location=${encodeURIComponent(selectedLocation)}`
        ),
        fetch(`/api/availability?start=${weekStart}&end=${weekEnd}`),
      ]);
      if (shiftsRes.ok) {
        setShifts(await shiftsRes.json());
      }
      if (availRes.ok) {
        setAvailability(await availRes.json());
      }
    } catch (err) {
      console.error("Failed to fetch data:", err);
    } finally {
      setLoading(false);
    }
  }, [weekStart, weekEnd, selectedLocation]);

  useEffect(() => {
    fetchShifts();
  }, [fetchShifts]);

  // Build availability lookup: { "userId:date" => AvailabilitySlot[] }
  const availabilityMap = useMemo(() => {
    const map = new Map<string, AvailabilitySlot[]>();
    for (const slot of availability) {
      const key = `${slot.userId}:${slot.date.split("T")[0]}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(slot);
    }
    return map;
  }, [availability]);

  // Which staff have any availability this week
  const staffWithAvailability = useMemo(() => {
    const set = new Set<string>();
    for (const slot of availability) {
      set.add(slot.userId);
    }
    return set;
  }, [availability]);

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

  const openAddModal = (date: string, prefilledUserId?: string) => {
    setSelectedDate(date);
    setEditingShift(null);
    setFormUserId(prefilledUserId || staff[0]?.id || "");
    setFormStart("05:30");
    setFormEnd("10:30");
    setFormNote("");
    setFormLocation(selectedLocation);
    setError(null);
    setShowModal(true);
  };

  const openEditModal = (shift: Shift) => {
    setSelectedDate(shift.date.split("T")[0]);
    setEditingShift(shift);
    setFormUserId(shift.userId);
    setFormStart(shift.startTime);
    setFormEnd(shift.endTime);
    setFormNote(shift.note ?? "");
    setFormLocation(shift.location);
    setError(null);
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      if (editingShift) {
        const res = await fetch("/api/shifts", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingShift.id,
            userId: formUserId,
            date: selectedDate,
            startTime: formStart,
            endTime: formEnd,
            note: formNote,
            location: formLocation,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error || "Failed to update shift");
        }
      } else {
        const res = await fetch("/api/shifts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: formUserId,
            date: selectedDate,
            startTime: formStart,
            endTime: formEnd,
            note: formNote,
            location: formLocation,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error || "Failed to create shift");
        }
      }
      setShowModal(false);
      fetchShifts();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (shiftId: string) => {
    try {
      await fetch(`/api/shifts?id=${shiftId}`, { method: "DELETE" });
      fetchShifts();
    } catch (err) {
      console.error("Failed to delete shift:", err);
    }
  };

  const handleConfirmAvailability = async () => {
    if (!confirmModal) return;
    setConfirming(true);
    try {
      const res = await fetch("/api/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: confirmModal.member.id,
          date: confirmModal.date,
          startTime: confirmModal.startTime,
          endTime: confirmModal.endTime,
          location: selectedLocation,
          note: null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        console.error("Failed to confirm shift:", data?.error);
      }
      setConfirmModal(null);
      fetchShifts();
    } catch (err) {
      console.error("Failed to confirm shift:", err);
    } finally {
      setConfirming(false);
    }
  };

  const applyPreset = (start: string, end: string) => {
    setFormStart(start);
    setFormEnd(end);
  };

  const handleDrop = (date: string) => {
    if (draggingStaff) {
      openAddModal(date, draggingStaff.id);
      setDraggingStaff(null);
      setDragOverDate(null);
    }
  };

  const today = dateToString(new Date());

  return (
    <div className="flex gap-4">
      {/* Staff sidebar */}
      <div className="w-56 shrink-0">
        <div className="sticky top-4 rounded-2xl border border-dm-border bg-dm-surface p-3">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-dm-text-muted">
            Staff
          </h3>
          <div className="space-y-1">
            {staff.map((member) => {
              const hasAvailability = staffWithAvailability.has(member.id);
              // Count how many days this week the staff is available
              const availDays = weekDates.filter(
                (d) => availabilityMap.has(`${member.id}:${dateToString(d)}`)
              ).length;
              const isDragging = draggingStaff?.id === member.id;
              const initials = (member.name || member.email)
                .split(" ")
                .map((w) => w[0])
                .join("")
                .toUpperCase()
                .slice(0, 2);

              return (
                <div
                  key={member.id}
                  draggable={isAdmin && hasAvailability}
                  onDragStart={(e) => {
                    setDraggingStaff(member);
                    e.dataTransfer.effectAllowed = "copy";
                  }}
                  onDragEnd={() => {
                    setDraggingStaff(null);
                    setDragOverDate(null);
                  }}
                  className={cn(
                    "flex items-center gap-2.5 rounded-xl px-2.5 py-2 transition-all",
                    hasAvailability && isAdmin && "cursor-grab active:cursor-grabbing",
                    !hasAvailability && "opacity-50",
                    isDragging && "opacity-40 ring-2 ring-brand-lime",
                    !isDragging &&
                      hasAvailability &&
                      "hover:bg-dm-surface-raised"
                  )}
                >
                  <div className="relative shrink-0">
                    <div
                      className={cn(
                        "flex h-8 w-8 items-center justify-center overflow-hidden rounded-full text-xs font-semibold text-white",
                        getAvatarBg(member.id)
                      )}
                    >
                      {member.image ? (
                        <img
                          src={member.image}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        initials
                      )}
                    </div>
                    <span
                      className={cn(
                        "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-dm-surface",
                        hasAvailability ? "bg-green-500" : "bg-gray-500"
                      )}
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-xs font-medium text-dm-text">
                      {member.name || member.email.split("@")[0]}
                    </div>
                    <div
                      className={cn(
                        "text-[10px]",
                        hasAvailability
                          ? "text-green-500"
                          : "text-dm-text-muted"
                      )}
                    >
                      {hasAvailability
                        ? `${availDays} day${availDays !== 1 ? "s" : ""} this week`
                        : "No availability set"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {isAdmin && (
            <p className="mt-4 text-[10px] leading-relaxed text-dm-text-muted">
              Drag an available staff member onto a day to schedule them.
            </p>
          )}
        </div>
      </div>

      {/* Calendar */}
      <div className="min-w-0 flex-1">
        {/* Week navigation + location selector */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={prevWeek}
              className="rounded-lg border border-dm-border bg-dm-surface-raised p-2 text-dm-text-muted transition-colors hover:text-dm-text"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={nextWeek}
              className="rounded-lg border border-dm-border bg-dm-surface-raised p-2 text-dm-text-muted transition-colors hover:text-dm-text"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              onClick={goToToday}
              className="rounded-lg border border-dm-border bg-dm-surface-raised px-3 py-2 text-xs font-medium text-dm-text-muted transition-colors hover:text-dm-text"
            >
              Today
            </button>

            <div className="ml-2 flex items-center gap-1 rounded-lg border border-dm-border bg-dm-surface-raised p-0.5">
              {LOCATIONS.map((loc) => (
                <button
                  key={loc}
                  onClick={() => setSelectedLocation(loc)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                    selectedLocation === loc
                      ? "bg-brand-lime text-black"
                      : "text-dm-text-muted hover:text-dm-text"
                  )}
                >
                  <MapPin className="h-3 w-3" />
                  {loc}
                </button>
              ))}
            </div>
          </div>
          <h2 className="text-lg font-medium text-dm-text">
            {weekDates[0].toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
            })}
            {" — "}
            {weekDates[6].toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </h2>
        </div>

        {/* Calendar grid */}
        <div className="overflow-hidden rounded-2xl border border-dm-border bg-dm-surface">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-dm-border">
            {weekDates.map((date) => {
              const ds = dateToString(date);
              const isToday = ds === today;
              return (
                <div
                  key={ds}
                  className={cn(
                    "border-r border-dm-border px-3 py-3 last:border-r-0",
                    isToday && "bg-brand-lime/10"
                  )}
                >
                  <div className="text-xs font-medium text-dm-text-muted">
                    {date.toLocaleDateString("en-US", { weekday: "short" })}
                  </div>
                  <div
                    className={cn(
                      "text-lg font-semibold",
                      isToday ? "text-brand-lime" : "text-dm-text"
                    )}
                  >
                    {date.getDate()}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Shift cells */}
          <div className="grid grid-cols-7">
            {weekDates.map((date) => {
              const ds = dateToString(date);
              const isToday = ds === today;
              const isDragOver = dragOverDate === ds && draggingStaff !== null;
              const dayShifts = shifts.filter(
                (s) => s.date.split("T")[0] === ds
              );

              return (
                <div
                  key={ds}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "copy";
                  }}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    setDragOverDate(ds);
                  }}
                  onDragLeave={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = e.clientX;
                    const y = e.clientY;
                    if (
                      x < rect.left ||
                      x > rect.right ||
                      y < rect.top ||
                      y > rect.bottom
                    ) {
                      setDragOverDate(null);
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleDrop(ds);
                  }}
                  className={cn(
                    "min-h-[180px] border-r border-dm-border p-2 last:border-r-0 transition-colors",
                    isToday && "bg-brand-lime/5",
                    isDragOver &&
                      "bg-brand-lime/10 ring-2 ring-inset ring-brand-lime/40"
                  )}
                >
                  <div className="space-y-1.5">
                    {loading ? (
                      <div className="space-y-1.5">
                        <div className="h-10 animate-pulse rounded-md bg-dm-surface-raised" />
                        <div className="h-10 animate-pulse rounded-md bg-dm-surface-raised" />
                      </div>
                    ) : (
                      dayShifts.map((shift) => (
                        <button
                          key={shift.id}
                          onClick={() => isAdmin && openEditModal(shift)}
                          className={cn(
                            "w-full rounded-md border px-2 py-1.5 text-left text-xs transition-all",
                            getShiftColorLight(shift.userId),
                            isAdmin && "cursor-pointer hover:brightness-110"
                          )}
                        >
                          <div className="truncate font-medium">
                            {shift.user.name ||
                              shift.user.email.split("@")[0]}
                          </div>
                          <div className="opacity-75">
                            {formatTime(shift.startTime)} –{" "}
                            {formatTime(shift.endTime)}
                          </div>
                          {shift.note && (
                            <div className="mt-0.5 truncate opacity-60">
                              {shift.note}
                            </div>
                          )}
                        </button>
                      ))
                    )}
                  </div>

                  {/* Show who's available this day — merged blocks, clickable */}
                  {isAdmin && !loading && (() => {
                    const dayAvail = staff
                      .map((m) => ({
                        member: m,
                        slots: availabilityMap.get(`${m.id}:${ds}`) || [],
                      }))
                      .filter((a) => a.slots.length > 0);

                    if (dayAvail.length === 0) return null;

                    return (
                      <div className="mt-1.5 border-t border-dm-border pt-1.5">
                        <div className="mb-1 flex items-center gap-1 text-[9px] font-medium uppercase text-dm-text-muted">
                          <Clock className="h-2.5 w-2.5" />
                          Available
                        </div>
                        <div className="space-y-0.5">
                          {dayAvail.map(({ member, slots }) => {
                            const merged = mergeTimeRanges(slots);
                            return merged.map((block, blockIdx) => (
                              <button
                                key={`${member.id}-${blockIdx}`}
                                onClick={() =>
                                  setConfirmModal({
                                    member,
                                    date: ds,
                                    startTime: block.startTime,
                                    endTime: block.endTime,
                                  })
                                }
                                className="w-full rounded px-1.5 py-0.5 text-left text-[10px] text-green-400 bg-green-500/5 transition-colors hover:bg-green-500/15 cursor-pointer"
                              >
                                <span className="font-medium">
                                  {(member.name || member.email.split("@")[0]).split(" ")[0]}
                                </span>
                                <span className="ml-1 opacity-70">
                                  {formatTime(block.startTime)}–{formatTime(block.endTime)}
                                </span>
                              </button>
                            ));
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {isAdmin && !loading && (
                    <button
                      onClick={() => openAddModal(ds)}
                      className="mt-2 flex w-full items-center justify-center gap-1 rounded-md border border-dashed border-dm-border py-1.5 text-xs text-dm-text-muted transition-colors hover:border-dm-text-muted hover:text-dm-text"
                    >
                      <Plus className="h-3 w-3" />
                      Add
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Staff legend */}
        <div className="mt-4 flex flex-wrap gap-3">
          {staff.map((member) => {
            const memberShifts = shifts.filter(
              (s) => s.userId === member.id
            );
            if (memberShifts.length === 0) return null;
            const totalHours = memberShifts.reduce((acc, s) => {
              const [sh, sm] = s.startTime.split(":").map(Number);
              let [eh, em] = s.endTime.split(":").map(Number);
              if (eh === 0) eh = 24;
              return acc + (eh + em / 60) - (sh + sm / 60);
            }, 0);
            return (
              <div
                key={member.id}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs",
                  getShiftColorLight(member.id)
                )}
              >
                <span className="font-medium">
                  {member.name || member.email.split("@")[0]}
                </span>
                <span className="opacity-60">{totalHours}h this week</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Confirm Availability Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-dm-border bg-dm-surface p-6 shadow-2xl">
            <h3 className="mb-4 text-lg font-semibold text-dm-text">
              Confirm Shift
            </h3>
            <p className="mb-1 text-sm text-dm-text">
              Schedule{" "}
              <span className="font-semibold">
                {confirmModal.member.name || confirmModal.member.email.split("@")[0]}
              </span>{" "}
              for this shift?
            </p>
            <p className="mb-1 text-sm text-dm-text-muted">
              {new Date(confirmModal.date + "T12:00:00").toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </p>
            <p className="mb-6 text-sm font-medium text-green-400">
              {formatTime(confirmModal.startTime)} – {formatTime(confirmModal.endTime)}
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmModal(null)}
                className="rounded-lg border border-dm-border px-4 py-2 text-sm font-medium text-dm-text-muted transition-colors hover:text-dm-text"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAvailability}
                disabled={confirming}
                className="rounded-lg bg-brand-lime px-4 py-2 text-sm font-medium text-black transition-colors hover:brightness-110 disabled:opacity-50"
              >
                {confirming ? "Scheduling..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Shift Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-dm-border bg-dm-surface p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-dm-text">
                {editingShift ? "Edit Shift" : "Add Shift"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg p-1 text-dm-text-muted transition-colors hover:text-dm-text"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Date display */}
              <div>
                <label className="mb-1 block text-xs font-medium text-dm-text-muted">
                  Date
                </label>
                <div className="text-sm font-medium text-dm-text">
                  {selectedDate &&
                    new Date(
                      selectedDate + "T12:00:00"
                    ).toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                </div>
              </div>

              {/* Location select */}
              <div>
                <label className="mb-1 block text-xs font-medium text-dm-text-muted">
                  Location
                </label>
                <select
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  className="w-full rounded-lg border border-dm-border bg-dm-surface-raised px-3 py-2 text-sm text-dm-text focus:outline-none focus:ring-2 focus:ring-brand-lime"
                >
                  {LOCATIONS.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>

              {/* Staff select */}
              <div>
                <label className="mb-1 block text-xs font-medium text-dm-text-muted">
                  Staff Member
                </label>
                <select
                  value={formUserId}
                  onChange={(e) => setFormUserId(e.target.value)}
                  className="w-full rounded-lg border border-dm-border bg-dm-surface-raised px-3 py-2 text-sm text-dm-text focus:outline-none focus:ring-2 focus:ring-brand-lime"
                >
                  {staff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name || s.email}
                    </option>
                  ))}
                </select>
              </div>

              {/* Preset shifts */}
              <div>
                <label className="mb-1 block text-xs font-medium text-dm-text-muted">
                  Quick Presets
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_SHIFTS.map((p) => (
                    <button
                      key={p.label}
                      onClick={() => applyPreset(p.start, p.end)}
                      className={cn(
                        "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                        formStart === p.start && formEnd === p.end
                          ? "border-brand-lime bg-brand-lime/10 text-brand-lime"
                          : "border-dm-border text-dm-text-muted hover:text-dm-text"
                      )}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time pickers */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-dm-text-muted">
                    Start Time
                  </label>
                  <select
                    value={formStart}
                    onChange={(e) => setFormStart(e.target.value)}
                    className="w-full rounded-lg border border-dm-border bg-dm-surface-raised px-3 py-2 text-sm text-dm-text focus:outline-none focus:ring-2 focus:ring-brand-lime"
                  >
                    {TIME_SLOTS.map((val) => (
                      <option key={val} value={val}>
                        {formatTime(val)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-dm-text-muted">
                    End Time
                  </label>
                  <select
                    value={formEnd}
                    onChange={(e) => setFormEnd(e.target.value)}
                    className="w-full rounded-lg border border-dm-border bg-dm-surface-raised px-3 py-2 text-sm text-dm-text focus:outline-none focus:ring-2 focus:ring-brand-lime"
                  >
                    {TIME_SLOTS.map((val) => (
                      <option key={val} value={val}>
                        {formatTime(val)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="mb-1 block text-xs font-medium text-dm-text-muted">
                  Note (optional)
                </label>
                <input
                  type="text"
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value)}
                  placeholder="e.g. Training, Covering for Alex"
                  className="w-full rounded-lg border border-dm-border bg-dm-surface-raised px-3 py-2 text-sm text-dm-text placeholder:text-dm-text-muted focus:outline-none focus:ring-2 focus:ring-brand-lime"
                />
              </div>

              {error && <p className="text-sm text-red-400">{error}</p>}

              {/* Actions */}
              <div className="flex items-center justify-between pt-2">
                {editingShift ? (
                  <button
                    onClick={() => {
                      handleDelete(editingShift.id);
                      setShowModal(false);
                    }}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                ) : (
                  <div />
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowModal(false)}
                    className="rounded-lg border border-dm-border px-4 py-2 text-sm font-medium text-dm-text-muted transition-colors hover:text-dm-text"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="rounded-lg bg-brand-lime px-4 py-2 text-sm font-medium text-black transition-colors hover:brightness-110 disabled:opacity-50"
                  >
                    {saving
                      ? "Saving..."
                      : editingShift
                        ? "Update"
                        : "Add Shift"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
