"use client";

import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/cart/calculations";
import type { CartItem, CartTotals, PaymentLine } from "@/lib/cart/types";
import type { ERPNextPatient } from "@/types/erpnext";

interface ReceiptProps {
  invoiceName: string;
  patient: ERPNextPatient;
  items: CartItem[];
  totals: CartTotals;
  payments: PaymentLine[];
  change: number;
}

export function Receipt({
  invoiceName,
  patient,
  items,
  totals,
  payments,
  change,
}: ReceiptProps) {
  const now = new Date();

  return (
    <div className="space-y-3 text-sm print:text-xs">
      {/* Header */}
      <div className="text-center">
        <h3 className="text-lg font-bold">CareVibes</h3>
        <p className="text-muted-foreground">Healthcare Services</p>
        <Separator className="my-2" />
        <p className="font-mono text-xs">{invoiceName}</p>
        <p className="text-xs text-muted-foreground">
          {now.toLocaleDateString("en-IN")} {now.toLocaleTimeString("en-IN")}
        </p>
      </div>

      {/* Patient */}
      <div>
        <p>
          <span className="text-muted-foreground">Patient:</span>{" "}
          {patient.patient_name}
        </p>
        {patient.mobile && (
          <p>
            <span className="text-muted-foreground">Phone:</span>{" "}
            {patient.mobile}
          </p>
        )}
      </div>

      <Separator />

      {/* Items */}
      <table className="w-full">
        <thead>
          <tr className="border-b text-xs text-muted-foreground">
            <th className="pb-1 text-left font-medium">Item</th>
            <th className="pb-1 text-center font-medium">Qty</th>
            <th className="pb-1 text-right font-medium">Rate</th>
            <th className="pb-1 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.item_code} className="border-b border-dashed">
              <td className="py-1 pr-2">{item.item_name}</td>
              <td className="py-1 text-center">{item.quantity}</td>
              <td className="py-1 text-right">{formatCurrency(item.rate)}</td>
              <td className="py-1 text-right">
                {formatCurrency(item.rate * item.quantity)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Separator />

      {/* Totals */}
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span>{formatCurrency(totals.subtotal)}</span>
        </div>
        {totals.discountAmount > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Discount</span>
            <span>-{formatCurrency(totals.discountAmount)}</span>
          </div>
        )}
        {totals.taxAmount > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tax</span>
            <span>{formatCurrency(totals.taxAmount)}</span>
          </div>
        )}
        <div className="flex justify-between text-base font-bold">
          <span>Total</span>
          <span>{formatCurrency(totals.grandTotal)}</span>
        </div>
      </div>

      <Separator />

      {/* Payments */}
      <div className="space-y-1">
        <p className="font-medium">Payment</p>
        {payments.map((p, i) => (
          <div key={i} className="flex justify-between">
            <span className="text-muted-foreground">
              {p.method}
              {p.reference ? ` (${p.reference})` : ""}
            </span>
            <span>{formatCurrency(p.amount)}</span>
          </div>
        ))}
        {change > 0 && (
          <div className="flex justify-between font-medium">
            <span>Change</span>
            <span>{formatCurrency(change)}</span>
          </div>
        )}
      </div>

      <Separator />

      <p className="text-center text-xs text-muted-foreground">
        Thank you for visiting CareVibes!
      </p>
    </div>
  );
}
