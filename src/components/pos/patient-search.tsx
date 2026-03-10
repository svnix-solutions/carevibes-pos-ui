"use client";

import { useState } from "react";
import { Search, User, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { usePatients } from "@/hooks/use-patients";
import { useCartStore } from "@/lib/cart/store";
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

  function handleSelect(p: ERPNextPatient) {
    setPatient(p);
    setSearch("");
    setOpen(false);
  }

  function handleClear() {
    setPatient(null);
    setSearch("");
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
        <div className="p-2">
          <Input
            placeholder="Search by name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>
        <div className="max-h-60 overflow-y-auto">
          {isLoading && (
            <p className="px-3 py-2 text-sm text-muted-foreground">
              Searching...
            </p>
          )}
          {!isLoading && search.length >= 2 && patients?.length === 0 && (
            <p className="px-3 py-2 text-sm text-muted-foreground">
              No patients found
            </p>
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
      </PopoverContent>
    </Popover>
  );
}
