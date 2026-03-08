"use client";

import { useQuery } from "@tanstack/react-query";
import { erpnext } from "@/lib/erpnext/client";
import { useDebouncedValue } from "./use-debounced-value";
import type { ERPNextPatient } from "@/types/erpnext";

export function usePatients(search: string) {
  const debouncedSearch = useDebouncedValue(search, 300);

  return useQuery<ERPNextPatient[]>({
    queryKey: ["patients", debouncedSearch],
    queryFn: () =>
      erpnext.getList<ERPNextPatient>("Patient", {
        fields: ["name", "patient_name", "mobile", "email", "customer"],
        orFilters: [
          ["patient_name", "like", `%${debouncedSearch}%`],
          ["mobile", "like", `%${debouncedSearch}%`],
        ],
        limit: 20,
      }),
    enabled: debouncedSearch.length >= 2,
    staleTime: 60 * 1000,
  });
}
