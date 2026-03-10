"use client";

import { useQuery } from "@tanstack/react-query";
import { erpnext } from "@/lib/erpnext/client";
import type { ERPNextAppointmentType } from "@/types/erpnext";

export function useAppointmentTypes() {
  return useQuery<ERPNextAppointmentType[]>({
    queryKey: ["appointment-types"],
    queryFn: () =>
      erpnext.getList<ERPNextAppointmentType>("Appointment Type", {
        fields: ["name"],
        limit: 50,
        orderBy: "name asc",
      }),
    staleTime: 30 * 60 * 1000,
  });
}
