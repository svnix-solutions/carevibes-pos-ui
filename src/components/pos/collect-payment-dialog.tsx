"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { erpnext } from "@/lib/erpnext/client";
import { formatCurrency } from "@/lib/cart/calculations";
import { DOCTOR_CASH_MODE, useDoctorAllowsCash, usePosContext } from "@/hooks/use-pos-context";
import { useCollectPayment } from "@/hooks/use-collect-payment";
import { cn } from "@/lib/utils";
import type { ERPNextSalesInvoice } from "@/types/erpnext";

/** The doctor on the bill (Sales Order.custom_doctor), if any. */
function useInvoiceDoctor(invoice: ERPNextSalesInvoice) {
  const salesOrder = invoice.items?.find((i) => i.sales_order)?.sales_order;
  return useQuery<string | null>({
    queryKey: ["invoice-doctor", salesOrder],
    queryFn: async () => {
      const so = await erpnext.getDoc<{ custom_doctor?: string }>("Sales Order", salesOrder!);
      return so.custom_doctor ?? null;
    },
    enabled: Boolean(salesOrder),
  });
}

export function CollectPaymentDialog({
  invoice,
  open,
  onOpenChange,
}: {
  invoice: ERPNextSalesInvoice;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const outstanding = invoice.outstanding_amount ?? 0;
  const { data: posContext, isLoading } = usePosContext();
  const { data: doctor } = useInvoiceDoctor(invoice);
  const collect = useCollectPayment();

  const { data: doctorAllowsCash } = useDoctorAllowsCash(doctor);
  // Doctor Cash only when the bill's doctor takes it — not for "Self" or no doctor.
  const modes = (posContext?.payment_modes ?? []).filter(
    (m) => m.mode !== DOCTOR_CASH_MODE || doctorAllowsCash === true
  );
  const [picked, setPicked] = useState("");
  const mode = modes.some((m) => m.mode === picked) ? picked : (modes.find((m) => m.default) ?? modes[0])?.mode ?? "";
  const [amountInput, setAmountInput] = useState(outstanding.toFixed(2));
  const [reference, setReference] = useState("");
  const amount = Number(amountInput) || 0;
  const valid = amount > 0 && amount <= outstanding + 0.005 && Boolean(mode);

  async function handleCollect() {
    try {
      await collect.mutateAsync({ invoice, modeOfPayment: mode, amount, reference: reference.trim() || undefined });
      toast.success(`${formatCurrency(amount)} received by ${mode}`);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't record payment");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Collect payment · {invoice.name}</DialogTitle>
        </DialogHeader>

        <div className="rounded-xl bg-primary/10 p-4 text-center">
          <p className="text-sm text-muted-foreground">Outstanding</p>
          <p className="text-3xl font-bold text-primary">{formatCurrency(outstanding)}</p>
        </div>

        {isLoading ? (
          <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
        ) : modes.length === 0 ? (
          <p className="text-sm text-destructive">No payment modes on your POS Profile.</p>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {modes.map((m) => (
                <button
                  key={m.mode}
                  type="button"
                  onClick={() => setPicked(m.mode)}
                  aria-pressed={mode === m.mode}
                  className={cn(
                    "h-10 rounded-lg border px-4 text-sm font-medium",
                    mode === m.mode ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"
                  )}
                >
                  {m.mode}
                </button>
              ))}
            </div>
            {mode === DOCTOR_CASH_MODE && (
              <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                {doctor} keeps this cash; it&apos;s recorded against their ledger and settled with their margin.
              </p>
            )}
            <div className="flex gap-2">
              <Input
                type="number"
                inputMode="decimal"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                aria-label="Amount"
              />
              <Button variant="outline" onClick={() => setAmountInput(outstanding.toFixed(2))}>
                Full
              </Button>
            </div>
            {amount > outstanding + 0.005 && (
              <p className="text-xs text-destructive">More than the outstanding amount.</p>
            )}
            <Input
              placeholder={`${mode} reference (optional)`}
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
            <Button className="h-12 w-full" disabled={!valid || collect.isPending} onClick={handleCollect}>
              {collect.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Record {formatCurrency(amount)}
              {amount > 0 && amount < outstanding - 0.005 ? " (part payment)" : ""}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
