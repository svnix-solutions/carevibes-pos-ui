"use client";

import {
  Clock,
  CheckCircle,
  CircleDot,
  LogIn,
  LogOut,
  Lock,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { AppointmentStatus } from "@/types/erpnext";

const statusConfig: Record<
  AppointmentStatus,
  {
    variant: "default" | "secondary" | "destructive" | "outline";
    className?: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  Scheduled: { variant: "secondary", icon: Clock },
  Open: { variant: "outline", className: "border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-400", icon: CircleDot },
  Confirmed: { variant: "default", className: "bg-teal-600 text-white hover:bg-teal-700", icon: CheckCircle },
  "Checked In": { variant: "default", className: "bg-amber-500 text-white hover:bg-amber-600", icon: LogIn },
  "Checked Out": { variant: "default", className: "bg-green-600 text-white hover:bg-green-700", icon: LogOut },
  Closed: { variant: "secondary", className: "bg-gray-500 text-white", icon: Lock },
  Cancelled: { variant: "destructive", icon: XCircle },
  "No Show": { variant: "destructive", className: "bg-red-700 text-white hover:bg-red-800", icon: AlertTriangle },
};

export function AppointmentStatusBadge({ status }: { status: AppointmentStatus }) {
  const config = statusConfig[status] ?? { variant: "secondary" as const, icon: CircleDot };
  const Icon = config.icon;
  return (
    <Badge variant={config.variant} className={config.className}>
      <Icon className="mr-1 h-3 w-3" />
      {status}
    </Badge>
  );
}
