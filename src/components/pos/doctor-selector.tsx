"use client";

import { Stethoscope, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDoctors } from "@/hooks/use-doctors";
import { useCartStore } from "@/lib/cart/store";

export function DoctorSelector() {
  const doctor = useCartStore((s) => s.selectedDoctor);
  const setDoctor = useCartStore((s) => s.setDoctor);
  const { data: doctors, isLoading } = useDoctors();

  if (doctor) {
    return (
      <div className="flex items-center gap-2 rounded-md border bg-blue-50 px-3 py-1.5 dark:bg-blue-950/30">
        <Stethoscope className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <span className="text-sm font-medium">{doctor.supplier_name}</span>
        <Button
          variant="ghost"
          size="icon"
          className="ml-1 h-5 w-5"
          onClick={() => setDoctor(null)}
          aria-label="Clear doctor"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <Select
      value=""
      onValueChange={(value) => {
        const selected = doctors?.find((d) => d.name === value);
        setDoctor(selected || null);
      }}
    >
      <SelectTrigger className="w-[180px]" aria-label="Select Doctor">
        <Stethoscope className="h-4 w-4 shrink-0" />
        <SelectValue
          placeholder={isLoading ? "Loading..." : "Select Doctor"}
        />
      </SelectTrigger>
      <SelectContent>
        {doctors?.map((d) => (
          <SelectItem key={d.name} value={d.name}>
            {d.supplier_name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
