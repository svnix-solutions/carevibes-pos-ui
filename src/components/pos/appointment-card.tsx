"use client";

import { Clock, Receipt, Pencil, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AppointmentStatusBadge } from "./appointment-status-badge";
import type { ERPNextAppointment } from "@/types/erpnext";

interface AppointmentCardProps {
  appointment: ERPNextAppointment;
  onBill: (appointment: ERPNextAppointment) => void;
  onEdit: (appointment: ERPNextAppointment) => void;
  onCancel: (appointment: ERPNextAppointment) => void;
}

export function AppointmentCard({
  appointment,
  onBill,
  onEdit,
  onCancel,
}: AppointmentCardProps) {
  const isCancelled = appointment.status === "Cancelled";
  const isInvoiced = appointment.invoiced === 1;

  const displayTime = appointment.appointment_time
    ? appointment.appointment_time.slice(0, 5)
    : "--:--";

  return (
    <Card className="flex items-center gap-4 p-4 transition-shadow hover:shadow-md">
      {/* Time */}
      <div className="flex w-16 shrink-0 flex-col items-center text-center">
        <Clock className="mb-0.5 h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-sm font-semibold">{displayTime}</span>
        {appointment.duration ? (
          <span className="text-xs text-muted-foreground">
            {appointment.duration}m
          </span>
        ) : null}
      </div>

      {/* Patient & Practitioner */}
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{appointment.patient_name}</p>
        <p className="truncate text-sm text-muted-foreground">
          {appointment.practitioner_name || "No practitioner"}
          {appointment.appointment_type &&
            ` \u00B7 ${appointment.appointment_type}`}
        </p>
      </div>

      {/* Status */}
      <AppointmentStatusBadge status={appointment.status} />

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-1">
        {!isCancelled && !isInvoiced && (
          <Button
            size="sm"
            className="gap-1"
            onClick={() => onBill(appointment)}
          >
            <Receipt className="h-3.5 w-3.5" />
            Bill
          </Button>
        )}
        {!isCancelled && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(appointment)}
            aria-label="Edit appointment"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        )}
        {!isCancelled && !isInvoiced && (
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive"
            onClick={() => onCancel(appointment)}
            aria-label="Cancel appointment"
          >
            <Ban className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </Card>
  );
}
