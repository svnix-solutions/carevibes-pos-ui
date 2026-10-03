const ERPNEXT_URL = process.env.ERPNEXT_URL || "https://iklera.m.frappe.cloud";

/**
 * ERPNext's system timezone, via the `doctor_context` Server Script (shared
 * with the doctor app — it only returns site settings; POS users can't read
 * System Settings directly). Cached for an hour. Undefined if unreachable.
 */
export async function getClinicTimeZone(accessToken: string): Promise<string | undefined> {
  try {
    const res = await fetch(`${ERPNEXT_URL}/api/method/doctor_context`, {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return undefined;
    return (await res.json()).message?.time_zone || undefined;
  } catch {
    return undefined;
  }
}
