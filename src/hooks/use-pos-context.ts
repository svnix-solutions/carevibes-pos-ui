"use client";

import { useQuery } from "@tanstack/react-query";
import { erpnext, ERPNEXT_COMPANY } from "@/lib/erpnext/client";

export interface PosPaymentMode {
  mode: string;
  type: "Cash" | "Bank" | "General" | "Phone";
  default: 0 | 1;
}

export interface PosContext {
  pos_profile: string | null;
  payment_modes: PosPaymentMode[];
}

/**
 * The POS Profile for the logged-in user and the payment modes it allows, via
 * the `pos_context` Server Script. Payment modes are switched on/off per user
 * in ERPNext by editing the profile — nothing in the app.
 */
export function usePosContext() {
  return useQuery<PosContext>({
    queryKey: ["pos-context"],
    queryFn: async () => {
      const res = await erpnext.callMethod<{ message: PosContext }>("pos_context", {
        company: ERPNEXT_COMPANY,
      });
      return res.message;
    },
    staleTime: 10 * 60 * 1000,
  });
}

/** Doctor-retained cash. Only offered when the bill has a doctor on it. */
export const DOCTOR_CASH_MODE = "Doctor Cash";
