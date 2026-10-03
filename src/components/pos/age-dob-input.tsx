"use client";

import { Input } from "@/components/ui/input";
import { ageFromDob, clinicToday, dobFromAge } from "@/lib/date";

const MAX_AGE = 120;

/**
 * Age and date of birth, kept in step. Most walk-in patients know their age,
 * not their birth date — typing an age fills an approximate date of birth
 * (today, that many years ago), and picking a date shows the age. Only the
 * date of birth is stored; ERPNext derives age from it.
 */
export function AgeDobInput({ dob, onDobChange }: { dob: string; onDobChange: (dob: string) => void }) {
  const age = dob ? ageFromDob(dob) : null;

  function handleAge(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 3);
    if (!digits) return onDobChange("");
    const years = Math.min(Number(digits), MAX_AGE);
    onDobChange(dobFromAge(years));
  }

  return (
    <div className="grid grid-cols-[5.5rem_1fr] gap-2">
      <Input
        placeholder="Age"
        inputMode="numeric"
        aria-label="Age in years"
        value={age ?? ""}
        onChange={(e) => handleAge(e.target.value)}
      />
      <Input
        type="date"
        aria-label="Date of birth"
        max={clinicToday()}
        value={dob}
        onChange={(e) => onDobChange(e.target.value)}
      />
    </div>
  );
}
