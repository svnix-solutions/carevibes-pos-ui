"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import {
  erpnext,
  ERPNEXT_COMPANY,
  ERPNEXT_SELLING_PRICE_LIST,
} from "@/lib/erpnext/client";
import type {
  AppliedCoupon,
  CartItem,
  CouponDiscounts,
} from "@/lib/cart/types";

const APPLY_PRICING_RULE =
  "erpnext.accounts.doctype.pricing_rule.pricing_rule.apply_pricing_rule";

interface CouponDoc {
  name: string;
  coupon_code: string;
  coupon_type?: string;
  customer?: string | null;
  pricing_rule?: string;
  valid_from?: string | null;
  valid_upto?: string | null;
  maximum_use?: number;
  used?: number;
}

interface PricingRuleRow {
  child_docname?: string;
  discount_percentage?: number;
  pricing_rules?: string;
}

/** An error whose message is written to be shown to the cashier verbatim. */
export class CouponError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CouponError";
  }
}

function today(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * Resolve the code a cashier typed to a Coupon Code document.
 *
 * The document name and the code string are different values — doc "Nitin 10"
 * carries code "NITIN10" — and everything downstream in ERPNext keys off the
 * document name, so the lookup has to happen before anything else.
 */
async function lookupCoupon(code: string): Promise<CouponDoc> {
  const typed = code.trim();
  if (!typed) throw new CouponError("Enter a coupon code.");

  const matches = await erpnext.getList<CouponDoc>("Coupon Code", {
    fields: [
      "name",
      "coupon_code",
      "coupon_type",
      "customer",
      "pricing_rule",
      "valid_from",
      "valid_upto",
      "maximum_use",
      "used",
    ],
    filters: [["coupon_code", "=", typed.toUpperCase()]],
    limit: 1,
  });

  if (!matches.length) {
    throw new CouponError(`No coupon found for "${typed}".`);
  }
  return matches[0];
}

/**
 * Check the coupon is usable before pricing anything.
 *
 * ERPNext's own `validate_coupon_code` is not whitelisted, so it cannot be
 * called over the API. Worse, the pricing engine treats an expired, unknown or
 * exhausted coupon identically to one that simply matched nothing: it returns
 * no discount and no error. Checking here is what turns that silence into a
 * reason the cashier can act on.
 */
function couponUnusableReason(
  coupon: CouponDoc,
  customer: string
): string | null {
  const now = today();

  if (coupon.valid_from && now < coupon.valid_from) {
    return `${coupon.coupon_code} is not valid until ${coupon.valid_from}.`;
  }
  if (coupon.valid_upto && now > coupon.valid_upto) {
    return `${coupon.coupon_code} expired on ${coupon.valid_upto}.`;
  }
  if (coupon.maximum_use && (coupon.used ?? 0) >= coupon.maximum_use) {
    return `${coupon.coupon_code} has already been used ${coupon.used} of ${coupon.maximum_use} times.`;
  }
  // Gift Card coupons are bound to one customer.
  if (coupon.customer && coupon.customer !== customer) {
    return `${coupon.coupon_code} is reserved for a different patient.`;
  }
  return null;
}

function assertUsable(coupon: CouponDoc, customer: string) {
  const reason = couponUnusableReason(coupon, customer);
  if (reason) throw new CouponError(reason);
}

/**
 * Ask ERPNext what a coupon is worth against this exact cart.
 *
 * The discount lives on a Pricing Rule the coupon points at, scoped by item,
 * item group or brand — so what it grants depends on what is in the cart, and
 * has to be re-resolved whenever the cart changes rather than cached from when
 * the code was typed.
 */
async function fetchCouponDiscounts(
  couponName: string,
  items: CartItem[],
  customer: string
): Promise<CouponDiscounts> {
  if (!items.length) return {};
  const date = today();

  const args = {
    items: items.map((item, i) => ({
      item_code: item.item_code,
      item_name: item.item_name,
      // Required for "Apply On: Item Group" rules to match at all.
      item_group: item.item_group,
      qty: item.quantity,
      uom: item.uom,
      stock_uom: item.uom,
      conversion_factor: 1,
      stock_qty: item.quantity,
      rate: item.rate,
      price_list_rate: item.rate,
      amount: item.rate * item.quantity,
      discount_percentage: 0,
      doctype: "Sales Invoice Item",
      name: `new-${i + 1}`,
      child_docname: `new-${i + 1}`,
      parenttype: "Sales Invoice",
    })),
    customer,
    company: ERPNEXT_COMPANY,
    currency: "INR",
    conversion_rate: 1,
    price_list: ERPNEXT_SELLING_PRICE_LIST,
    price_list_currency: "INR",
    plc_conversion_rate: 1,
    doctype: "Sales Invoice",
    name: "new-sales-invoice-1",
    transaction_type: "selling",
    transaction_date: date,
    posting_date: date,
    // The Coupon Code *document name*. Passing the code string here returns
    // no discount and no error.
    coupon_code: couponName,
    ignore_pricing_rule: 0,
    is_return: 0,
    update_stock: 0,
  };

  const res = await erpnext.callMethod<{ message?: PricingRuleRow[] }>(
    APPLY_PRICING_RULE,
    { args: JSON.stringify(args) }
  );

  const byDocname = new Map(items.map((item, i) => [`new-${i + 1}`, item.item_code]));
  const discounts: CouponDiscounts = {};

  for (const row of res?.message ?? []) {
    const itemCode = row.child_docname
      ? byDocname.get(row.child_docname)
      : undefined;
    const pct = row.discount_percentage;
    if (itemCode && typeof pct === "number" && pct > 0) {
      discounts[itemCode] = pct;
    }
  }
  return discounts;
}

/** Validate a typed code and resolve what it grants against the current cart. */
export function useApplyCoupon() {
  return useMutation<
    { coupon: AppliedCoupon; discounts: CouponDiscounts },
    Error,
    { code: string; items: CartItem[]; customer: string }
  >({
    mutationFn: async ({ code, items, customer }) => {
      const doc = await lookupCoupon(code);
      assertUsable(doc, customer);

      const discounts = await fetchCouponDiscounts(doc.name, items, customer);
      if (!Object.keys(discounts).length) {
        throw new CouponError(
          `${doc.coupon_code} does not apply to anything in this cart.`
        );
      }

      return {
        coupon: {
          name: doc.name,
          code: doc.coupon_code,
          pricingRule: doc.pricing_rule,
        },
        discounts,
      };
    },
  });
}

/**
 * Keep an applied coupon's discounts in step with the cart.
 *
 * Re-resolved on every change to the item set or quantities, so a coupon
 * cannot keep paying out on a cart it no longer covers.
 */
export function useCouponDiscounts(
  coupon: AppliedCoupon | null,
  items: CartItem[],
  customer?: string
) {
  return useQuery<CouponDiscounts>({
    queryKey: [
      "coupon-discounts",
      coupon?.name,
      customer,
      items.map((i) => `${i.item_code}:${i.quantity}`).join(","),
    ],
    queryFn: () => fetchCouponDiscounts(coupon!.name, items, customer!),
    enabled: Boolean(coupon && customer && items.length),
    staleTime: 60 * 1000,
  });
}

// ---------------------------------------------------------------------------
// Browsing what is on offer
// ---------------------------------------------------------------------------

interface PricingRuleDoc {
  name: string;
  rate_or_discount?: string;
  discount_percentage?: number;
  discount_amount?: number;
  rate?: number;
  apply_on?: string;
  min_amt?: number;
  items?: Array<{ item_code?: string }>;
  item_groups?: Array<{ item_group?: string }>;
  brands?: Array<{ brand?: string }>;
}

export interface AvailableCoupon {
  /** Coupon Code document name. */
  name: string;
  /** The code a cashier would otherwise type. */
  code: string;
  /** What it takes off, e.g. "10% off". */
  offer: string;
  /** What it applies to, e.g. "Laboratory". */
  scope: string;
  /** Free-text note from the coupon itself. */
  note?: string;
  /** Uses left, or null when unlimited. */
  remainingUses: number | null;
  validUpto?: string | null;
  /** Set when the coupon names a specific customer. */
  patientSpecific: boolean;
}

/** Summarise what a Pricing Rule takes off. */
function describeOffer(rule?: PricingRuleDoc): string {
  if (!rule) return "Discount";
  if (rule.rate_or_discount === "Discount Percentage" && rule.discount_percentage) {
    return `${rule.discount_percentage}% off`;
  }
  if (rule.rate_or_discount === "Discount Amount" && rule.discount_amount) {
    return `₹${rule.discount_amount} off`;
  }
  if (rule.rate_or_discount === "Rate" && rule.rate) {
    return `Fixed rate ₹${rule.rate}`;
  }
  return "Discount";
}

/** Summarise what a Pricing Rule applies to. */
function describeScope(rule?: PricingRuleDoc): string {
  if (!rule) return "";
  switch (rule.apply_on) {
    case "Item Group":
      return (rule.item_groups ?? [])
        .map((r) => r.item_group)
        .filter(Boolean)
        .join(", ");
    case "Item Code":
      return (rule.items ?? [])
        .map((r) => r.item_code)
        .filter(Boolean)
        .join(", ");
    case "Brand":
      return (rule.brands ?? []).map((r) => r.brand).filter(Boolean).join(", ");
    case "Transaction":
      return "whole bill";
    default:
      return "";
  }
}

/**
 * Coupons this patient could actually use right now.
 *
 * Validity is filtered here rather than in the query because the rules involve
 * null dates and an unlimited-use sentinel that read awkwardly as Frappe
 * filters — and because reusing the same check the typed path uses keeps the
 * list and the apply step from ever disagreeing about what is valid.
 */
export function useAvailableCoupons(customer?: string) {
  return useQuery<AvailableCoupon[]>({
    queryKey: ["available-coupons", customer],
    enabled: Boolean(customer),
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const all = await erpnext.getList<CouponDoc & { description?: string }>(
        "Coupon Code",
        {
          fields: [
            "name",
            "coupon_code",
            "coupon_type",
            "customer",
            "pricing_rule",
            "valid_from",
            "valid_upto",
            "maximum_use",
            "used",
            "description",
          ],
          orderBy: "modified desc",
          limit: 100,
        }
      );

      const usable = all.filter(
        (c) => couponUnusableReason(c, customer!) === null
      );

      // One fetch per distinct rule — the child tables naming the covered
      // items only come back on the full document.
      const ruleNames = [
        ...new Set(usable.map((c) => c.pricing_rule).filter(Boolean)),
      ] as string[];
      const rules = new Map<string, PricingRuleDoc>();
      await Promise.all(
        ruleNames.map(async (n) => {
          try {
            rules.set(n, await erpnext.getDoc<PricingRuleDoc>("Pricing Rule", n));
          } catch {
            // A coupon whose rule cannot be read still lists, just without
            // the "10% off Laboratory" summary.
          }
        })
      );

      return usable.map((c) => {
        const rule = c.pricing_rule ? rules.get(c.pricing_rule) : undefined;
        return {
          name: c.name,
          code: c.coupon_code,
          offer: describeOffer(rule),
          scope: describeScope(rule),
          note: c.description?.replace(/<[^>]*>/g, "").trim() || undefined,
          remainingUses: c.maximum_use
            ? Math.max(0, c.maximum_use - (c.used ?? 0))
            : null,
          validUpto: c.valid_upto,
          patientSpecific: Boolean(c.customer),
        };
      });
    },
  });
}
