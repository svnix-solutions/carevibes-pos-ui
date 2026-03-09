"use client";

import { useState } from "react";
import { CheckCircle, Loader2 } from "lucide-react";
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
import { calculateTotals, formatCurrency, calculateChange } from "@/lib/cart/calculations";
import { PaymentNumpad } from "./payment-numpad";
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
  const discount = useCartStore((s) => s.discount);
  const clearCart = useCartStore((s) => s.clearCart);

  const totals = calculateTotals(items, discount);
  const createOrder = useCreateOrder();

  const [paymentLines, setPaymentLines] = useState<PaymentLine[]>([]);
  const [currentMethod, setCurrentMethod] = useState<PaymentMethod>("Cash");
  const [amountInput, setAmountInput] = useState("");
  const [reference, setReference] = useState("");
  const [showReceipt, setShowReceipt] = useState(false);
  const [orderResult, setOrderResult] = useState<{
    salesOrder: { name: string };
    salesInvoice: { name: string };
  } | null>(null);

  const totalPaid = paymentLines.reduce((sum, l) => sum + l.amount, 0);
  const remaining = totals.grandTotal - totalPaid;
  const cashTendered = paymentLines
    .filter((l) => l.method === "Cash")
    .reduce((sum, l) => sum + l.amount, 0);
  const change = calculateChange(cashTendered, totals.grandTotal - paymentLines.filter(l => l.method !== "Cash").reduce((s, l) => s + l.amount, 0));

  function addPaymentLine() {
    const amount = parseFloat(amountInput);
    if (!amount || amount <= 0) return;

    setPaymentLines((prev) => [
      ...prev,
      { method: currentMethod, amount, reference: reference || undefined },
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

  async function handleConfirm() {
    if (!patient || remaining > 0) return;

    try {
      const result = await createOrder.mutateAsync({
        patient,
        items,
        payments: paymentLines,
        doctor: selectedDoctor?.name,
      });
      setOrderResult(result);
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
    onOpenChange(false);
  }

  function handleClose() {
    if (!showReceipt) {
      setPaymentLines([]);
      setAmountInput("");
      setReference("");
    }
    onOpenChange(false);
  }

  if (showReceipt && orderResult) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              Sale Complete
            </DialogTitle>
          </DialogHeader>
          <Receipt
            invoiceName={orderResult.salesInvoice.name}
            patient={patient!}
            items={items}
            totals={totals}
            payments={paymentLines}
            change={change}
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
        <div className="rounded-lg bg-muted p-4 text-center">
          <p className="text-sm text-muted-foreground">Total Amount</p>
          <p className="text-3xl font-bold">{formatCurrency(totals.grandTotal)}</p>
          {remaining > 0 && (
            <p className="mt-1 text-sm text-orange-600">
              Remaining: {formatCurrency(remaining)}
            </p>
          )}
          {remaining <= 0 && totalPaid > 0 && change > 0 && (
            <p className="mt-1 text-sm text-green-600">
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
                className="flex items-center justify-between rounded border px-3 py-1.5"
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

        {/* Payment method tabs */}
        <Tabs
          value={currentMethod}
          onValueChange={(v) => setCurrentMethod(v as PaymentMethod)}
        >
          <TabsList className="w-full">
            <TabsTrigger value="Cash" className="flex-1">Cash</TabsTrigger>
            <TabsTrigger value="UPI" className="flex-1">UPI</TabsTrigger>
            <TabsTrigger value="Card" className="flex-1">Card</TabsTrigger>
          </TabsList>

          <TabsContent value="Cash" className="space-y-3">
            <div className="text-center">
              <p className="mb-1 text-sm text-muted-foreground">Enter cash amount</p>
              <p className="text-2xl font-bold">
                {amountInput ? formatCurrency(parseFloat(amountInput) || 0) : formatCurrency(0)}
              </p>
            </div>
            <PaymentNumpad value={amountInput} onChange={setAmountInput} />
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={handleFullAmount}
              >
                Full Amount
              </Button>
              <Button size="sm" className="flex-1" onClick={addPaymentLine}>
                Add Cash Payment
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="UPI" className="space-y-3">
            <Input
              placeholder="Amount"
              type="number"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
            />
            <Input
              placeholder="UPI Reference (optional)"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={handleFullAmount}
              >
                Full Amount
              </Button>
              <Button size="sm" className="flex-1" onClick={addPaymentLine}>
                Add UPI Payment
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="Card" className="space-y-3">
            <Input
              placeholder="Amount"
              type="number"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
            />
            <Input
              placeholder="Card Reference / Last 4 digits (optional)"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={handleFullAmount}
              >
                Full Amount
              </Button>
              <Button size="sm" className="flex-1" onClick={addPaymentLine}>
                Add Card Payment
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        <Separator />

        {/* Confirm */}
        <Button
          size="lg"
          className="w-full"
          disabled={remaining > 0 || createOrder.isPending}
          onClick={handleConfirm}
        >
          {createOrder.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating Order...
            </>
          ) : (
            "Confirm Payment"
          )}
        </Button>

        {createOrder.isError && (
          <p className="text-center text-sm text-destructive">
            Failed to create order. Please try again.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
