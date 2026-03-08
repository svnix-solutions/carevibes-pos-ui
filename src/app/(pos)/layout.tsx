import { POSHeader } from "@/components/pos/pos-header";

export default function POSLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen flex-col">
      <POSHeader />
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
