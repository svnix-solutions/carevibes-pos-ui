/** How a discount was expressed: a percentage, or a flat rupee amount.
 *  ERPNext stores percent-of-base, so "amount" is normalised at calc time. */
export type DiscountType = "percent" | "amount";

/** A cart-level (whole-bill) discount, applied after per-line discounts. */
export interface CartDiscount {
  type: DiscountType;
  value: number;
}

export interface CartItem {
  item_code: string;
  item_name: string;
  /** Undiscounted unit price. Maps to ERPNext's price_list_rate. */
  rate: number;
  quantity: number;
  uom: string;
  image?: string;
  item_group?: string;
  taxRate?: number; // per-item GST rate from Item Tax Template
  discountType?: DiscountType;
  /** Percent (0-100) or a flat amount off the whole line, per discountType. */
  discountValue?: number;
}

export type PaymentMethod = "Cash" | "UPI" | "Card";

export interface PaymentLine {
  method: PaymentMethod;
  amount: number;
  reference?: string;
}

/** Resolved money for a single cart line, at the precision ERPNext books at. */
export interface CartLineTotals {
  item_code: string;
  /** rate x qty, before any discount. */
  gross: number;
  /** The line's own discount only — excludes any share of the cart discount. */
  discountAmount: number;
  /** gross - discountAmount. */
  net: number;
  /** Effective unit rate after the line discount — ERPNext's `rate`. */
  netRate: number;
  /** Line discount normalised to a percent, for ERPNext discount_percentage. */
  discountPercent: number;
  /** net, less this line's proportional share of the cart-level discount. */
  taxable: number;
  taxRate: number;
  taxAmount: number;
}

export interface CartTotals {
  /** Gross of all lines, before any discount. */
  subtotal: number;
  /** Sum of the per-line discounts. */
  lineDiscountAmount: number;
  /** subtotal - lineDiscountAmount. ERPNext's net_total. */
  netTotal: number;
  /** Whole-bill discount, applied to netTotal. */
  cartDiscountAmount: number;
  /** Everything the patient saved: line discounts + cart discount. */
  discountAmount: number;
  /** Rupee ceiling on total discount for this cart (MAX_DISCOUNT_PERCENT). */
  maxDiscount: number;
  /** Rupees of discount still available under that ceiling. */
  discountAllowance: number;
  taxAmount: number;
  grandTotal: number;
  itemCount: number;
  lines: CartLineTotals[];
}
