"use client";

import { cn } from "@/lib/utils";
import { useItemGroups } from "@/hooks/use-item-groups";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ItemGroupTabsProps {
  selected: string | undefined;
  onSelect: (group: string | undefined) => void;
}

type CategoryColor = {
  selected: string;
  unselected: string;
  dot: string;
};

const CATEGORY_COLORS: Record<string, CategoryColor> = {
  medicines: {
    selected: "border-green-600 bg-green-50 text-green-800 dark:border-green-500 dark:bg-green-950/40 dark:text-green-300",
    unselected: "hover:bg-green-50/50 dark:hover:bg-green-950/20",
    dot: "bg-green-500",
  },
  diagnostics: {
    selected: "border-purple-600 bg-purple-50 text-purple-800 dark:border-purple-500 dark:bg-purple-950/40 dark:text-purple-300",
    unselected: "hover:bg-purple-50/50 dark:hover:bg-purple-950/20",
    dot: "bg-purple-500",
  },
  laboratory: {
    selected: "border-purple-600 bg-purple-50 text-purple-800 dark:border-purple-500 dark:bg-purple-950/40 dark:text-purple-300",
    unselected: "hover:bg-purple-50/50 dark:hover:bg-purple-950/20",
    dot: "bg-purple-500",
  },
  "lab test": {
    selected: "border-purple-600 bg-purple-50 text-purple-800 dark:border-purple-500 dark:bg-purple-950/40 dark:text-purple-300",
    unselected: "hover:bg-purple-50/50 dark:hover:bg-purple-950/20",
    dot: "bg-purple-500",
  },
  radiology: {
    selected: "border-amber-600 bg-amber-50 text-amber-800 dark:border-amber-500 dark:bg-amber-950/40 dark:text-amber-300",
    unselected: "hover:bg-amber-50/50 dark:hover:bg-amber-950/20",
    dot: "bg-amber-500",
  },
};

const DEFAULT_COLOR: CategoryColor = {
  selected: "border-primary bg-primary/5 text-primary",
  unselected: "hover:bg-accent",
  dot: "bg-primary",
};

function getCategoryColor(groupName: string): CategoryColor {
  const key = groupName.toLowerCase();
  for (const [pattern, color] of Object.entries(CATEGORY_COLORS)) {
    if (key.includes(pattern)) return color;
  }
  return DEFAULT_COLOR;
}

const HIDDEN_GROUPS = ["commission", "services", "sub assemblies", "products", "raw material"];

export function ItemGroupSidebar({ selected, onSelect }: ItemGroupTabsProps) {
  const { data: groups, isLoading } = useItemGroups();

  const visibleGroups = groups?.filter(
    (g) => !HIDDEN_GROUPS.includes(g.name.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex w-44 shrink-0 flex-col gap-1 border-r p-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex w-44 shrink-0 flex-col overflow-hidden border-r">
      <ScrollArea className="h-full">
        <div className="flex flex-col gap-0.5 p-2">
          <button
            className={cn(
              "rounded-lg border-l-2 px-3 py-2 text-left text-sm font-medium transition-colors",
              !selected
                ? "border-primary bg-primary/5 text-primary"
                : "border-transparent hover:bg-accent"
            )}
            onClick={() => onSelect(undefined)}
          >
            All Items
          </button>
          {visibleGroups?.map((group) => {
            const color = getCategoryColor(group.name);
            const isSelected = selected === group.name;
            return (
              <button
                key={group.name}
                className={cn(
                  "flex items-center gap-2 rounded-lg border-l-2 px-3 py-2 text-left text-sm font-medium transition-colors",
                  isSelected
                    ? color.selected
                    : cn("border-transparent", color.unselected)
                )}
                onClick={() => onSelect(group.name)}
              >
                <span className={cn("h-2 w-2 shrink-0 rounded-full", color.dot)} />
                {group.name}
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
