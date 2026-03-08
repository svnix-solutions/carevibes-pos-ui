"use client";

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

interface LabSelectorProps {
  selectedGroup?: string;
}

export function LabSelector({ selectedGroup }: LabSelectorProps) {
  const { data: labs, isLoading } = useLabs();
  const selectedLab = useCartStore((s) => s.selectedLab);
  const setLab = useCartStore((s) => s.setLab);

  // Only show lab selector for diagnostic/radiology groups
  const shouldShow =
    selectedGroup &&
    DIAGNOSTIC_GROUPS.some(
      (g) => selectedGroup.toLowerCase().includes(g.toLowerCase())
    );

  if (!shouldShow) return null;

  return (
    <div className="flex items-center gap-2 px-1">
      <span className="text-sm font-medium text-muted-foreground">Lab:</span>
      <Select
        value={selectedLab?.name || ""}
        onValueChange={(value) => {
          const lab = labs?.find((l) => l.name === value);
          setLab(lab || null);
        }}
      >
        <SelectTrigger className="h-8 w-60">
          <SelectValue placeholder={isLoading ? "Loading labs..." : "Select a lab"} />
        </SelectTrigger>
        <SelectContent>
          {labs?.map((lab) => (
            <SelectItem key={lab.name} value={lab.name}>
              {lab.supplier_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export { DIAGNOSTIC_GROUPS };
