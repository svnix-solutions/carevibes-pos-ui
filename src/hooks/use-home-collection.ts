"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { erpnext } from "@/lib/erpnext/client";

export interface HomeOptions {
  addresses: { name: string; label: string }[];
  phlebotomists: { name: string; employee_name: string }[];
  states: string[];
  default_phone: string | null;
}

export interface NewAddress {
  address_line1: string;
  address_line2: string;
  landmark: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
}

export function useHomeOptions(patient: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ["home-options", patient],
    queryFn: async () =>
      (await erpnext.get<{ message: HomeOptions }>("api/method/phlebo_pos_home_options", { patient: patient! })).message,
    enabled: enabled && !!patient,
  });
}

export function useSaveAddress(patient: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (address: NewAddress) =>
      (
        await erpnext.callMethod<{ message: { name: string; label: string } }>("phlebo_pos_save_address", {
          patient,
          ...address,
        })
      ).message,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["home-options", patient] }),
  });
}
