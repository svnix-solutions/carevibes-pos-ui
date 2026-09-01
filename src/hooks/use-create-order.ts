"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { erpnext, ERPNEXT_COMPANY } from "@/lib/erpnext/client";
import { calculateTotals, round2 } from "@/lib/cart/calculations";
import type {
  CartDiscount,
  CartItem,
  CartLineTotals,
  PaymentLine,
} from "@/lib/cart/types";
import type { ERPNextPatient } from "@/types/erpnext";
import type { TaxTemplateRow } from "@/hooks/use-tax-template";

interface CreateOrderInput {
  patient: ERPNextPatient;
  items: CartItem[];
  payments: PaymentLine[];
  cartDiscount?: CartDiscount | null;
  doctor?: string; // Supplier name for custom_doctor field on Sales Order
  lab?: string; // Supplier name for custom_lab field on Sales Order
  taxTemplate?: string; // Sales Taxes and Charges Template name
  taxRows?: TaxTemplateRow[]; // Tax rows from Sales Taxes template (required for API-created docs)
}

/** Totals as ERPNext computed them — the authoritative figures for the receipt. */
export interface ErpNextTotals {
  net_total: number;
  total_taxes_and_charges: number;
  discount_amount: number;
  grand_total: number;
  rounded_total?: number;
}

export interface CreateOrderResult {
  salesOrder: { name: string };
  salesInvoice: { name: string };
  erpnextTotals: ErpNextTotals | null;
  /** Set when ERPNext's grand total differs from what the cashier was shown. */
  totalMismatch: { expected: number; actual: number } | null;
}

/**
 * Build the item rows for a selling document.
 *
 * `price_list_rate` is sent explicitly to pin the discount base to the price
 * the cashier actually saw. ERPNext computes a line discount as a percentage
 * *of price_list_rate*, so if we omit it, ERPNext resolves the base from the
 * Price List instead — which need not match the catalogue rate the POS quoted,
 * and the discount silently lands on a different number than the one on screen.
 */
function toDocItems(
  items: CartItem[],
  lines: CartLineTotals[],
  salesOrder?: string
) {
  return items.map((item, i) => {
    const line = lines[i];
    return {
      item_code: item.item_code,
      item_name: item.item_name,
      qty: item.quantity,
      uom: item.uom,
      price_list_rate: item.rate,
      rate: line.netRate,
      ...(line.discountPercent > 0 && {
        discount_percentage: line.discountPercent,
        // ERPNext's item-level discount_amount is per UNIT — it is deducted
        // from price_list_rate to give rate — not per line.
        discount_amount: round2(item.rate - line.netRate),
      }),
      ...(salesOrder && { sales_order: salesOrder }),
    };
  });
}

/**
 * Document-level discount fields.
 *
 * Applied on "Net Total" rather than "Grand Total" so the discount reduces the
 * taxable value before GST is charged, instead of being taken off a
 * tax-inclusive figure. This also matches how the cart totals are computed.
 */
function toDocDiscount(cartDiscount: CartDiscount | null | undefined, amount: number) {
  if (amount <= 0) return {};
  return {
    apply_discount_on: "Net Total",
    discount_amount: amount,
    ...(cartDiscount?.type === "percent" && {
      additional_discount_percentage: cartDiscount.value,
    }),
  };
}

export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation<CreateOrderResult, Error, CreateOrderInput>({
    mutationFn: async ({
      patient,
      items,
      payments,
      cartDiscount,
      doctor,
      lab,
      taxTemplate,
      taxRows,
    }) => {
      const today = new Date().toISOString().split("T")[0];
      const totals = calculateTotals(items, cartDiscount ?? undefined);
      const discountFields = toDocDiscount(cartDiscount, totals.cartDiscountAmount);

      const taxFields = {
        ...(taxTemplate && { taxes_and_charges: taxTemplate }),
        ...(taxRows?.length && {
          taxes: taxRows.map((row) => ({
            charge_type: row.charge_type,
            account_head: row.account_head,
            rate: row.rate,
            description: row.description,
          })),
        }),
      };

      // Step 1: Create Sales Order
      const salesOrder = await erpnext.createDoc<{ name: string }>(
        "Sales Order",
        {
          customer: patient.customer,
          company: ERPNEXT_COMPANY,
          transaction_date: today,
          delivery_date: today,
          order_type: "Sales",
          ...(doctor && { custom_doctor: doctor }),
          ...(lab && { custom_lab: lab }),
          ...taxFields,
          ...discountFields,
          items: toDocItems(items, totals.lines),
        }
      );

      // Step 2: Submit Sales Order (with retry for TimestampMismatchError)
      await erpnext.submitDoc("Sales Order", salesOrder.name);

      // Step 3: Create Sales Invoice linked to Sales Order
      const salesInvoice = await erpnext.createDoc<{ name: string }>(
        "Sales Invoice",
        {
          customer: patient.customer,
          company: ERPNEXT_COMPANY,
          posting_date: today,
          is_pos: 1,
          ...taxFields,
          ...discountFields,
          items: toDocItems(items, totals.lines, salesOrder.name),
          payments: payments.map((p) => ({
            mode_of_payment: p.method,
            amount: p.amount,
          })),
        }
      );

      // Step 4: Submit Sales Invoice (with retry for TimestampMismatchError)
      await erpnext.submitDoc("Sales Invoice", salesInvoice.name);

      // Step 5: Read back what ERPNext actually booked. The POS and ERPNext
      // each compute totals, so this is the only way to know they agree — and
      // with is_pos the payment was already collected against our figure.
      let erpnextTotals: ErpNextTotals | null = null;
      let totalMismatch: CreateOrderResult["totalMismatch"] = null;
      try {
        const booked = await erpnext.getDoc<ErpNextTotals>(
          "Sales Invoice",
          salesInvoice.name
        );
        erpnextTotals = {
          net_total: booked.net_total,
          total_taxes_and_charges: booked.total_taxes_and_charges,
          discount_amount: booked.discount_amount,
          grand_total: booked.grand_total,
          rounded_total: booked.rounded_total,
        };
        if (round2(booked.grand_total) !== round2(totals.grandTotal)) {
          totalMismatch = {
            expected: round2(totals.grandTotal),
            actual: round2(booked.grand_total),
          };
        }
      } catch {
        // Read-back is diagnostic only — the sale is already committed.
      }

      return { salesOrder, salesInvoice, erpnextTotals, totalMismatch };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}
