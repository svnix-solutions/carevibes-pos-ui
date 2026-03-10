"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AppointmentList } from "@/components/pos/appointment-list";
import { useCartStore } from "@/lib/cart/store";
import { erpnext } from "@/lib/erpnext/client";
import type {
  ERPNextAppointment,
  ERPNextPatient,
  ERPNextPractitioner,
  ERPNextSupplier,
} from "@/types/erpnext";

export default function AppointmentsPage() {
  const router = useRouter();
  const setPatient = useCartStore((s) => s.setPatient);
  const setDoctor = useCartStore((s) => s.setDoctor);
  const clearCart = useCartStore((s) => s.clearCart);

  async function handleBill(appointment: ERPNextAppointment) {
    try {
      // Fetch full Patient record (need `customer` field for Sales Order)
      const patient = await erpnext.getDoc<ERPNextPatient>(
        "Patient",
        appointment.patient
      );

      if (!patient.customer) {
        toast.error("Patient has no linked Customer. Cannot create bill.");
        return;
      }

      // Resolve practitioner -> supplier (doctor) for cart
      let doctor: ERPNextSupplier | null = null;
      if (appointment.practitioner) {
        try {
          const practitioner = await erpnext.getDoc<ERPNextPractitioner>(
            "Healthcare Practitioner",
            appointment.practitioner
          );
          if (practitioner.supplier) {
            doctor = await erpnext.getDoc<ERPNextSupplier>(
              "Supplier",
              practitioner.supplier
            );
          }
        } catch {
          // Practitioner or supplier not found — proceed without doctor
        }
      }

      // Pre-fill cart and navigate to billing
      clearCart();
      setPatient(patient);
      if (doctor) {
        setDoctor(doctor);
      }

      router.push("/billing");
      toast.success(`Billing for ${appointment.patient_name}`);
    } catch {
      toast.error("Failed to load patient data");
    }
  }

  return <AppointmentList onBill={handleBill} />;
}
