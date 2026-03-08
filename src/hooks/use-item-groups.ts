"use client";

import { useQuery } from "@tanstack/react-query";
import { erpnext } from "@/lib/erpnext/client";
import type { ERPNextItemGroup } from "@/types/erpnext";

export function useItemGroups() {
  return useQuery<ERPNextItemGroup[]>({
    queryKey: ["item-groups"],
    queryFn: () =>
      erpnext.getList<ERPNextItemGroup>("Item Group", {
        fields: ["name", "parent_item_group", "is_group"],
        filters: [["is_group", "=", 0]],
        limit: 100,
        orderBy: "name asc",
      }),
    staleTime: 30 * 60 * 1000, // 30 min - groups rarely change
  });
}
