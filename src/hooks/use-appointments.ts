"use client";

import { useQuery } from "@tanstack/react-query";
import { erpnext } from "@/lib/erpnext/client";
import type { ERPNextAppointment } from "@/types/erpnext";

export function useAppointments(date?: string) {
  const today = date || new Date().toISOString().split("T")[0];

  return useQuery<ERPNextAppointment[]>({
    queryKey: ["appointments", today],
    queryFn: () =>
      erpnext.getList<ERPNextAppointment>("Patient Appointment", {
        fields: [
          "name",
          "patient",
          "patient_name",
          "practitioner",
          "practitioner_name",
          "appointment_date",
          "appointment_time",
          "appointment_type",
          "appointment_for",
          "status",
          "department",
          "duration",
          "invoiced",
          "notes",
        ],
        filters: [
          ["appointment_date", "=", today],
          ["company", "=", "Care Vibes"],
        ],
        orderBy: "appointment_time asc",
        limit: 200,
      }),
    staleTime: 30 * 1000,
  });
}
