"use client";

import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { erpnext, ERPNEXT_COMPANY } from "@/lib/erpnext/client";
import { calculateLine } from "@/lib/cart/calculations";
import { clinicToday } from "@/lib/date";
import type { CartItem, CouponDiscounts } from "@/lib/cart/types";

export interface TaxTemplateRow {
  charge_type: string;
  account_head: string;
  rate: number;
  description: string;
}

/** One row of an Item's or Item Group's "Taxes" table (child DocType "Item Tax"). */
interface ItemTaxRow {
  parent: string;
  item_tax_template: string;
  tax_category?: string | null;
  valid_from?: string | null;
  minimum_net_rate?: number | null;
  maximum_net_rate?: number | null;
}

export interface TaxConfig {
  templateName: string; // Sales Taxes and Charges Template name for SO/SINV
  templateTaxRows: TaxTemplateRow[]; // Tax rows to include on SO/SINV
  /** Item Tax Template → tax account → rate that overrides the sales template's. */
  templateRates: Record<string, Record<string, number>>;
  /** item_code → Taxes rows set on the Item itself. */
  itemTaxRows: Record<string, ItemTaxRow[]>;
  /** item_group → Taxes rows set on the Item Group. */
  groupTaxRows: Record<string, ItemTaxRow[]>;
  /** item_group → its parent group, for inheriting a group's tax template. */
  groupParents: Record<string, string>;
}

export interface ItemTax {
  /** Item Tax Template that applies, or undefined for the sales template's rate. */
  template?: string;
  /** Effective GST percent on the line's taxable value. */
  rate: number;
}

function groupBy(rows: ItemTaxRow[]): Record<string, ItemTaxRow[]> {
  const map: Record<string, ItemTaxRow[]> = {};
  for (const row of rows) (map[row.parent] ??= []).push(row);
  return map;
}

export function useTaxConfig() {
  return useQuery<TaxConfig | null>({
    queryKey: ["tax-config"],
    queryFn: async () => {
      // The company's default Sales Taxes and Charges Template. Ordered so a
      // template marked default always wins over whichever happens to sort
      // first — otherwise the POS can bill on an arbitrary template.
      const templates = await erpnext.getList<{ name: string }>(
        "Sales Taxes and Charges Template",
        {
          fields: ["name"],
          filters: [
            ["company", "=", ERPNEXT_COMPANY],
            ["disabled", "=", 0],
          ],
          orderBy: "is_default desc, name asc",
          limit: 1,
        }
      );

      if (!templates.length) return null;

      const salesTaxTemplate = await erpnext.getDoc<{
        name: string;
        taxes: TaxTemplateRow[];
      }>("Sales Taxes and Charges Template", templates[0].name);

      const templateTaxRows: TaxTemplateRow[] = (
        salesTaxTemplate.taxes || []
      ).map((t) => ({
        charge_type: t.charge_type,
        account_head: t.account_head,
        rate: t.rate,
        description: t.description,
      }));

      const [itemTaxTemplates, templateDetails, itemRows, groupRows, groups] =
        await Promise.all([
          erpnext.getList<{ name: string }>("Item Tax Template", {
            fields: ["name"],
            filters: [
              ["company", "=", ERPNEXT_COMPANY],
              ["disabled", "=", 0],
            ],
            limit: 0,
          }),
          erpnext.getList<{ parent: string; tax_type: string; tax_rate: number }>(
            "Item Tax Template Detail",
            {
              parent: "Item Tax Template",
              fields: ["parent", "tax_type", "tax_rate"],
              limit: 0,
            }
          ),
          erpnext.getList<ItemTaxRow>("Item Tax", {
            parent: "Item",
            fields: [
              "parent",
              "item_tax_template",
              "tax_category",
              "valid_from",
              "minimum_net_rate",
              "maximum_net_rate",
            ],
            limit: 0,
          }),
          erpnext.getList<ItemTaxRow>("Item Tax", {
            parent: "Item Group",
            fields: [
              "parent",
              "item_tax_template",
              "tax_category",
              "valid_from",
              "minimum_net_rate",
              "maximum_net_rate",
            ],
            limit: 0,
          }),
          erpnext.getList<{ name: string; parent_item_group?: string }>(
            "Item Group",
            { fields: ["name", "parent_item_group"], limit: 0 }
          ),
        ]);

      // Rates per account, for this company's enabled templates only — a row
      // pointing at another company's template is ignored, as ERPNext does.
      const templateRates: TaxConfig["templateRates"] = {};
      for (const t of itemTaxTemplates) templateRates[t.name] = {};
      for (const d of templateDetails) {
        const rates = templateRates[d.parent];
        if (rates) rates[d.tax_type] = d.tax_rate || 0;
      }
      const ours = (r: ItemTaxRow) => r.item_tax_template in templateRates;

      const groupParents: Record<string, string> = {};
      for (const g of groups) {
        if (g.parent_item_group) groupParents[g.name] = g.parent_item_group;
      }

      return {
        templateName: salesTaxTemplate.name,
        templateTaxRows,
        templateRates,
        itemTaxRows: groupBy(itemRows.filter(ours)),
        groupTaxRows: groupBy(groupRows.filter(ours)),
        groupParents,
      };
    },
    staleTime: 30 * 60 * 1000,
  });
}

