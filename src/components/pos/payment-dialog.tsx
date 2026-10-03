"use client";

import { useState } from "react";
import { CheckCircle, CircleDollarSign, Clock, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useCartStore } from "@/lib/cart/store";
import { useCreateOrder } from "@/hooks/use-create-order";
import type { CreateOrderResult } from "@/hooks/use-create-order";
import { useTaxConfig, useItemTaxRates } from "@/hooks/use-tax-template";
import { useCouponDiscounts } from "@/hooks/use-coupon";
import {
  calculateTotals,
  formatCurrency,
  calculateChange,
  remainingDue,
  isSettled,
} from "@/lib/cart/calculations";
import { PaymentNumpad } from "./payment-numpad";
import { DOCTOR_CASH_MODE, usePosContext } from "@/hooks/use-pos-context";
import { Receipt } from "./receipt";
import type { PaymentLine, PaymentMethod } from "@/lib/cart/types";

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PaymentDialog({ open, onOpenChange }: PaymentDialogProps) {
  const items = useCartStore((s) => s.items);
  const patient = useCartStore((s) => s.patient);
  const selectedDoctor = useCartStore((s) => s.selectedDoctor);
  const selectedLab = useCartStore((s) => s.selectedLab);
  const cartDiscount = useCartStore((s) => s.cartDiscount);
  const appliedCoupon = useCartStore((s) => s.appliedCoupon);
  const clearCart = useCartStore((s) => s.clearCart);

  const { data: taxConfig } = useTaxConfig();
  const { data: taxRates } = useItemTaxRates(items.map((i) => i.item_code));
  const itemsWithTax = items.map((item) => ({
    ...item,
    taxRate: item.taxRate ?? taxRates?.[item.item_code] ?? 0,
  }));
  const { data: couponDiscounts } = useCouponDiscounts(
    appliedCoupon,
    items,
    patient?.customer
  );
  const totals = calculateTotals(itemsWithTax, {
    cartDiscount,
    couponDiscounts,
    couponApplied: Boolean(appliedCoupon),
  });
  const createOrder = useCreateOrder();
  const { data: posContext, isLoading: posLoading } = usePosContext();

  // Modes come from the user's POS Profile in ERPNext. Doctor Cash only makes
  // sense when a doctor is on the bill — the margin is settled against them.
  const modes = (posContext?.payment_modes ?? []).filter(
    (m) => m.mode !== DOCTOR_CASH_MODE || Boolean(selectedDoctor)
  );
  const defaultMode = (modes.find((m) => m.default) ?? modes[0])?.mode ?? "";

  const [paymentLines, setPaymentLines] = useState<PaymentLine[]>([]);
  const [pickedMethod, setPickedMethod] = useState<PaymentMethod>("");
  // Fall back to the profile default until the cashier picks (or if the
  // picked mode disappears, e.g. the doctor was removed from the bill).
  const currentMethod = modes.some((m) => m.mode === pickedMethod) ? pickedMethod : defaultMode;
  const currentMode = modes.find((m) => m.mode === currentMethod);
  const [amountInput, setAmountInput] = useState("");
  const [reference, setReference] = useState("");
  const [showReceipt, setShowReceipt] = useState(false);
  const [orderResult, setOrderResult] = useState<CreateOrderResult | null>(null);
  const [billedPayLater, setBilledPayLater] = useState(false);

  const totalPaid = paymentLines.reduce((sum, l) => sum + l.amount, 0);
  // Settlement is judged at paisa precision — discounted bills otherwise leave
  // float residue that would block checkout on an exactly-tendered amount.
  const remaining = remainingDue(totalPaid, totals.grandTotal);
  // Change is only given on cash-type tenders (Cash, Doctor Cash).
  const cashTendered = paymentLines
    .filter((l) => l.type === "Cash")
    .reduce((sum, l) => sum + l.amount, 0);
  const nonCashPaid = paymentLines
    .filter((l) => l.type !== "Cash")
    .reduce((sum, l) => sum + l.amount, 0);
  const change = calculateChange(cashTendered, totals.grandTotal - nonCashPaid);

  const isFullyPaid = isSettled(totalPaid, totals.grandTotal) && totalPaid > 0;

  function addPaymentLine() {
    const amount = parseFloat(amountInput);
    if (!amount || amount <= 0) return;

    setPaymentLines((prev) => [
      ...prev,
      { method: currentMethod, type: currentMode?.type, amount, reference: reference || undefined },
    ]);
    setAmountInput("");
    setReference("");
  }

  function removePaymentLine(index: number) {
    setPaymentLines((prev) => prev.filter((_, i) => i !== index));
  }

  function handleFullAmount() {
    setAmountInput(remaining > 0 ? remaining.toFixed(2) : "0");
  }

  async function handleConfirm(payLater = false) {
    if (!patient || !posContext?.pos_profile) return;
    if (!payLater && remaining > 0) return;
    if (
      payLater &&
      !confirm(`Bill ${formatCurrency(totals.grandTotal)} to ${patient.patient_name} and collect payment later?`)
    ) {
      return;
    }

    try {
      const result = await createOrder.mutateAsync({
        patient,
        items,
        payments: paymentLines,
        cartDiscount,
        couponDiscounts,
        coupon: appliedCoupon,
        doctor: selectedDoctor?.name,
        posProfile: posContext.pos_profile,
        payLater,
        lab: selectedLab?.name,
        taxTemplate: taxConfig?.templateName,
        taxRows: taxConfig?.templateTaxRows,
      });
      setOrderResult(result);
      setBilledPayLater(payLater);
      setShowReceipt(true);
    } catch {
      // Error is handled by mutation's error state
    }
  }

  function handleNewSale() {
    clearCart();
    setPaymentLines([]);
    setAmountInput("");
    setReference("");
    setShowReceipt(false);
    setOrderResult(null);
    setBilledPayLater(false);
    onOpenChange(false);
  }

  function handleClose() {
    if (showReceipt) {
      // Order was completed — clear everything
      handleNewSale();
      return;
    }
    setPaymentLines([]);
    setAmountInput("");
    setReference("");
    onOpenChange(false);
  }

  if (showReceipt && orderResult) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-6 w-6" />
              {billedPayLater ? "Billed — payment due" : "Sale Complete"}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center py-2">
            <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <p className="text-lg font-semibold">
              {formatCurrency(
                orderResult.erpnextTotals?.grand_total ?? totals.grandTotal
              )}
            </p>
            <p className="text-sm text-muted-foreground">
              Invoice: {orderResult.salesInvoice.name}
            </p>
          </div>

          {/* The POS and ERPNext each compute totals. With is_pos the payment
              was already taken against ours, so a divergence leaves a real
              balance on the invoice and a supervisor needs to know now. */}
          {orderResult.totalMismatch && (
            <div className="rounded-lg border border-orange-300 bg-orange-50 p-3 text-sm dark:border-orange-900 dark:bg-orange-950/40">
              <p className="font-medium text-orange-700 dark:text-orange-400">
                Total mismatch &mdash; check this invoice
              </p>
              <p className="mt-1 text-orange-700/90 dark:text-orange-400/90">
                Collected {formatCurrency(orderResult.totalMismatch.expected)},
                but ERPNext booked{" "}
                {formatCurrency(orderResult.totalMismatch.actual)}.
              </p>
            </div>
          )}
          <Receipt
            invoiceName={orderResult.salesInvoice.name}
            patient={patient!}
            items={items}
            totals={totals}
            payments={paymentLines}
            change={change}
            couponCode={appliedCoupon?.code}
            amountDue={billedPayLater ? (orderResult.erpnextTotals?.grand_total ?? totals.grandTotal) : undefined}
          />
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => window.print()}>
              Print Receipt
            </Button>
            <Button className="flex-1" onClick={handleNewSale}>
              New Sale
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Payment</DialogTitle>
        </DialogHeader>

        {/* Total */}
        <div className="rounded-xl bg-primary/10 p-5 text-center dark:bg-primary/5">
          <p className="text-sm font-medium text-muted-foreground">Total Amount</p>
          <p className="text-4xl font-bold tracking-tight text-primary">
            {formatCurrency(totals.grandTotal)}
          </p>
          {remaining > 0 && totalPaid > 0 && (
            <p className="mt-1.5 text-sm font-medium text-orange-600 dark:text-orange-400">
              Remaining: {formatCurrency(remaining)}
            </p>
          )}
          {isFullyPaid && change > 0 && (
            <p className="mt-1.5 text-sm font-medium text-green-600 dark:text-green-400">
              Change: {formatCurrency(change)}
            </p>
          )}
        </div>

        {/* Added payment lines */}
        {paymentLines.length > 0 && (
          <div className="space-y-1">
            {paymentLines.map((line, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg border px-3 py-2 animate-in fade-in slide-in-from-top-1 duration-150"
              >
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{line.method}</Badge>
                  <span className="text-sm font-medium">
                    {formatCurrency(line.amount)}
                  </span>
                  {line.reference && (
                    <span className="text-xs text-muted-foreground">
                      Ref: {line.reference}
                    </span>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={() => removePaymentLine(i)}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )}

        <Separator />

        {/* Payment method tabs — from the user's POS Profile */}
        {posLoading ? (
          <div className="flex h-24 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !posContext?.pos_profile || modes.length === 0 ? (
          <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            No POS Profile with payment modes is set up for your user in ERPNext. Ask an administrator
            to add you to a POS Profile.
          </p>
        ) : (
          <Tabs value={currentMethod} onValueChange={(v) => setPickedMethod(v as PaymentMethod)}>
            <TabsList className="w-full">
              {modes.map((m) => (
                <TabsTrigger key={m.mode} value={m.mode} className="flex-1">
                  {m.mode}
                </TabsTrigger>
              ))}
            </TabsList>

            {modes.map((m) => (
              <TabsContent key={m.mode} value={m.mode} className="space-y-3">
                {m.mode === DOCTOR_CASH_MODE && (
                  <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                    {selectedDoctor?.supplier_name} keeps this cash. It&apos;s recorded against their ledger and
                    settled with their margin.
                  </p>
                )}
                {m.type === "Cash" ? (
                  <>
                    <div className="text-center">
                      <p className="mb-1 text-sm text-muted-foreground">Enter amount received</p>
                      <p className="text-2xl font-bold">
                        {amountInput ? formatCurrency(parseFloat(amountInput) || 0) : formatCurrency(0)}
                      </p>
                    </div>
                    <PaymentNumpad value={amountInput} onChange={setAmountInput} />
                  </>
                ) : (
                  <>
                    <Input
                      placeholder="Amount"
                      type="number"
                      value={amountInput}
                      onChange={(e) => setAmountInput(e.target.value)}
                    />
                    <Input
                      placeholder={`${m.mode} reference (optional)`}
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                    />
                  </>
                )}
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={handleFullAmount}>
                    Full Amount
                  </Button>
                  <Button className="flex-1" onClick={addPaymentLine}>
                    Add {m.mode}
                  </Button>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        )}

        <Separator />

        {/* Confirm */}
        <Button
          className={`h-14 w-full text-base font-semibold transition-all ${
            isFullyPaid
              ? "bg-green-600 text-white shadow-lg hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700"
              : ""
          }`}
          disabled={remaining > 0 || createOrder.isPending || !posContext?.pos_profile}
          onClick={() => handleConfirm(false)}
        >
          {createOrder.isPending ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Creating Order...
            </>
          ) : (
            <>
              <CircleDollarSign className="mr-2 h-5 w-5" />
              Confirm Payment
            </>
          )}
        </Button>

        {/* Bill now, collect later — only when nothing has been tendered yet. */}
        {paymentLines.length === 0 && (
          <Button
            variant="outline"
            className="h-11 w-full"
            disabled={createOrder.isPending || !posContext?.pos_profile}
            onClick={() => handleConfirm(true)}
          >
            <Clock className="mr-2 h-4 w-4" />
            Pay later
          </Button>
        )}

        {createOrder.isError && (
          <p className="text-center text-sm text-destructive">
            {createOrder.error?.message || "Failed to create order. Please try again."}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
