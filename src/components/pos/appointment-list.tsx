"use client";

import { useState } from "react";
import { Calendar, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAppointments } from "@/hooks/use-appointments";
import { useUpdateAppointment } from "@/hooks/use-update-appointment";
import { AppointmentCard } from "./appointment-card";
import { AppointmentForm } from "./appointment-form";
import { toast } from "sonner";
import type { ERPNextAppointment } from "@/types/erpnext";

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

  const { data: appointments, isLoading } = useAppointments(selectedDate);
  const cancelMutation = useUpdateAppointment();

  function handleEdit(appt: ERPNextAppointment) {
    setEditingAppointment(appt);
    setFormOpen(true);
  }

  function handleNewAppointment() {
    setEditingAppointment(null);
    setFormOpen(true);
  }

  async function handleCancel(appt: ERPNextAppointment) {
    if (!confirm(`Cancel appointment for ${appt.patient_name}?`)) return;
    try {
      await cancelMutation.mutateAsync({
        name: appt.name,
        appointment_date: appt.appointment_date,
        fields: { status: "Cancelled" },
      });
      toast.success("Appointment cancelled");
    } catch {
      toast.error("Failed to cancel appointment");
    }
  }

  const total = appointments?.length ?? 0;
  const active =
    appointments?.filter(
      (a) => !["Cancelled", "No Show"].includes(a.status)
    ).length ?? 0;

  return (
    <div className="flex h-full flex-col">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b px-6 py-3">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold">Appointments</h2>
          {!isLoading && (
            <span className="text-sm text-muted-foreground">
              {active} of {total} active
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-40"
          />
          <Button className="gap-1.5" onClick={handleNewAppointment}>
            <Plus className="h-4 w-4" />
            New
          </Button>
        </div>
      </div>

      {/* List */}
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-3 p-6">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-lg" />
            ))
          ) : total === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center text-sm text-muted-foreground">
              <Calendar className="mb-2 h-8 w-8 opacity-30" />
              <p>No appointments for this date</p>
            </div>
          ) : (
            appointments?.map((appt) => (
              <AppointmentCard
                key={appt.name}
                appointment={appt}
                onBill={onBill}
                onEdit={handleEdit}
                onCancel={handleCancel}
              />
            ))
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
