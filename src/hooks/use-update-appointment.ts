"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { erpnext } from "@/lib/erpnext/client";
import type { ERPNextAppointment } from "@/types/erpnext";

interface UpdateAppointmentInput {
  name: string;
  appointment_date: string;
  fields: Record<string, unknown>;
}

export function useUpdateAppointment() {
  const queryClient = useQueryClient();

  return useMutation<ERPNextAppointment, Error, UpdateAppointmentInput>({
    mutationFn: async ({ name, fields }) =>
      erpnext.updateDoc<ERPNextAppointment>(
        "Patient Appointment",
        name,
        fields
      ),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["appointments", variables.appointment_date],
      });
    },
  });
}
