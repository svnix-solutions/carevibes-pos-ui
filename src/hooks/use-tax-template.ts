"use client";

import { useQuery } from "@tanstack/react-query";
import { erpnext } from "@/lib/erpnext/client";

interface TaxRow {
  charge_type: string;
  account_head: string;
  rate: number;
  description?: string;
}

interface TaxTemplate {
  name: string;
  taxes: TaxRow[];
}

interface TaxInfo {
  templateName: string;
  totalRate: number; // sum of all tax row rates (e.g. 18 for 9% CGST + 9% SGST)
  taxes: TaxRow[];
}

export function useTaxTemplate() {
  return useQuery<TaxInfo | null>({
    queryKey: ["tax-template"],
    queryFn: async () => {
      // Fetch the default Sales Taxes and Charges Template for the company
      const templates = await erpnext.getList<{ name: string }>(
        "Sales Taxes and Charges Template",
        {
          fields: ["name"],
          filters: [
            ["company", "=", "Care Vibes"],
            ["is_default", "=", 1],
          ],
          limit: 1,
        }
      );

      if (!templates.length) return null;

      // Fetch the full template with tax rows
      const template = await erpnext.getDoc<TaxTemplate>(
        "Sales Taxes and Charges Template",
        templates[0].name
      );

      const totalRate = (template.taxes || []).reduce(
        (sum, row) => sum + (row.rate || 0),
        0
      );

      return {
        templateName: template.name,
        totalRate,
        taxes: template.taxes || [],
      };
    },
    staleTime: 30 * 60 * 1000, // 30 minutes — template rarely changes
  });
}
