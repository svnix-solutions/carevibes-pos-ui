"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { erpnext } from "@/lib/erpnext/client";

export interface ClinicTube {
  name: string;
  sample: string;
  barcode: string;
  time: string;
  custody: string;
  has_photo: boolean;
}

export interface ClinicOrder {
  invoice: string;
  sales_order: string;
  date: string;
  time: string;
  customer_name: string;
  patient: string | null;
  patient_name: string | null;
  status: "Pending" | "Collected" | "Not Collected";
  items: { item_code: string; item_name: string; qty: number }[];
  /** Tests with no tube mapping on the Item — tubes are added by hand. */
  unmapped_items: string[];
  expected_tubes: { sample: string; qty: number }[];
  collected: ClinicTube[];
}

/**
 * The pending queue. The Server Scripts refuse users without the Phlebotomist
 * role, so an error here also means "don't show collection in this POS".
 */
export function useClinicQueue() {
  return useQuery({
    queryKey: ["clinic-orders"],
    queryFn: async () =>
      (await erpnext.get<{ message: { orders: ClinicOrder[] } }>("api/method/phlebo_clinic_orders")).message.orders,
    retry: false,
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
  });
}

/** One bill's collection; `order` is null when it has nothing to collect. */
export function useClinicOrder(invoice: string) {
  return useQuery({
    queryKey: ["clinic-order", invoice],
    queryFn: async () =>
      (
        await erpnext.get<{ message: { order: ClinicOrder | null; samples: string[] } }>(
          "api/method/phlebo_clinic_orders",
          { invoice }
        )
      ).message,
    retry: false,
  });
}

function useRefresh(invoice: string) {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["clinic-order", invoice] });
    queryClient.invalidateQueries({ queryKey: ["clinic-orders"] });
  };
}

export function useCollectTube(invoice: string) {
  const refresh = useRefresh(invoice);
  return useMutation({
    mutationFn: (args: { sample: string; barcode: string; photo?: string }) =>
      erpnext.callMethod("phlebo_clinic_collect", { invoice, ...args }),
    onSuccess: refresh,
  });
}

export function useFinishCollection(invoice: string) {
  const refresh = useRefresh(invoice);
  return useMutation({
    mutationFn: (args: { outcome: "collected" | "not_collected"; reason?: string }) =>
      erpnext.callMethod("phlebo_clinic_finish", { invoice, ...args }),
    onSuccess: refresh,
  });
}
