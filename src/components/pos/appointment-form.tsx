"use client";

import { useState, useEffect } from "react";
import { Loader2, Search, Plus, ArrowLeft } from "lucide-react";
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
import { useCreatePatient } from "@/hooks/use-create-patient";
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
  const [practitionerLabel, setPractitionerLabel] = useState("");
  const [appointmentType, setAppointmentType] = useState("");
  const [appointmentDate, setAppointmentDate] = useState(defaultDate);
  const [appointmentTime, setAppointmentTime] = useState("09:00");
  const [duration, setDuration] = useState(15);
  const [notes, setNotes] = useState("");

  // New patient form state
  const [showNewPatient, setShowNewPatient] = useState(false);
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newGender, setNewGender] = useState("");
  const [newMobile, setNewMobile] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newDob, setNewDob] = useState("");
  const [newBloodGroup, setNewBloodGroup] = useState("");

  const { data: patients } = usePatients(patientSearch);
  const { data: practitioners } = usePractitioners();
  const { data: appointmentTypes } = useAppointmentTypes();
  const createMutation = useCreateAppointment();
  const updateMutation = useUpdateAppointment();
  const createPatientMutation = useCreatePatient();

  function resetNewPatientForm() {
    setShowNewPatient(false);
    setNewFirstName("");
    setNewLastName("");
    setNewGender("");
    setNewMobile("");
    setNewEmail("");
    setNewDob("");
    setNewBloodGroup("");
  }

  async function handleCreatePatient() {
    if (!newFirstName || !newGender) {
      toast.error("First name and gender are required");
      return;
    }
    try {
      const created = await createPatientMutation.mutateAsync({
        first_name: newFirstName,
        ...(newLastName && { last_name: newLastName }),
        sex: newGender,
        ...(newMobile && { mobile: newMobile }),
        ...(newEmail && { email: newEmail }),
        ...(newDob && { dob: newDob }),
        ...(newBloodGroup && { blood_group: newBloodGroup }),
      });
      setPatient(created.name);
      setPatientLabel(created.patient_name);
      setPatientPopoverOpen(false);
      resetNewPatientForm();
      toast.success("Patient created");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast.error(msg);
    }
  }

  useEffect(() => {
    if (!open) return;
    if (appointment) {
      setPatient(appointment.patient);
      setPatientLabel(appointment.patient_name);
      setPractitioner(appointment.practitioner || "");
      setPractitionerLabel(appointment.practitioner_name || "");
      setAppointmentType(appointment.appointment_type || "");
      setAppointmentDate(appointment.appointment_date);
      setAppointmentTime(
        appointment.appointment_time?.slice(0, 5) || "09:00"
      );
      setDuration(appointment.duration ?? 15);
      setNotes(appointment.notes || "");
    } else {
      setPatient("");
      setPatientLabel("");
      setPatientSearch("");
      resetNewPatientForm();
      setPractitioner("");
      setPractitionerLabel("");
      setAppointmentType("");
      setAppointmentDate(defaultDate);
      setAppointmentTime("09:00");
      setDuration(15);
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
            duration,
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
          duration,
          notes: notes || undefined,
        });
        toast.success("Appointment created");
      }
      onOpenChange(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast.error(msg);
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
                  {showNewPatient ? (
                    <div className="p-3 space-y-3">
                      <div className="flex items-center gap-2">
                        <button
                          className="text-muted-foreground hover:text-foreground"
                          onClick={() => setShowNewPatient(false)}
                        >
                          <ArrowLeft className="h-4 w-4" />
                        </button>
                        <span className="text-sm font-medium">New Patient</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          placeholder="First name *"
                          value={newFirstName}
                          onChange={(e) => setNewFirstName(e.target.value)}
                          autoFocus
                        />
                        <Input
                          placeholder="Last name"
                          value={newLastName}
                          onChange={(e) => setNewLastName(e.target.value)}
                        />
                      </div>
                      <Select value={newGender} onValueChange={(v) => setNewGender(v ?? "")}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Gender *" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="Mobile"
                        value={newMobile}
                        onChange={(e) => setNewMobile(e.target.value)}
                      />
                      <Input
                        placeholder="Email"
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="date"
                          placeholder="Date of birth"
                          value={newDob}
                          onChange={(e) => setNewDob(e.target.value)}
                        />
                        <Select value={newBloodGroup} onValueChange={(v) => setNewBloodGroup(v ?? "")}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Blood group" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="A Positive">A+</SelectItem>
                            <SelectItem value="A Negative">A-</SelectItem>
                            <SelectItem value="B Positive">B+</SelectItem>
                            <SelectItem value="B Negative">B-</SelectItem>
                            <SelectItem value="O Positive">O+</SelectItem>
                            <SelectItem value="O Negative">O-</SelectItem>
                            <SelectItem value="AB Positive">AB+</SelectItem>
                            <SelectItem value="AB Negative">AB-</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        className="w-full"
                        size="sm"
                        onClick={handleCreatePatient}
                        disabled={createPatientMutation.isPending}
                      >
                        {createPatientMutation.isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Save Patient
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 p-2">
                        <Input
                          placeholder="Search by name or phone..."
                          value={patientSearch}
                          onChange={(e) => setPatientSearch(e.target.value)}
                          className="flex-1"
                          autoFocus
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          className="shrink-0 gap-1"
                          onClick={() => setShowNewPatient(true)}
                        >
                          <Plus className="h-3.5 w-3.5" />
                          New
                        </Button>
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        {patientSearch.length > 0 && patientSearch.length < 2 && (
                          <p className="px-3 py-2 text-sm text-muted-foreground">
                            Type at least 2 characters
                          </p>
                        )}
                        {patientSearch.length >= 2 &&
                          patients?.length === 0 && (
                            <div className="px-3 py-2">
                              <p className="text-sm text-muted-foreground">
                                No patients found
                              </p>
                              <button
                                className="mt-1 text-sm font-medium text-primary hover:underline"
                                onClick={() => {
                                  setNewFirstName(patientSearch);
                                  setShowNewPatient(true);
                                }}
                              >
                                + Add &quot;{patientSearch}&quot; as new patient
                              </button>
                            </div>
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
                    </>
                  )}
                </PopoverContent>
              </Popover>
            )}
          </div>

          {/* Practitioner */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Practitioner</label>
            <Select
              value={practitioner}
              onValueChange={(v) => {
                const id = v ?? "";
                setPractitioner(id);
                const match = practitioners?.find((p) => p.name === id);
                setPractitionerLabel(match?.practitioner_name ?? id);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select practitioner">
                  {practitionerLabel || undefined}
                </SelectValue>
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

          {/* Date, Time & Duration */}
          <div className="grid grid-cols-3 gap-3">
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
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Duration</label>
              <Select value={String(duration)} onValueChange={(v) => setDuration(Number(v ?? 15))}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 min</SelectItem>
                  <SelectItem value="15">15 min</SelectItem>
                  <SelectItem value="20">20 min</SelectItem>
                  <SelectItem value="30">30 min</SelectItem>
                  <SelectItem value="45">45 min</SelectItem>
                  <SelectItem value="60">60 min</SelectItem>
                </SelectContent>
              </Select>
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
