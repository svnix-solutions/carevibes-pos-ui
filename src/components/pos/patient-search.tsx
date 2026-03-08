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
      <div className="flex items-center gap-2 rounded-md border bg-primary/5 px-3 py-1.5">
        <User className="h-4 w-4 text-primary" />
        <div className="text-sm">
          <span className="font-medium">{patient.patient_name}</span>
          {patient.mobile && (
            <span className="ml-2 text-muted-foreground">{patient.mobile}</span>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="ml-1 h-5 w-5"
          onClick={handleClear}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={<Button variant="outline" className="gap-2" />}
      >
        <Search className="h-4 w-4" />
        Select Patient
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
              className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-accent"
              onClick={() => handleSelect(p)}
            >
              <User className="h-4 w-4 shrink-0 text-muted-foreground" />
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
