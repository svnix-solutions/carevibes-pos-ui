"use client";

import { FlaskConical, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLabs } from "@/hooks/use-labs";
import { useCartStore } from "@/lib/cart/store";

const DIAGNOSTIC_GROUPS = ["Diagnostics", "Radiology", "Laboratory", "Lab Test"];

export function LabSelector() {
  const items = useCartStore((s) => s.items);
  const selectedLab = useCartStore((s) => s.selectedLab);
  const setLab = useCartStore((s) => s.setLab);
  const { data: labs, isLoading } = useLabs();

  // Show only when cart has items from diagnostic/lab groups
  const hasLabItems = items.some(
    (item) =>
      item.item_group &&
      DIAGNOSTIC_GROUPS.some((g) =>
        item.item_group!.toLowerCase().includes(g.toLowerCase())
      )
  );

  if (!hasLabItems) return null;

  if (selectedLab) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-purple-200 bg-purple-50 px-3 py-2 dark:border-purple-800 dark:bg-purple-950/30">
        <FlaskConical className="h-4 w-4 shrink-0 text-purple-600 dark:text-purple-400" />
        <span className="min-w-0 flex-1 truncate text-sm font-medium">
          {selectedLab.supplier_name}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0"
          onClick={() => setLab(null)}
          aria-label="Clear lab"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <Select
      value=""
      onValueChange={(value) => {
        const lab = labs?.find((l) => l.name === value);
        setLab(lab || null);
      }}
    >
      <SelectTrigger className="w-full" aria-label="Select Lab">
        <FlaskConical className="h-4 w-4 shrink-0" />
        <SelectValue
          placeholder={isLoading ? "Loading..." : "Select Lab"}
        />
      </SelectTrigger>
      <SelectContent>
        {labs?.map((lab) => (
          <SelectItem key={lab.name} value={lab.name}>
            {lab.supplier_name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
