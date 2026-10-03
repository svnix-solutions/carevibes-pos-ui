"use client";

import { setClinicTimeZone } from "@/lib/date";

/** Sets the clinic timezone before any child renders. */
export function ClinicTimeZone({ tz, children }: { tz?: string; children: React.ReactNode }) {
  setClinicTimeZone(tz);
  return children;
}
