"use client";

import {
  CheckCircle,
  Circle,
  CircleDot,
  XCircle,
  AlertTriangle,
  RotateCcw,
  FileText,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { InvoiceStatus } from "@/types/erpnext";

const statusConfig: Record<
  InvoiceStatus,
  {
    variant: "default" | "secondary" | "destructive" | "outline";
    className?: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  Draft: { variant: "secondary", icon: FileText },
  Submitted: { variant: "outline", className: "border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-400", icon: CircleDot },
  Paid: { variant: "default", className: "bg-green-600 text-white hover:bg-green-700", icon: CheckCircle },
  "Partly Paid": { variant: "default", className: "bg-amber-500 text-white hover:bg-amber-600", icon: Circle },
  Unpaid: { variant: "destructive", icon: AlertTriangle },
  Overdue: { variant: "destructive", className: "bg-red-800 text-white hover:bg-red-900", icon: AlertTriangle },
  Cancelled: { variant: "secondary", className: "text-muted-foreground line-through", icon: XCircle },
  Return: { variant: "secondary", className: "text-purple-700 dark:text-purple-400", icon: RotateCcw },
  "Credit Note Issued": { variant: "secondary", className: "text-purple-700 dark:text-purple-400", icon: RotateCcw },
};

export function InvoiceStatusBadge({ status }: { status: string }) {
  const config = statusConfig[status as InvoiceStatus] ?? {
    variant: "secondary" as const,
    icon: CircleDot,
  };
  const Icon = config.icon;
  return (
    <Badge variant={config.variant} className={config.className}>
      <Icon className="mr-1 h-3 w-3" />
      {status}
    </Badge>
  );
}
