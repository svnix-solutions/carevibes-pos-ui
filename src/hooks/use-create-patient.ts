"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { erpnext } from "@/lib/erpnext/client";
import type { ERPNextPatient } from "@/types/erpnext";

interface CreatePatientInput {
  first_name: string;
  last_name?: string;
  sex: string;
  mobile?: string;
  email?: string;
  dob?: string;
  blood_group?: string;
}

// The Customer Group applied to the Customer that ERPNext Healthcare
// auto-creates alongside a Patient. Must exist in ERPNext under
// Selling → Customer Group.
const PATIENT_CUSTOMER_GROUP = "Patient";

export function useCreatePatient() {
  const queryClient = useQueryClient();

  return useMutation<ERPNextPatient, Error, CreatePatientInput>({
    mutationFn: async (input) => {
      const patient = await erpnext.createDoc<ERPNextPatient>("Patient", {
        ...input,
      });

      // Healthcare creates the linked Customer in an after_insert hook with
      // ERPNext's default group ("Individual"). Override it to "Patient" so
      // billing/reporting can segment patient revenue cleanly.
      if (patient.customer) {
        await erpnext.updateDoc("Customer", patient.customer, {
          customer_group: PATIENT_CUSTOMER_GROUP,
        });
      }

      return patient;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
    },
  });
}
