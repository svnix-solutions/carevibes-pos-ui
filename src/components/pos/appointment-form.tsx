"use client";

import { useState, useEffect } from "react";
import { Loader2, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { usePatients } from "@/hooks/use-patients";
import { usePractitioners } from "@/hooks/use-practitioners";
import { useAppointmentTypes } from "@/hooks/use-appointment-types";
import { useCreateAppointment } from "@/hooks/use-create-appointment";
import { useUpdateAppointment } from "@/hooks/use-update-appointment";
import { toast } from "sonner";
import type { ERPNextAppointment } from "@/types/erpnext";

interface AppointmentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment?: ERPNextAppointment | null;
  defaultDate: string;
}

export function AppointmentForm({
  open,
  onOpenChange,
  appointment,
  defaultDate,
}: AppointmentFormProps) {
  const isEdit = !!appointment;

  const [patient, setPatient] = useState("");
  const [patientLabel, setPatientLabel] = useState("");
  const [patientSearch, setPatientSearch] = useState("");
  const [patientPopoverOpen, setPatientPopoverOpen] = useState(false);
  const [practitioner, setPractitioner] = useState("");
  const [appointmentType, setAppointmentType] = useState("");
  const [appointmentDate, setAppointmentDate] = useState(defaultDate);
  const [appointmentTime, setAppointmentTime] = useState("09:00");
  const [notes, setNotes] = useState("");

  const { data: patients } = usePatients(patientSearch);
  const { data: practitioners } = usePractitioners();
  const { data: appointmentTypes } = useAppointmentTypes();
  const createMutation = useCreateAppointment();
  const updateMutation = useUpdateAppointment();

  useEffect(() => {
    if (!open) return;
    if (appointment) {
      setPatient(appointment.patient);
      setPatientLabel(appointment.patient_name);
      setPractitioner(appointment.practitioner || "");
      setAppointmentType(appointment.appointment_type || "");
      setAppointmentDate(appointment.appointment_date);
      setAppointmentTime(
        appointment.appointment_time?.slice(0, 5) || "09:00"
      );
      setNotes(appointment.notes || "");
    } else {
      setPatient("");
      setPatientLabel("");
      setPatientSearch("");
      setPractitioner("");
      setAppointmentType("");
      setAppointmentDate(defaultDate);
      setAppointmentTime("09:00");
      setNotes("");
    }
  }, [appointment, open, defaultDate]);

  const isPending = createMutation.isPending || updateMutation.isPending;

  async function handleSubmit() {
    if (!patient || !appointmentType || !appointmentDate) {
      toast.error("Patient, type, and date are required");
      return;
    }

    try {
      if (isEdit) {
        await updateMutation.mutateAsync({
          name: appointment!.name,
          appointment_date: appointment!.appointment_date,
          fields: {
            practitioner: practitioner || undefined,
            appointment_type: appointmentType,
            appointment_date: appointmentDate,
            appointment_time: appointmentTime + ":00",
            notes: notes || undefined,
          },
        });
        toast.success("Appointment updated");
      } else {
        await createMutation.mutateAsync({
          patient,
          practitioner: practitioner || undefined,
          appointment_type: appointmentType,
          appointment_for: "Practitioner",
          appointment_date: appointmentDate,
          appointment_time: appointmentTime + ":00",
          notes: notes || undefined,
        });
        toast.success("Appointment created");
      }
      onOpenChange(false);
    } catch {
      toast.error(
        isEdit
          ? "Failed to update appointment"
          : "Failed to create appointment"
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Appointment" : "New Appointment"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Patient */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Patient <span className="text-destructive">*</span>
            </label>
            {isEdit ? (
              <Input value={patientLabel} disabled />
            ) : (
              <Popover
                open={patientPopoverOpen}
                onOpenChange={setPatientPopoverOpen}
              >
                <PopoverTrigger
                  render={
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-2 font-normal"
                    />
                  }
                >
                  <Search className="h-4 w-4 text-muted-foreground" />
                  {patientLabel || "Search patient..."}
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" align="start">
                  <div className="p-2">
                    <Input
                      placeholder="Search by name or phone..."
                      value={patientSearch}
                      onChange={(e) => setPatientSearch(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {patientSearch.length > 0 && patientSearch.length < 2 && (
                      <p className="px-3 py-2 text-sm text-muted-foreground">
                        Type at least 2 characters
                      </p>
                    )}
                    {patientSearch.length >= 2 &&
                      patients?.length === 0 && (
                        <p className="px-3 py-2 text-sm text-muted-foreground">
                          No patients found
                        </p>
                      )}
                    {patients?.map((p) => (
                      <button
                        key={p.name}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
                        onClick={() => {
                          setPatient(p.name);
                          setPatientLabel(p.patient_name);
                          setPatientSearch("");
                          setPatientPopoverOpen(false);
                        }}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="font-medium">{p.patient_name}</div>
                          <div className="text-xs text-muted-foreground">
                            {p.mobile || p.email || p.name}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>

          {/* Practitioner */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Practitioner</label>
            <Select value={practitioner} onValueChange={(v) => setPractitioner(v ?? "")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select practitioner" />
              </SelectTrigger>
              <SelectContent>
                {practitioners?.map((p) => (
                  <SelectItem key={p.name} value={p.name}>
                    {p.practitioner_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Appointment Type */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Type <span className="text-destructive">*</span>
            </label>
            <Select value={appointmentType} onValueChange={(v) => setAppointmentType(v ?? "")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {appointmentTypes?.map((t) => (
                  <SelectItem key={t.name} value={t.name}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Date <span className="text-destructive">*</span>
              </label>
              <Input
                type="date"
                value={appointmentDate}
                onChange={(e) => setAppointmentDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Time</label>
              <Input
                type="time"
                value={appointmentTime}
                onChange={(e) => setAppointmentTime(e.target.value)}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Notes</label>
            <Textarea
              placeholder="Optional notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
