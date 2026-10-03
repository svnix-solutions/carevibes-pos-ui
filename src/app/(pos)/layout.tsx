import { POSHeader } from "@/components/pos/pos-header";
import { ClinicTimeZone } from "@/components/shared/clinic-time-zone";
import { getSession } from "@/lib/auth/cookies";
import { getClinicTimeZone } from "@/lib/erpnext/server-context";

export default async function POSLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  const timeZone = session ? await getClinicTimeZone(session.erpnext_access_token) : undefined;

  return (
    <ClinicTimeZone tz={timeZone}>
      <div className="flex h-screen flex-col">
        <POSHeader />
        <main className="flex-1 overflow-hidden">{children}</main>
      </div>
    </ClinicTimeZone>
  );
}
