"use client";

import { useMemo, useState } from "react";
import { Calendar, Plus, Search, Sun, CloudSun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAppointments } from "@/hooks/use-appointments";
import { useUpdateAppointment } from "@/hooks/use-update-appointment";
import { AppointmentCard } from "./appointment-card";
import { AppointmentForm } from "./appointment-form";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { ERPNextAppointment, AppointmentStatus } from "@/types/erpnext";

const WAITING_STATUSES: AppointmentStatus[] = ["Scheduled", "Open", "Confirmed"];
const COMPLETED_STATUSES: AppointmentStatus[] = ["Checked Out", "Closed"];
const CANCELLED_STATUSES: AppointmentStatus[] = ["Cancelled", "No Show"];

type FilterValue = "all" | "waiting" | "checkedIn" | "completed" | "cancelled";

const STATUS_FILTERS: { label: string; value: FilterValue }[] = [
  { label: "All", value: "all" },
  { label: "Waiting", value: "waiting" },
  { label: "Checked In", value: "checkedIn" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

interface TimeGroup {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  items: ERPNextAppointment[];
}

function groupByPeriod(appointments: ERPNextAppointment[]): TimeGroup[] {
  const morning: ERPNextAppointment[] = [];
  const afternoon: ERPNextAppointment[] = [];
  const evening: ERPNextAppointment[] = [];

  for (const appt of appointments) {
    const hour = parseInt(appt.appointment_time?.slice(0, 2) ?? "0", 10);
    if (hour < 12) morning.push(appt);
    else if (hour < 17) afternoon.push(appt);
    else evening.push(appt);
  }

  return [
    { label: "Morning", icon: Sun, items: morning },
    { label: "Afternoon", icon: CloudSun, items: afternoon },
    { label: "Evening", icon: Moon, items: evening },
  ].filter((g) => g.items.length > 0);
}

interface AppointmentListProps {
  onBill: (appointment: ERPNextAppointment) => void;
}

export function AppointmentList({ onBill }: AppointmentListProps) {
  const [selectedDate, setSelectedDate] = useState(
    () => new Date().toISOString().split("T")[0]
  );
  const [formOpen, setFormOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] =
    useState<ERPNextAppointment | null>(null);
  const [statusFilter, setStatusFilter] = useState<FilterValue>("all");
  const [search, setSearch] = useState("");

  const { data: appointments, isLoading } = useAppointments(selectedDate);
  const updateMutation = useUpdateAppointment();

  // Status counts
  const counts = useMemo(() => {
    if (!appointments) return { total: 0, waiting: 0, checkedIn: 0, completed: 0, cancelled: 0 };
    return {
      total: appointments.length,
      waiting: appointments.filter((a) => WAITING_STATUSES.includes(a.status)).length,
      checkedIn: appointments.filter((a) => a.status === "Checked In").length,
      completed: appointments.filter((a) => COMPLETED_STATUSES.includes(a.status) || a.invoiced === 1).length,
      cancelled: appointments.filter((a) => CANCELLED_STATUSES.includes(a.status)).length,
    };
  }, [appointments]);

  // Filter appointments
  const filtered = useMemo(() => {
    if (!appointments) return [];
    let result = appointments;

    if (statusFilter === "waiting") {
      result = result.filter((a) => WAITING_STATUSES.includes(a.status));
    } else if (statusFilter === "checkedIn") {
      result = result.filter((a) => a.status === "Checked In");
    } else if (statusFilter === "completed") {
      result = result.filter((a) => COMPLETED_STATUSES.includes(a.status) || a.invoiced === 1);
    } else if (statusFilter === "cancelled") {
      result = result.filter((a) => CANCELLED_STATUSES.includes(a.status));
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (a) =>
          a.patient_name.toLowerCase().includes(q) ||
          a.practitioner_name?.toLowerCase().includes(q) ||
          a.name.toLowerCase().includes(q)
      );
    }

    return result;
  }, [appointments, statusFilter, search]);

  // Group filtered results by time period
  const timeGroups = useMemo(() => groupByPeriod(filtered), [filtered]);

  function handleEdit(appt: ERPNextAppointment) {
    setEditingAppointment(appt);
    setFormOpen(true);
  }

  function handleNewAppointment() {
    setEditingAppointment(null);
    setFormOpen(true);
  }

  async function handleCheckIn(appt: ERPNextAppointment) {
    try {
      await updateMutation.mutateAsync({
        name: appt.name,
        appointment_date: appt.appointment_date,
        fields: { status: "Checked In" },
      });
      toast.success(`${appt.patient_name} checked in`);
    } catch {
      toast.error("Failed to check in");
    }
  }

  async function handleCancel(appt: ERPNextAppointment) {
    if (!confirm(`Cancel appointment for ${appt.patient_name}?`)) return;
    try {
      await updateMutation.mutateAsync({
        name: appt.name,
        appointment_date: appt.appointment_date,
        fields: { status: "Cancelled" },
      });
      toast.success("Appointment cancelled");
    } catch {
      toast.error("Failed to cancel appointment");
    }
  }

  const statCards: { label: string; count: number; filter: FilterValue; tint: string; text: string }[] = [
    { label: "Total", count: counts.total, filter: "all", tint: "border-border bg-card", text: "text-foreground" },
    { label: "Waiting", count: counts.waiting, filter: "waiting", tint: "border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/30", text: "text-blue-700 dark:text-blue-300" },
    { label: "Checked In", count: counts.checkedIn, filter: "checkedIn", tint: "border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/30", text: "text-amber-700 dark:text-amber-300" },
    { label: "Completed", count: counts.completed, filter: "completed", tint: "border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/30", text: "text-green-700 dark:text-green-300" },
    { label: "Cancelled", count: counts.cancelled, filter: "cancelled", tint: "border-border bg-card", text: "text-muted-foreground" },
  ];

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="shrink-0 border-b px-6 py-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Appointments</h2>
          <div className="flex items-center gap-2">
            <div className="relative w-56">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search patient..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 pl-9"
              />
            </div>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="h-9 w-40"
            />
            <Button size="sm" className="h-9 gap-1.5" onClick={handleNewAppointment}>
              <Plus className="h-4 w-4" />
              New
            </Button>
          </div>
        </div>
      </div>

      {/* Stats bar — clickable to filter */}
      {!isLoading && counts.total > 0 && (
        <div className="shrink-0 grid grid-cols-5 gap-3 border-b px-6 py-3">
          {statCards.map((s) => (
            <button
              key={s.label}
              onClick={() => setStatusFilter(s.filter)}
              className={cn(
                "rounded-lg border p-2.5 text-left transition-all hover:shadow-sm",
                s.tint,
                statusFilter === s.filter && "ring-2 ring-primary ring-offset-1"
              )}
            >
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                {s.label}
              </p>
              <p className={cn("text-2xl font-bold tabular-nums", s.text)}>
                {s.count}
              </p>
            </button>
          ))}
        </div>
      )}

      {/* Timeline */}
      <ScrollArea className="min-h-0 flex-1">
        <div className="px-6 py-4">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center text-sm text-muted-foreground">
              <Calendar className="mb-2 h-8 w-8 opacity-30" />
              <p>
                {counts.total === 0
                  ? "No appointments for this date"
                  : "No appointments match your filters"}
              </p>
            </div>
          ) : (
            /* Timeline container with left margin for time labels */
            <div className="relative pl-24">
              {/* Vertical connector line */}
              <div className="absolute left-[79px] top-0 bottom-0 w-px bg-border" />

              {timeGroups.map((group) => {
                const Icon = group.icon;
                return (
                  <div key={group.label} className="mb-6 last:mb-0">
                    {/* Period header on timeline */}
                    <div className="relative mb-3">
                      <div className="absolute left-[-29px] flex h-6 w-6 items-center justify-center rounded-full bg-muted">
                        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {group.label}
                        </h3>
                        <span className="text-xs text-muted-foreground/60">
                          ({group.items.length})
                        </span>
                        <div className="flex-1 border-t border-dashed border-border/50" />
                      </div>
                    </div>

                    {/* Appointment items */}
                    {group.items.map((appt) => (
                      <AppointmentCard
                        key={appt.name}
                        appointment={appt}
                        onBill={onBill}
                        onEdit={handleEdit}
                        onCancel={handleCancel}
                        onCheckIn={handleCheckIn}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Form dialog */}
      <AppointmentForm
        open={formOpen}
        onOpenChange={setFormOpen}
        appointment={editingAppointment}
        defaultDate={selectedDate}
      />
    </div>
  );
}
