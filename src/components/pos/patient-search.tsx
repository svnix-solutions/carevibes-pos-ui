"use client";

import { useState } from "react";
import { Search, User, X, Plus, ArrowLeft, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePatients } from "@/hooks/use-patients";
import { useCreatePatient } from "@/hooks/use-create-patient";
import { useCartStore } from "@/lib/cart/store";
import { toast } from "sonner";
import type { ERPNextPatient } from "@/types/erpnext";

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export function PatientSearch() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const patient = useCartStore((s) => s.patient);
  const setPatient = useCartStore((s) => s.setPatient);
  const { data: patients, isLoading } = usePatients(search);
  const createPatientMutation = useCreatePatient();

  // New patient form state
  const [showNewPatient, setShowNewPatient] = useState(false);
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newGender, setNewGender] = useState("");
  const [newMobile, setNewMobile] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newDob, setNewDob] = useState("");
  const [newBloodGroup, setNewBloodGroup] = useState("");

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

  function handleSelect(p: ERPNextPatient) {
    setPatient(p);
    setSearch("");
    setOpen(false);
  }

  function handleClear() {
    setPatient(null);
    setSearch("");
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
      setPatient(created);
      setOpen(false);
      resetNewPatientForm();
      toast.success("Patient created");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast.error(msg);
    }
  }

  if (patient) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
          {getInitials(patient.patient_name)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{patient.patient_name}</p>
          {patient.mobile && (
            <p className="truncate text-xs text-muted-foreground">{patient.mobile}</p>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0"
          onClick={handleClear}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            data-patient-trigger
            className="w-full justify-start gap-2 border-amber-300 bg-amber-50/50 text-amber-800 hover:bg-amber-100/50 dark:border-amber-700 dark:bg-amber-950/20 dark:text-amber-300 dark:hover:bg-amber-900/30"
          />
        }
      >
        <User className="h-4 w-4" />
        Select Patient
        <kbd className="ml-auto hidden rounded border border-amber-300/50 bg-amber-100/50 px-1 py-0.5 text-[10px] font-normal text-amber-700 lg:inline-block dark:border-amber-700/50 dark:bg-amber-900/30 dark:text-amber-400">
          F2
        </kbd>
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
                value={search}
                onChange={(e) => setSearch(e.target.value)}
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
            <div className="max-h-60 overflow-y-auto">
              {isLoading && (
                <p className="px-3 py-2 text-sm text-muted-foreground">
                  Searching...
                </p>
              )}
              {!isLoading && search.length >= 2 && patients?.length === 0 && (
                <div className="px-3 py-2">
                  <p className="text-sm text-muted-foreground">
                    No patients found
                  </p>
                  <button
                    className="mt-1 text-sm font-medium text-primary hover:underline"
                    onClick={() => {
                      setNewFirstName(search);
                      setShowNewPatient(true);
                    }}
                  >
                    + Add &quot;{search}&quot; as new patient
                  </button>
                </div>
              )}
              {search.length > 0 && search.length < 2 && (
                <p className="px-3 py-2 text-sm text-muted-foreground">
                  Type at least 2 characters
                </p>
              )}
              {patients?.map((p) => (
                <button
                  key={p.name}
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent"
                  onClick={() => handleSelect(p)}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                    {getInitials(p.patient_name)}
                  </div>
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
  );
}
