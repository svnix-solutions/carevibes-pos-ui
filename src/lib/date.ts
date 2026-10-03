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
