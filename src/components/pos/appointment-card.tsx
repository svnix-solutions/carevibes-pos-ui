"use client";

import { Receipt, Pencil, Ban, LogIn, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AppointmentStatusBadge } from "./appointment-status-badge";
import { cn } from "@/lib/utils";
import type { ERPNextAppointment, AppointmentStatus } from "@/types/erpnext";

interface AppointmentCardProps {
  appointment: ERPNextAppointment;
  onBill: (appointment: ERPNextAppointment) => void;
  onEdit: (appointment: ERPNextAppointment) => void;
  onCancel: (appointment: ERPNextAppointment) => void;
  onCheckIn: (appointment: ERPNextAppointment) => void;
}

const borderColor: Partial<Record<AppointmentStatus, string>> = {
  Scheduled: "border-l-blue-400",
  Open: "border-l-blue-500",
  Confirmed: "border-l-teal-500",
  "Checked In": "border-l-amber-500",
  "Checked Out": "border-l-green-500",
  Closed: "border-l-gray-400",
  Cancelled: "border-l-red-400",
  "No Show": "border-l-red-600",
};

const dotColor: Partial<Record<AppointmentStatus, string>> = {
  Scheduled: "border-blue-400 bg-blue-400",
  Open: "border-blue-500 bg-blue-500",
  Confirmed: "border-teal-500 bg-teal-500",
  "Checked In": "border-amber-500 bg-amber-500",
  "Checked Out": "border-green-500 bg-green-500",
  Closed: "border-gray-400 bg-gray-400",
  Cancelled: "border-gray-300 bg-gray-300",
  "No Show": "border-red-500 bg-red-500",
};

const rowBg: Partial<Record<AppointmentStatus, string>> = {
  "Checked In": "bg-amber-50/40 dark:bg-amber-950/10",
  "Checked Out": "bg-green-50/30 dark:bg-green-950/10",
  Cancelled: "bg-muted/20",
  "No Show": "bg-muted/20",
};

export function AppointmentCard({
  appointment,
  onBill,
  onEdit,
  onCancel,
  onCheckIn,
}: AppointmentCardProps) {
  const isCancelled = appointment.status === "Cancelled";
  const isNoShow = appointment.status === "No Show";
  const isInactive = isCancelled || isNoShow;
  const isInvoiced = appointment.invoiced === 1;
  const canCheckIn = ["Scheduled", "Open", "Confirmed"].includes(appointment.status);

  const displayTime = appointment.appointment_time
    ? appointment.appointment_time.slice(0, 5)
    : "--:--";

  return (
    <div className="relative mb-3 last:mb-0">
      {/* Time marker on the timeline */}
      <div className="absolute left-[-96px] top-3 w-16 text-right">
        <span className="text-sm font-semibold tabular-nums">{displayTime}</span>
        {appointment.duration ? (
          <p className="text-[10px] text-muted-foreground">{appointment.duration}m</p>
        ) : null}
      </div>

      {/* Dot on the connector line */}
      <div
        className={cn(
          "absolute left-[-22px] top-[14px] h-2.5 w-2.5 rounded-full border-2",
          dotColor[appointment.status] ?? "border-gray-400 bg-gray-400",
          isInactive && "opacity-50"
        )}
      />

      {/* Content row with left border accent */}
      <div
        className={cn(
          "group rounded-lg border border-l-4 p-3 transition-all hover:shadow-sm",
          borderColor[appointment.status] ?? "border-l-gray-400",
          rowBg[appointment.status],
          isInactive && "opacity-50"
        )}
      >
        <div className="flex items-center gap-3">
          {/* Patient & Practitioner */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate font-medium">{appointment.patient_name}</p>
              {isInvoiced && (
                <Badge variant="default" className="shrink-0 bg-green-600 text-white text-[10px] px-1.5 py-0">
                  <CheckCircle className="mr-0.5 h-2.5 w-2.5" />
                  Billed
                </Badge>
              )}
            </div>
            <p className="truncate text-sm text-muted-foreground">
              {appointment.practitioner_name || "No practitioner"}
              {appointment.appointment_type &&
                ` \u00B7 ${appointment.appointment_type}`}
            </p>
            {appointment.notes && (
              <p className="mt-0.5 truncate text-xs text-muted-foreground/70">
                {appointment.notes}
              </p>
            )}
          </div>

          {/* Status badge */}
          <AppointmentStatusBadge status={appointment.status} />

          {/* Actions — visible on hover (desktop), always on touch */}
          <div className="flex shrink-0 items-center gap-1 lg:opacity-0 lg:transition-opacity lg:group-hover:opacity-100">
            {canCheckIn && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1 text-xs border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-950"
                onClick={() => onCheckIn(appointment)}
              >
                <LogIn className="h-3 w-3" />
                Check In
              </Button>
            )}
            {!isInactive && !isInvoiced && (
              <Button size="sm" className="h-7 gap-1 text-xs" onClick={() => onBill(appointment)}>
                <Receipt className="h-3 w-3" />
                Bill
              </Button>
            )}
            {!isInactive && (
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => onEdit(appointment)} aria-label="Edit">
                <Pencil className="h-3 w-3" />
              </Button>
            )}
            {!isInactive && !isInvoiced && (
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => onCancel(appointment)} aria-label="Cancel">
                <Ban className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
