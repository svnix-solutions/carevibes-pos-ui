"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FileText, Search, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useOrders } from "@/hooks/use-orders";
import { InvoiceStatusBadge } from "@/components/pos/invoice-status-badge";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/cart/calculations";
import type { InvoiceStatus, ERPNextSalesInvoice } from "@/types/erpnext";

type DatePreset = "today" | "yesterday" | "week" | "month";

function getDateRange(preset: DatePreset): { from: string; to: string } {
  const now = new Date();
  const fmt = (d: Date) => d.toISOString().split("T")[0];

  switch (preset) {
    case "today":
      return { from: fmt(now), to: fmt(now) };
    case "yesterday": {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      return { from: fmt(y), to: fmt(y) };
    }
    case "week": {
      const w = new Date(now);
      w.setDate(w.getDate() - 7);
      return { from: fmt(w), to: fmt(now) };
    }
    case "month": {
      const m = new Date(now);
      m.setDate(m.getDate() - 30);
      return { from: fmt(m), to: fmt(now) };
    }
  }
}

const DATE_PRESETS: { label: string; value: DatePreset }[] = [
  { label: "Today", value: "today" },
  { label: "Yesterday", value: "yesterday" },
  { label: "This Week", value: "week" },
  { label: "This Month", value: "month" },
];

const STATUS_FILTERS: { label: string; value: InvoiceStatus | null }[] = [
  { label: "All", value: null },
  { label: "Paid", value: "Paid" },
  { label: "Partly Paid", value: "Partly Paid" },
  { label: "Unpaid", value: "Unpaid" },
  { label: "Cancelled", value: "Cancelled" },
];

const rowTint: Partial<Record<InvoiceStatus, string>> = {
  Paid: "",
  "Partly Paid": "bg-amber-50/30 dark:bg-amber-950/10",
  Unpaid: "bg-red-50/20 dark:bg-red-950/10",
  Overdue: "bg-red-50/40 dark:bg-red-950/15",
  Cancelled: "opacity-50",
};

function formatTime(creation?: string): string {
  if (!creation) return "";
  try {
    const d = new Date(creation);
    return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
  } catch {
    return "";
  }
}

function computeStats(orders: ERPNextSalesInvoice[] | undefined) {
  if (!orders || orders.length === 0) return null;
  let totalRevenue = 0;
  let paidCount = 0;
  let outstandingTotal = 0;
  let unpaidCount = 0;

  for (const o of orders) {
    totalRevenue += o.grand_total;
    if (o.status === "Paid") paidCount++;
    if (o.outstanding_amount && o.outstanding_amount > 0) {
      outstandingTotal += o.outstanding_amount;
      unpaidCount++;
    }
  }
  return { totalRevenue, paidCount, outstandingTotal, unpaidCount, total: orders.length };
}

