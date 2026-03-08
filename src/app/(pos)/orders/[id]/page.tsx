"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrderDetail } from "@/hooks/use-orders";
import { formatCurrency } from "@/lib/cart/calculations";

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
        <Skeleton className="mb-4 h-8 w-40" />
        <Skeleton className="h-96 rounded-lg" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <p className="text-muted-foreground">Order not found</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/orders">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h2 className="text-xl font-semibold">{order.name}</h2>
            <p className="text-sm text-muted-foreground">
              {order.posting_date}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge>{order.status}</Badge>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="mr-1 h-4 w-4" />
            Print
          </Button>
        </div>
      </div>

      <Card className="p-6">
        <div className="mb-4">
          <p className="text-sm text-muted-foreground">Customer</p>
          <p className="font-medium">{order.customer}</p>
        </div>

        <Separator className="my-4" />

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-muted-foreground">
              <th className="pb-2 text-left font-medium">Item</th>
              <th className="pb-2 text-center font-medium">Qty</th>
              <th className="pb-2 text-right font-medium">Rate</th>
              <th className="pb-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {order.items?.map((item, i) => (
              <tr key={i} className="border-b">
                <td className="py-2">{item.item_name}</td>
                <td className="py-2 text-center">{item.qty}</td>
                <td className="py-2 text-right">{formatCurrency(item.rate)}</td>
                <td className="py-2 text-right">
                  {formatCurrency(item.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <Separator className="my-4" />

        <div className="flex justify-between text-lg font-bold">
          <span>Grand Total</span>
          <span>{formatCurrency(order.grand_total)}</span>
        </div>

        {order.payments && order.payments.length > 0 && (
          <>
            <Separator className="my-4" />
            <div className="space-y-1">
              <p className="font-medium">Payments</p>
              {order.payments.map((p, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {p.mode_of_payment}
                  </span>
                  <span>{formatCurrency(p.amount)}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
