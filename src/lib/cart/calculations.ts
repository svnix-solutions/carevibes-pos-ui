import type {
  CartDiscount,
  CartItem,
  CartLineTotals,
  CartTotals,
  CouponDiscounts,
} from "./types";

/**
 * Ceiling on how much of a bill may be discounted, counting both levels
 * together. A cashier giving 20% on a line and 20% on the bill would otherwise
 * take 36% off that line, so the cap is applied to the combined total rather
 * than to each input on its own.
 *
 * This is a till-side guardrail, not an enforced control: the ERPNext proxy
 * forwards the cashier's own token, so anyone able to open devtools can post a
 * larger discount directly. Enforcing it properly needs a server-side
 * validation hook in ERPNext.
 */
export const MAX_DISCOUNT_PERCENT = 15;

/**
 * ERPNext books currency at 2 decimal places. Rounding at every step here
 * mirrors that, so the total the cashier collects and the total on the Sales
 * Invoice agree to the paisa rather than drifting apart on float residue.
 */
export function round2(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

/**
 * Resolve one cart line, applying only that line's own discount.
 *
 * Order of operations deliberately mirrors ERPNext: the discount reduces the
 * unit rate, and the discounted rate is then extended by qty.
 */
export function calculateLine(
  item: CartItem,
  couponPercent = 0
): CartLineTotals {
  const qty = item.quantity;
  const gross = round2(item.rate * qty);

  let manualPercent = 0;
  if (item.discountValue && item.discountValue > 0 && gross > 0) {
    if (item.discountType === "amount") {
      // Cashiers think in "₹200 off this line"; ERPNext works in
      // percent-of-price-list-rate. Normalise, capping at the line value so a
      // stale flat amount can never exceed the line after a qty change.
      manualPercent = (Math.min(item.discountValue, gross) / gross) * 100;
    } else {
      manualPercent = item.discountValue;
    }
    // Re-capped here, not just at input, so a cart persisted from before the
    // limit — or one hand-edited in localStorage — can't exceed it either.
    manualPercent = Math.min(manualPercent, MAX_DISCOUNT_PERCENT);
  }

  // A coupon was approved by whoever created it in ERPNext, so it is not
  // spending the cashier's discretionary allowance and is not capped by it.
  // The two never stack on one line — the better of the two wins, which is
  // also what stops a coupon and a manual discount compounding into a
  // discount neither party intended.
  const discountPercent = Math.max(manualPercent, couponPercent);
  const discountSource: CartLineTotals["discountSource"] =
    discountPercent <= 0
      ? null
      : couponPercent > manualPercent
        ? "coupon"
        : "manual";

  const netRate = round2(item.rate * (1 - discountPercent / 100));
  const net = round2(netRate * qty);
  const taxRate = item.taxRate ?? 0;

  return {
    item_code: item.item_code,
    gross,
    discountAmount: round2(gross - net),
    net,
    netRate,
    discountPercent,
    discountSource,
    // No cart discount applied yet — calculateTotals refines these below.
    taxable: net,
    taxRate,
    taxAmount: round2(net * (taxRate / 100)),
  };
}

/**
 * Resolve the whole cart.
 *
 * Discounts stack the way ERPNext stacks them: each line's own discount comes
 * off first to give the net total, then the cart-level discount comes off that.
 * GST is charged on the value remaining after both — which is also what keeps
 * the discount reducing taxable value rather than sitting on top of tax.
 *
 * The cart discount is spread across lines in proportion to their net value,
 * matching ERPNext's `apply_discount_on: "Net Total"`, so that per-item GST
 * rates still apply to the right share of the bill.
 */
export function calculateTotals(
  items: CartItem[],
  cartDiscount?: CartDiscount,
  couponDiscounts?: CouponDiscounts
): CartTotals {
  const base = items.map((item) =>
    calculateLine(item, couponDiscounts?.[item.item_code] ?? 0)
  );

  const subtotal = round2(base.reduce((sum, l) => sum + l.gross, 0));
  // Split by source: only what the cashier gave counts against the cap.
  const lineDiscountAmount = round2(
    base.reduce(
      (sum, l) => sum + (l.discountSource === "manual" ? l.discountAmount : 0),
      0
    )
  );
  const couponDiscountAmount = round2(
    base.reduce(
      (sum, l) => sum + (l.discountSource === "coupon" ? l.discountAmount : 0),
      0
    )
  );
  const netTotal = round2(base.reduce((sum, l) => sum + l.net, 0));

  // What the line discounts have already spent of the allowance, and what is
  // left for the bill discount to draw on.
  const maxDiscount = round2((subtotal * MAX_DISCOUNT_PERCENT) / 100);
  const cartAllowance = Math.max(0, round2(maxDiscount - lineDiscountAmount));

  let cartDiscountAmount = 0;
  if (cartDiscount && cartDiscount.value > 0 && netTotal > 0) {
    const requested =
      cartDiscount.type === "percent"
        ? round2((netTotal * Math.min(cartDiscount.value, MAX_DISCOUNT_PERCENT)) / 100)
        : round2(cartDiscount.value);
    cartDiscountAmount = round2(Math.min(requested, cartAllowance, netTotal));
  }

  const cartFactor = netTotal > 0 ? 1 - cartDiscountAmount / netTotal : 1;

  const lines = base.map((l) => {
    const taxable = round2(l.net * cartFactor);
    return { ...l, taxable, taxAmount: round2(taxable * (l.taxRate / 100)) };
  });

  const taxAmount = round2(lines.reduce((sum, l) => sum + l.taxAmount, 0));
  const grandTotal = round2(netTotal - cartDiscountAmount + taxAmount);

  const discountAmount = round2(
    lineDiscountAmount + couponDiscountAmount + cartDiscountAmount
  );

  return {
    subtotal,
    lineDiscountAmount,
    couponDiscountAmount,
    netTotal,
    cartDiscountAmount,
    maxDiscount,
    // Only discretionary discounts draw on the allowance — a coupon does not.
    discountAllowance: Math.max(
      0,
      round2(maxDiscount - lineDiscountAmount - cartDiscountAmount)
    ),
    discountAmount,
    taxAmount,
    grandTotal,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    lines,
  };
}

/**
 * Whether the tendered amount covers the bill.
 *
 * Compared at paisa precision on purpose: a raw `total - paid > 0` leaves
 * residue like 1e-10 on discounted bills, which would block checkout with the
 * exact amount entered and nothing on screen to explain why.
 */
export function isSettled(paid: number, grandTotal: number): boolean {
  return round2(grandTotal - paid) <= 0;
}

/** Outstanding amount, at paisa precision. Never negative. */
export function remainingDue(paid: number, grandTotal: number): number {
  return Math.max(0, round2(grandTotal - paid));
}

export function calculateChange(tendered: number, grandTotal: number): number {
  return Math.max(0, round2(tendered - grandTotal));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(amount);
}
