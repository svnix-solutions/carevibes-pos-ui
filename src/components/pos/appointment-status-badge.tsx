"use client";

import { Badge } from "@/components/ui/badge";
import type { AppointmentStatus } from "@/types/erpnext";

const statusConfig: Record<
  AppointmentStatus,
  { variant: "default" | "secondary" | "destructive" | "outline"; className?: string }
> = {
  Scheduled: { variant: "secondary" },
  Open: { variant: "outline" },
  Confirmed: { variant: "default", className: "bg-blue-600 text-white hover:bg-blue-700" },
  "Checked In": { variant: "default", className: "bg-green-600 text-white hover:bg-green-700" },
  "Checked Out": { variant: "secondary", className: "bg-gray-500 text-white" },
  Closed: { variant: "secondary" },
  Cancelled: { variant: "destructive" },
  "No Show": { variant: "destructive" },
};

export function AppointmentStatusBadge({ status }: { status: AppointmentStatus }) {
  const config = statusConfig[status] ?? { variant: "secondary" as const };
  return (
    <Badge variant={config.variant} className={config.className}>
      {status}
    </Badge>
  );
}
