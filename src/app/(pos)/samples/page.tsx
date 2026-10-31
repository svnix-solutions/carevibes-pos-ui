"use client";

import Link from "next/link";
import { ChevronRight, TestTubes } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useClinicQueue } from "@/hooks/use-clinic-samples";

export default function SamplesPage() {
  const { data: orders, isLoading, error } = useClinicQueue();

  return (
    <ScrollArea className="h-full">
      <div className="mx-auto max-w-2xl space-y-3 p-6">
        <div>
          <h2 className="text-xl font-semibold">Pending samples</h2>
          <p className="text-sm text-muted-foreground">Bills with lab tests from the last few days, waiting for collection.</p>
        </div>

        {isLoading && [0, 1, 2].map((i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
        {error && <p className="text-sm text-destructive">{error.message}</p>}
        {orders?.length === 0 && (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-8 text-center text-muted-foreground">
            <TestTubes className="h-8 w-8" />
            <p className="text-sm">No samples waiting.</p>
          </div>
        )}

        {orders?.map((o) => {
          const expected = o.expected_tubes.reduce((n, t) => n + t.qty, 0);
          return (
            <Link key={o.invoice} href={`/orders/${encodeURIComponent(o.invoice)}`}>
              <Card className="mb-3 flex-row items-center gap-3 p-4 hover:bg-muted/50">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{o.patient_name ?? o.customer_name}</p>
                  <p className="truncate text-sm text-muted-foreground">{o.items.map((i) => i.item_name).join(", ")}</p>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-mono">{o.invoice}</span> · {o.date} · {o.collected.length}
                    {expected ? ` of ${expected}` : ""} tubes collected
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </Card>
            </Link>
          );
        })}
      </div>
    </ScrollArea>
  );
}
