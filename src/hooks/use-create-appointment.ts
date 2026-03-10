"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { erpnext } from "@/lib/erpnext/client";
import type { ERPNextAppointment } from "@/types/erpnext";

interface CreateAppointmentInput {
  patient: string;
  practitioner?: string;
  appointment_type: string;
  appointment_date: string;
  appointment_time: string;
  appointment_for: string;
  department?: string;
  notes?: string;
}

export function useCreateAppointment() {
  const queryClient = useQueryClient();

  return useMutation<ERPNextAppointment, Error, CreateAppointmentInput>({
    mutationFn: async (input) =>
      erpnext.createDoc<ERPNextAppointment>("Patient Appointment", {
        ...input,
        company: "Care Vibes",
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["appointments", variables.appointment_date],
      });
    },
  });
}
