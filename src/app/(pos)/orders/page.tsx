"use client";

import Link from "next/link";
import { FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrders } from "@/hooks/use-orders";
import { formatCurrency } from "@/lib/cart/calculations";

export default function OrdersPage() {
  const { data: orders, isLoading } = useOrders();

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h2 className="mb-4 text-xl font-semibold">Today&apos;s Orders</h2>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      ) : orders?.length === 0 ? (
        <div className="flex h-40 flex-col items-center justify-center text-sm text-muted-foreground">
          <FileText className="mb-2 h-8 w-8 opacity-30" />
          <p>No orders today</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders?.map((order) => (
            <Link key={order.name} href={`/orders/${order.name}`}>
              <Card className="flex items-center justify-between p-4 transition-shadow hover:shadow-md">
                <div>
                  <p className="font-medium">{order.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {order.customer}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge
                    variant={
                      order.status === "Paid" ? "default" : "secondary"
                    }
                  >
                    {order.status}
                  </Badge>
                  <span className="font-semibold">
                    {formatCurrency(order.grand_total)}
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
