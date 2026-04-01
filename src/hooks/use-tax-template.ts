"use client";

import { useQuery } from "@tanstack/react-query";
import { erpnext } from "@/lib/erpnext/client";

interface ItemTaxTemplate {
  name: string;
  taxes: Array<{ tax_type: string; tax_rate: number }>;
}

export interface TaxTemplateRow {
  charge_type: string;
  account_head: string;
  rate: number;
  description: string;
}

interface TaxConfig {
  templateName: string; // Sales Taxes and Charges Template name for SO/SINV
  templateTaxRows: TaxTemplateRow[]; // Tax rows to include on SO/SINV
  itemTaxMap: Record<string, number>; // item_code → tax rate
}

export function useTaxConfig() {
  return useQuery<TaxConfig | null>({
    queryKey: ["tax-config"],
    queryFn: async () => {
      // Fetch the Sales Taxes and Charges Template (for SO/SINV creation)
      const templates = await erpnext.getList<{ name: string }>(
        "Sales Taxes and Charges Template",
        {
          fields: ["name"],
          filters: [["company", "=", "Care Vibes"]],
          limit: 1,
        }
      );

      if (!templates.length) return null;

      // Fetch the full Sales Taxes template to get the tax rows for SO/SINV
      const salesTaxTemplate = await erpnext.getDoc<{
        name: string;
        taxes: Array<{
          charge_type: string;
          account_head: string;
          rate: number;
          description: string;
        }>;
      }>("Sales Taxes and Charges Template", templates[0].name);

      const templateTaxRows: TaxTemplateRow[] = (
        salesTaxTemplate.taxes || []
      ).map((t) => ({
        charge_type: t.charge_type,
        account_head: t.account_head,
        rate: t.rate,
        description: t.description,
      }));

      // Fetch all Item Tax Templates to build name → rate map
      const itemTaxTemplates = await erpnext.getList<{ name: string }>(
        "Item Tax Template",
        {
          fields: ["name"],
          filters: [["company", "=", "Care Vibes"], ["disabled", "=", 0]],
          limit: 50,
        }
      );

      // Fetch each template's rate
      const rateMap: Record<string, number> = {};
      await Promise.all(
        itemTaxTemplates.map(async (tmpl) => {
          const doc = await erpnext.getDoc<ItemTaxTemplate>(
            "Item Tax Template",
            tmpl.name
          );
          const totalRate = (doc.taxes || []).reduce(
            (sum, row) => sum + (row.tax_rate || 0),
            0
          );
          rateMap[tmpl.name] = totalRate;
        })
      );

      // For each template, fetch which items use it via child table filter
      // Uses Frappe's syntax: [["Child Doctype", "field", "=", "value"]]
      const itemTaxMap: Record<string, number> = {};
      await Promise.all(
        Object.entries(rateMap).map(async ([tmplName, rate]) => {
          const items = await erpnext.getList<{ name: string }>("Item", {
            fields: ["name"],
            filters: [
              ["Item Tax", "item_tax_template", "=", tmplName],
              ["disabled", "=", 0],
            ],
            limit: 500,
          });
          for (const item of items) {
            itemTaxMap[item.name] = rate;
          }
        })
      );

      return {
        templateName: templates[0].name,
        templateTaxRows,
        itemTaxMap,
      };
    },
    staleTime: 30 * 60 * 1000,
  });
}

/**
 * Returns the tax rate for a given item code from the preloaded tax config.
 * No additional API calls — uses the cached itemTaxMap.
 */
export function useItemTaxRates(_itemCodes: string[]) {
  const { data: taxConfig } = useTaxConfig();

  // Just return the preloaded map — no extra queries needed
  return { data: taxConfig?.itemTaxMap ?? {} };
}
