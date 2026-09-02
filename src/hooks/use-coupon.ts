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
function assertUsable(coupon: CouponDoc, customer: string) {
  const now = today();

  if (coupon.valid_from && now < coupon.valid_from) {
    throw new CouponError(
      `${coupon.coupon_code} is not valid until ${coupon.valid_from}.`
    );
  }
  if (coupon.valid_upto && now > coupon.valid_upto) {
    throw new CouponError(
      `${coupon.coupon_code} expired on ${coupon.valid_upto}.`
    );
  }
  if (coupon.maximum_use && (coupon.used ?? 0) >= coupon.maximum_use) {
    throw new CouponError(
      `${coupon.coupon_code} has already been used ${coupon.used} of ${coupon.maximum_use} times.`
    );
  }
  // Gift Card coupons are bound to one customer.
  if (coupon.customer && coupon.customer !== customer) {
    throw new CouponError(
      `${coupon.coupon_code} is reserved for a different patient.`
    );
  }
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
