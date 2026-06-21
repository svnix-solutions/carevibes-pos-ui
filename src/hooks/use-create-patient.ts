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

export function useCreatePatient() {
  const queryClient = useQueryClient();

  return useMutation<ERPNextPatient, Error, CreatePatientInput>({
    mutationFn: async (input) =>
      erpnext.createDoc<ERPNextPatient>("Patient", { ...input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
    },
  });
}
