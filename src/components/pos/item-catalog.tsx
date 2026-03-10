"use client";

import { forwardRef, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useItems } from "@/hooks/use-items";
import { useStockLevels } from "@/hooks/use-stock-levels";
import { ItemGroupSidebar } from "./item-group-tabs";
import { ItemCard } from "./item-card";

export const ItemCatalog = forwardRef<HTMLInputElement>(
  function ItemCatalog(_props, ref) {
    const [search, setSearch] = useState("");
    const [selectedGroup, setSelectedGroup] = useState<string | undefined>();

    const { data: items, isLoading } = useItems(search, selectedGroup);

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

    return (
      <div className="flex h-full overflow-hidden">
        {/* Left: Category sidebar */}
        <ItemGroupSidebar selected={selectedGroup} onSelect={setSelectedGroup} />

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
          </div>

          {/* Item grid */}
          <ScrollArea className="min-h-0 flex-1">
            <div className="p-4">
              {isLoading ? (
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