export default function OrdersPage() {
  const [datePreset, setDatePreset] = useState<DatePreset>("today");
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | null>(null);
  const [search, setSearch] = useState("");

  const dateRange = useMemo(() => getDateRange(datePreset), [datePreset]);
  const today = useMemo(() => getDateRange("today").from, []);

  const { data: orders, isLoading } = useOrders({
    dateFrom: dateRange.from,
    dateTo: dateRange.to,
    status: statusFilter ?? undefined,
    search: search.trim() || undefined,
  });

  const stats = useMemo(() => computeStats(orders), [orders]);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="shrink-0 border-b px-6 py-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Orders</h2>
          <div className="flex items-center gap-2">
            <div className="relative w-56">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search order # or patient..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 pl-9"
              />
            </div>
            <div className="flex items-center gap-1">
              {DATE_PRESETS.map((p) => (
                <Button
                  key={p.value}
                  variant={datePreset === p.value ? "secondary" : "ghost"}
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => setDatePreset(p.value)}
                >
                  {p.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      {!isLoading && stats && (
        <div className="shrink-0 grid grid-cols-4 gap-3 border-b px-6 py-3">
          <div className="rounded-lg border bg-card p-2.5">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Revenue</p>
            <p className="text-xl font-bold tabular-nums">{formatCurrency(stats.totalRevenue)}</p>
          </div>
          <div className="rounded-lg border border-green-200 bg-green-50/50 p-2.5 dark:border-green-900 dark:bg-green-950/30">
            <p className="text-[10px] font-medium uppercase tracking-wider text-green-600 dark:text-green-400">Paid</p>
            <p className="text-xl font-bold tabular-nums text-green-700 dark:text-green-300">{stats.paidCount}</p>
          </div>
          <div className="rounded-lg border bg-card p-2.5">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Total Orders</p>
            <p className="text-xl font-bold tabular-nums">{stats.total}</p>
          </div>
          {stats.outstandingTotal > 0 ? (
            <div className="rounded-lg border border-red-200 bg-red-50/50 p-2.5 dark:border-red-900 dark:bg-red-950/30">
              <p className="text-[10px] font-medium uppercase tracking-wider text-red-600 dark:text-red-400">Outstanding</p>
              <p className="text-xl font-bold tabular-nums text-red-700 dark:text-red-300">{formatCurrency(stats.outstandingTotal)}</p>
            </div>
          ) : (
            <div className="rounded-lg border bg-card p-2.5">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Outstanding</p>
              <p className="text-xl font-bold tabular-nums text-muted-foreground">{formatCurrency(0)}</p>
            </div>
          )}
        </div>
      )}

      {/* Status filter chips */}
      <div className="shrink-0 flex items-center gap-1 border-b px-6 py-2">
        {STATUS_FILTERS.map((f) => (
          <Button
            key={f.label}
            variant={statusFilter === f.value ? "secondary" : "ghost"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setStatusFilter(f.value)}
          >
            {f.label}
          </Button>
        ))}
        {(statusFilter || search) && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground"
            onClick={() => { setStatusFilter(null); setSearch(""); }}
          >
            Clear filters
          </Button>
        )}
        {!isLoading && (
          <span className="ml-auto text-xs text-muted-foreground">
            {orders?.length ?? 0} {(orders?.length ?? 0) === 1 ? "order" : "orders"}
          </span>
        )}
      </div>

      {/* Table */}
      <ScrollArea className="min-h-0 flex-1">
        {isLoading ? (
          <div className="space-y-0 px-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 rounded-none border-b" />
            ))}
          </div>
        ) : !orders || orders.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center text-sm text-muted-foreground">
            <FileText className="mb-2 h-8 w-8 opacity-30" />
            <p>No orders found</p>
          </div>
        ) : (
          <>
            {/* Sticky column header */}
            <div className="sticky top-0 z-10 flex items-center gap-4 border-b bg-muted/50 px-6 py-2 text-xs font-medium text-muted-foreground backdrop-blur-sm">
              <span className="w-32">Invoice #</span>
              <span className="w-16 text-right">Time</span>
              <span className="flex-1">Customer</span>
              <span className="w-24">Status</span>
              <span className="w-28 text-right">Amount</span>
              <span className="w-6" />
            </div>

            {/* Rows */}
            <div className="divide-y">
              {orders.map((order) => (
                <Link key={order.name} href={`/orders/${order.name}`}>
                  <div
                    className={cn(
                      "group flex min-h-[48px] items-center gap-4 px-6 py-2.5 transition-colors hover:bg-accent/50",
                      rowTint[order.status]
                    )}
                  >
                    {/* Invoice # */}
                    <span className="w-32 font-mono text-sm font-medium tabular-nums">
                      {order.name}
                    </span>

                    {/* Time */}
                    <span className="w-16 text-right text-xs tabular-nums text-muted-foreground">
                      {formatTime(order.creation)}
                    </span>

                    {/* Customer */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {order.customer_name || order.customer}
                      </p>
                      {order.posting_date !== today && (
                        <p className="text-[11px] text-muted-foreground">{order.posting_date}</p>
                      )}
                    </div>

                    {/* Status */}
                    <div className="w-24">
                      <InvoiceStatusBadge status={order.status} />
                    </div>

                    {/* Amount */}
                    <div className="w-28 text-right">
                      <p className="text-sm font-semibold tabular-nums">
                        {formatCurrency(order.grand_total)}
                      </p>
                      {order.outstanding_amount !== undefined && order.outstanding_amount > 0 && (
                        <p className="text-[11px] tabular-nums text-destructive">
                          Due: {formatCurrency(order.outstanding_amount)}
                        </p>
                      )}
                    </div>

                    {/* Chevron */}
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </ScrollArea>
    </div>
  );
}
