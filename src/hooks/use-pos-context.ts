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

/**
 * Whether the bill's doctor can be paid directly ("Doctor Cash"): the
 * Supplier's "Allow Doctor Cash" tick-box in ERPNext. Pseudo-doctors such as
 * "Self" (patient booked a test themselves) have it unticked. Read fresh from
 * ERPNext rather than from the cart, which may hold a doctor picked earlier.
 * ERPNext also refuses to submit a Doctor Cash payment that breaks this.
 */
export function useDoctorAllowsCash(doctor: string | null | undefined) {
  return useQuery<boolean>({
    queryKey: ["doctor-allows-cash", doctor],
    queryFn: async () => {
      const s = await erpnext.getDoc<{ custom_allow_doctor_cash?: 0 | 1 }>("Supplier", doctor!);
      return s.custom_allow_doctor_cash === 1;
    },
    enabled: Boolean(doctor),
    staleTime: 5 * 60 * 1000,
  });
}
