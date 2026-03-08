"use client";

import { cn } from "@/lib/utils";
import { useItemGroups } from "@/hooks/use-item-groups";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface ItemGroupTabsProps {
  selected: string | undefined;
  onSelect: (group: string | undefined) => void;
}

export function ItemGroupTabs({ selected, onSelect }: ItemGroupTabsProps) {
  const { data: groups, isLoading } = useItemGroups();

  if (isLoading) {
    return (
      <div className="flex gap-2 px-1 py-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-full" />
        ))}
      </div>
    );
  }

  return (
    <ScrollArea className="w-full">
      <div className="flex gap-2 px-1 py-2">
        <button
          className={cn(
            "shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
            !selected
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-background hover:bg-accent"
          )}
          onClick={() => onSelect(undefined)}
        >
          All Items
        </button>
        {groups?.map((group) => (
          <button
            key={group.name}
            className={cn(
              "shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
              selected === group.name
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background hover:bg-accent"
            )}
            onClick={() => onSelect(group.name)}
          >
            {group.name}
          </button>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
