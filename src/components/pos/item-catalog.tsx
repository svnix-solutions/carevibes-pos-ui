"use client";

import { forwardRef, useMemo, useState } from "react";
import { FlaskConical, Search, Stethoscope, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useItems } from "@/hooks/use-items";
import { useStockLevels } from "@/hooks/use-stock-levels";
import { useLabs } from "@/hooks/use-labs";
import { useCartStore } from "@/lib/cart/store";
import { ItemGroupSidebar } from "./item-group-tabs";
import { ItemCard } from "./item-card";

const DIAGNOSTIC_GROUPS = ["diagnostics", "radiology", "laboratory", "lab test"];

function isDiagnosticGroup(group?: string) {
  if (!group) return false;
  return DIAGNOSTIC_GROUPS.some((g) => group.toLowerCase().includes(g));
}

function isConsultationGroup(group?: string) {
  if (!group) return false;
  return group.toLowerCase() === "consultation";
}

export const ItemCatalog = forwardRef<HTMLInputElement>(
  function ItemCatalog(_props, ref) {
    const [search, setSearch] = useState("");
    const [selectedGroup, setSelectedGroup] = useState<string | undefined>();
    const [selectedSupplier, setSelectedSupplier] = useState<string | undefined>();

    const showLabFilter = isDiagnosticGroup(selectedGroup);
    const showConsultationFilter = isConsultationGroup(selectedGroup);
    const { data: labs } = useLabs();
    const selectedDoctor = useCartStore((s) => s.selectedDoctor);

    // For consultation group, auto-filter by selected doctor
    // For diagnostic groups, use the lab supplier filter
    const supplierFilter = showConsultationFilter
      ? selectedDoctor?.name
      : showLabFilter
        ? selectedSupplier
        : undefined;

    const { data: items, isLoading } = useItems(
      search,
      selectedGroup,
      supplierFilter
    );

    const stockItemCodes = useMemo(
      () =>
        (items ?? [])
          .filter((item) => item.is_stock_item === 1)
          .map((item) => item.name),
      [items]
    );

    const { data: stockMap, isFetching: stockFetching } = useStockLevels(stockItemCodes);

    // True when stock items exist but data hasn't arrived yet
    const stockPending = stockItemCodes.length > 0 && !stockMap;

    // Map supplier ID → display name from labs data
    const labNameMap = useMemo(() => {
      const map = new Map<string, string>();
      for (const lab of labs ?? []) {
        map.set(lab.name, lab.supplier_name);
      }
      return map;
    }, [labs]);

    return (
      <div className="flex h-full overflow-hidden">
        {/* Left: Category sidebar */}
        <ItemGroupSidebar
          selected={selectedGroup}
          onSelect={(group) => {
            setSelectedGroup(group);
            // Clear supplier filter when switching away from lab groups
            if (!isDiagnosticGroup(group)) setSelectedSupplier(undefined);
          }}
        />

        {/* Right: Search + item grid */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {/* Search bar */}
          <div className="flex shrink-0 items-center gap-3 px-4 pt-3 pb-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={ref}
                placeholder="Search items..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-12"
              />
              <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground lg:inline-block">
                /
              </kbd>
            </div>

            {/* Doctor filter badge for consultation group */}
            {showConsultationFilter && selectedDoctor && (
              <div className="flex shrink-0 items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-sm dark:border-blue-800 dark:bg-blue-950/30">
                <Stethoscope className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                <span className="font-medium text-blue-700 dark:text-blue-300">
                  {selectedDoctor.supplier_name}
                </span>
              </div>
            )}

            {/* Lab supplier filter */}
            {showLabFilter && (
              <div className="flex shrink-0 items-center gap-2">
                {selectedSupplier ? (
                  <div className="flex items-center gap-1.5 rounded-md border border-purple-200 bg-purple-50 px-2.5 py-1.5 text-sm dark:border-purple-800 dark:bg-purple-950/30">
                    <FlaskConical className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                    <span className="font-medium text-purple-700 dark:text-purple-300">
                      {labs?.find((l) => l.name === selectedSupplier)?.supplier_name}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 shrink-0"
                      onClick={() => setSelectedSupplier(undefined)}
                      aria-label="Clear supplier filter"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <Select
                    value=""
                    onValueChange={(v) => setSelectedSupplier(v ?? undefined)}
                  >
                    <SelectTrigger className="h-9 w-48" aria-label="Filter by lab">
                      <FlaskConical className="h-3.5 w-3.5 shrink-0" />
                      <SelectValue placeholder="All Labs" />
                    </SelectTrigger>
                    <SelectContent>
                      {labs?.map((lab) => (
                        <SelectItem key={lab.name} value={lab.name}>
                          {lab.supplier_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}
          </div>

          {/* Item grid */}
          <ScrollArea className="min-h-0 flex-1">
            <div className="p-4">
              {showConsultationFilter && !selectedDoctor ? (
                <div className="flex h-40 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Stethoscope className="h-8 w-8 text-muted-foreground/50" />
                  <p>Select a doctor in the cart to see consultations</p>
                </div>
              ) : isLoading ? (
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className="h-[100px] rounded-lg" />
                  ))}
                </div>
              ) : items?.length === 0 ? (
                <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                  No items found
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
                  {items?.map((item) => (
                    <ItemCard
                      key={item.name}
                      item={item}
                      stockQty={
                        item.is_stock_item === 1
                          ? stockPending
                            ? null
                            : stockMap?.get(item.name) ?? 0
                          : undefined
                      }
                      supplierName={
                        showLabFilter && item.custom_supplier
                          ? labNameMap.get(item.custom_supplier)
                          : undefined
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    );
  }
);
