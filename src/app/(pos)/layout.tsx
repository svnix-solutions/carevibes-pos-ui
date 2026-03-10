import { POSHeader } from "@/components/pos/pos-header";
import { Toaster } from "sonner";

export default function POSLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen flex-col">
      <POSHeader />
      <main className="flex-1 overflow-hidden">{children}</main>
      <Toaster position="bottom-right" duration={2000} visibleToasts={3} />
    </div>
  );
}
