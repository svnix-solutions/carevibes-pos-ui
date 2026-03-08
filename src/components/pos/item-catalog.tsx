"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useItems } from "@/hooks/use-items";
import { useCartStore } from "@/lib/cart/store";
import { ItemGroupTabs } from "./item-group-tabs";
import { LabSelector, DIAGNOSTIC_GROUPS } from "./lab-selector";
import { ItemCard } from "./item-card";

export function ItemCatalog() {
  const [search, setSearch] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<string | undefined>();
  const selectedLab = useCartStore((s) => s.selectedLab);

  // Determine if lab is required for this group
  const needsLab =
    selectedGroup &&
    DIAGNOSTIC_GROUPS.some((g) =>
      selectedGroup.toLowerCase().includes(g.toLowerCase())
    );

  const supplierFilter = needsLab ? selectedLab?.name : undefined;

  const { data: items, isLoading } = useItems(
    search,
    selectedGroup,
    supplierFilter
  );

  // If diagnostic group selected but no lab, show message
  const showLabPrompt = needsLab && !selectedLab;

  return (
    <div className="flex h-full flex-col">
      {/* Search bar */}
      <div className="px-4 pt-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Item group tabs */}
      <div className="px-3">
        <ItemGroupTabs selected={selectedGroup} onSelect={setSelectedGroup} />
      </div>

      {/* Lab selector (for diagnostic groups) */}
      <div className="px-3">
        <LabSelector selectedGroup={selectedGroup} />
      </div>

      {/* Item grid */}
      <ScrollArea className="flex-1 px-4 pb-4">
        {showLabPrompt ? (
          <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
            Please select a lab to view items
          </div>
        ) : isLoading ? (
          <div className="grid grid-cols-2 gap-3 pt-3 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
        ) : items?.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
            No items found
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 pt-3 lg:grid-cols-3">
            {items?.map((item) => (
              <ItemCard
                key={item.name}
                item={item}
                supplier={supplierFilter}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