/**
 * Pick the template from one Taxes table the way ERPNext's
 * `_get_item_tax_template` does: rows with a validity (start date or net-rate
 * band) that currently hold take precedence, latest start first; otherwise the
 * open-ended rows. POS documents carry no tax category, so only rows without
 * one can match.
 */
function pickTemplate(
  rows: ItemTaxRow[],
  netRate: number,
  today: string
): string | undefined {
  const withValidity: ItemTaxRow[] = [];
  const withoutValidity: ItemTaxRow[] = [];
  for (const row of rows) {
    if (row.valid_from || row.maximum_net_rate) {
      const started = !row.valid_from || row.valid_from <= today;
      const inBand =
        !row.maximum_net_rate ||
        ((row.minimum_net_rate ?? 0) <= netRate && netRate <= row.maximum_net_rate);
      if (started && inBand) withValidity.push(row);
    } else {
      withoutValidity.push(row);
    }
  }
  const candidates = withValidity.length
    ? withValidity.sort((a, b) =>
        (b.valid_from ?? "").localeCompare(a.valid_from ?? "")
      )
    : withoutValidity;
  return candidates.find((r) => !r.tax_category)?.item_tax_template;
}

/**
 * Resolve an item's tax exactly as ERPNext will when the invoice is saved.
 *
 * The Item's own Taxes table wins; failing that, its Item Group's, walking up
 * through parent groups. An item that resolves to no template is NOT tax-free:
 * ERPNext charges it every rate on the sales template. An Item Tax Template
 * overrides the rate only for the accounts it lists — so a 0% "GST Exempt"
 * template must list every GST account on the sales template.
 */
export function resolveItemTax(
  config: TaxConfig | null | undefined,
  item: { item_code: string; item_group?: string },
  netRate: number,
  today: string = clinicToday()
): ItemTax {
  if (!config) return { rate: 0 };

  let template = pickTemplate(config.itemTaxRows[item.item_code] ?? [], netRate, today);
  const seen = new Set<string>();
  let group = item.item_group;
  while (!template && group && !seen.has(group)) {
    seen.add(group);
    template = pickTemplate(config.groupTaxRows[group] ?? [], netRate, today);
    group = config.groupParents[group];
  }

  const overrides = template ? config.templateRates[template] ?? {} : {};
  // Only "On Net Total" rows are a percentage of the line; the POS does not
  // model flat or compound charges.
  const rate = config.templateTaxRows
    .filter((row) => row.charge_type === "On Net Total")
    .reduce(
      (sum, row) =>
        sum + (row.account_head in overrides ? overrides[row.account_head] : row.rate),
      0
    );

  return { template, rate };
}

/**
 * Stamp each cart line with its current tax. Always resolved fresh from the
 * tax config, never from what the persisted cart remembers, so a fix to an
 * item's tax setup in ERPNext reaches carts that were already open.
 *
 * `ready` is false until the config has loaded (or failed), so the till can
 * refuse to bill on a tax figure it hasn't actually worked out.
 */
export function useCartTax() {
  const { data: config, isSuccess, isError, error } = useTaxConfig();

  const applyTax = useCallback(
    (items: CartItem[], couponDiscounts?: CouponDiscounts): CartItem[] => {
      const today = clinicToday();
      return items.map((item) => {
        // Net-rate bands are judged on the discounted rate, as ERPNext does.
        const { netRate } = calculateLine(
          { ...item, taxRate: 0 },
          couponDiscounts?.[item.item_code] ?? 0
        );
        const { template, rate } = resolveItemTax(config, item, netRate, today);
        return { ...item, taxRate: rate, itemTaxTemplate: template };
      });
    },
    [config]
  );

  return { config, applyTax, ready: isSuccess, isError, error };
}
