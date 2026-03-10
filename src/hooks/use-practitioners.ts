"use client";

import { useQuery } from "@tanstack/react-query";
import { erpnext } from "@/lib/erpnext/client";
import type { ERPNextPractitioner } from "@/types/erpnext";

export function usePractitioners() {
  return useQuery<ERPNextPractitioner[]>({
    queryKey: ["practitioners"],
    queryFn: () =>
      erpnext.getList<ERPNextPractitioner>("Healthcare Practitioner", {
        fields: ["name", "practitioner_name", "supplier", "department"],
        limit: 100,
        orderBy: "practitioner_name asc",
      }),
    staleTime: 30 * 60 * 1000,
  });
}
