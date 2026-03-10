"use client";

import { use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Printer,
  Banknote,
  CreditCard,
  Smartphone,
  Receipt,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { InvoiceStatusBadge } from "@/components/pos/invoice-status-badge";
import { useOrderDetail } from "@/hooks/use-orders";
import { formatCurrency } from "@/lib/cart/calculations";

const PAYMENT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Cash: Banknote,
  Card: CreditCard,
  UPI: Smartphone,
};

function formatDateTime(date?: string, time?: string): string {
  if (!date) return "";
  const parts = [date];
  if (time) {
    parts.push(time.slice(0, 5));
  }
  return parts.join(", ");
}

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: order, isLoading } = useOrderDetail(id);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <Skeleton className="mb-4 h-10 w-48" />
        <Skeleton className="mb-4 h-24 rounded-lg" />
        <Skeleton className="mb-4 h-64 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <Link href="/orders" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to Orders
        </Link>
        <p className="text-muted-foreground">Order not found</p>
      </div>
    );
  }

  const totalPaid = order.payments?.reduce((s, p) => s + p.amount, 0) ?? 0;
  const outstanding = order.outstanding_amount ?? order.grand_total - totalPaid;

  return (
    <ScrollArea className="h-full">
      <div className="mx-auto max-w-2xl p-6">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Link href="/orders">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="font-mono text-xl font-semibold">{order.name}</h2>
                <InvoiceStatusBadge status={order.status} />
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {formatDateTime(order.posting_date, order.posting_time)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="mr-1.5 h-4 w-4" />
              Print
            </Button>
          </div>
        </div>

        {/* Customer info */}
        <Card className="mb-4 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium">{order.customer_name || order.customer}</p>
              {order.customer_name && order.customer_name !== order.customer && (
                <p className="text-xs text-muted-foreground">{order.customer}</p>
              )}
            </div>
          </div>
        </Card>

        {/* Line items */}
        <Card className="mb-4 p-0">
          <div className="px-4 py-3">
            <h3 className="text-sm font-semibold">Line Items</h3>
          </div>
          <Separator />
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30 text-muted-foreground">
                <th className="px-4 py-2 text-left font-medium">#</th>
                <th className="px-4 py-2 text-left font-medium">Item</th>
                <th className="px-4 py-2 text-center font-medium">Qty</th>
                <th className="px-4 py-2 text-right font-medium">Rate</th>
                <th className="px-4 py-2 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {order.items?.map((item, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="px-4 py-2.5 text-muted-foreground">{i + 1}</td>
                  <td className="px-4 py-2.5">
                    <p className="font-medium">{item.item_name}</p>
                    <p className="text-xs text-muted-foreground">{item.item_code}</p>
                  </td>
                  <td className="px-4 py-2.5 text-center">{item.qty}</td>
                  <td className="px-4 py-2.5 text-right">{formatCurrency(item.rate)}</td>
                  <td className="px-4 py-2.5 text-right font-medium">
                    {formatCurrency(item.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <Separator />
          <div className="space-y-1.5 px-4 py-3">
            {order.net_total !== undefined && order.net_total !== order.grand_total && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(order.net_total)}</span>
              </div>
            )}
            {order.discount_amount !== undefined && order.discount_amount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Discount</span>
                <span className="text-green-600">-{formatCurrency(order.discount_amount)}</span>
              </div>
            )}
            {order.total_taxes_and_charges !== undefined && order.total_taxes_and_charges > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax</span>
                <span>{formatCurrency(order.total_taxes_and_charges)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between pt-1 text-base font-bold">
              <span>Grand Total</span>
              <span>{formatCurrency(order.grand_total)}</span>
            </div>
          </div>
        </Card>

        {/* Payments */}
        {order.payments && order.payments.length > 0 && (
          <Card className="mb-4 p-0">
            <div className="px-4 py-3">
              <h3 className="text-sm font-semibold">Payment</h3>
            </div>
            <Separator />
            <div className="space-y-2 px-4 py-3">
              {order.payments.map((p, i) => {
                const Icon = PAYMENT_ICONS[p.mode_of_payment] ?? Banknote;
                return (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <span className="text-sm">{p.mode_of_payment}</span>
                    </div>
                    <span className="text-sm font-medium">
                      {formatCurrency(p.amount)}
                    </span>
                  </div>
                );
              })}
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Paid</span>
                <span className="font-medium text-green-600">
                  {formatCurrency(totalPaid)}
                </span>
              </div>
              {outstanding > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Outstanding</span>
                  <span className="font-medium text-destructive">
                    {formatCurrency(outstanding)}
                  </span>
                </div>
              )}
            </div>
          </Card>
        )}
      </div>
    </ScrollArea>
  );
}
