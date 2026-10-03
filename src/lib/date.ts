/**
 * Dates at the clinic. ERPNext books documents on the clinic's calendar day,
 * so "today" must come from the clinic's timezone (ERPNext System Settings,
 * set once per page load by <ClinicTimeZone>) — not from toISOString(), which
 * is the UTC date and in IST is still "yesterday" until 05:30. Falls back to
 * the device zone only if ERPNext couldn't be asked.
 */
let clinicTimeZone: string | undefined;
let clinicClock: Intl.DateTimeFormat | undefined;

export function setClinicTimeZone(tz: string | undefined) {
  if (tz && tz !== clinicTimeZone) {
    clinicTimeZone = tz;
    clinicClock = undefined;
  }
}

function getClinicClock() {
  clinicClock ??= new Intl.DateTimeFormat("en-CA", {
    timeZone: clinicTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return clinicClock;
}

/** Today's date at the clinic, YYYY-MM-DD. */
export function clinicToday(): string {
  const p = Object.fromEntries(getClinicClock().formatToParts(new Date()).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}

/** Calendar arithmetic on a YYYY-MM-DD date (no timezone involved). */
export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

/** A moment shown in the clinic's timezone, e.g. for receipts. */
export function formatClinicDateTime(at: Date = new Date()): string {
  return at.toLocaleString("en-IN", { timeZone: clinicTimeZone, dateStyle: "medium", timeStyle: "short" });
}

/**
 * Approximate date of birth for a patient who only knows their age: today's
 * date (at the clinic) that many years ago. 29 Feb in a non-leap year → 28 Feb.
 */
export function dobFromAge(years: number): string {
  const [y, m, d] = clinicToday().split("-").map(Number);
  const year = y - years;
  const lastDay = new Date(Date.UTC(year, m, 0)).getUTCDate();
  return `${year}-${String(m).padStart(2, "0")}-${String(Math.min(d, lastDay)).padStart(2, "0")}`;
}

/** Completed years between a YYYY-MM-DD birth date and the clinic's today. */
export function ageFromDob(dob: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) return null;
  const [by, bm, bd] = dob.split("-").map(Number);
  const [ty, tm, td] = clinicToday().split("-").map(Number);
  const age = ty - by - (tm < bm || (tm === bm && td < bd) ? 1 : 0);
  return age >= 0 ? age : null;
}
