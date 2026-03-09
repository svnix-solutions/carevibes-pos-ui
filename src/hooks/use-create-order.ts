"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { erpnext } from "@/lib/erpnext/client";
import type { CartItem, PaymentLine } from "@/lib/cart/types";
import type { ERPNextPatient } from "@/types/erpnext";

interface CreateOrderInput {
  patient: ERPNextPatient;
  items: CartItem[];
  payments: PaymentLine[];
}

interface CreateOrderResult {
  salesOrder: { name: string };
  salesInvoice: { name: string };
}

export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation<CreateOrderResult, Error, CreateOrderInput>({
    mutationFn: async ({ patient, items, payments }) => {
      const today = new Date().toISOString().split("T")[0];

      // Step 1: Create Sales Order
      const salesOrder = await erpnext.createDoc<{ name: string }>(
        "Sales Order",
        {
          customer: patient.customer,
          company: "Care Vibes",
          transaction_date: today,
          delivery_date: today,
          order_type: "Sales",
          items: items.map((item) => ({
            item_code: item.item_code,
            item_name: item.item_name,
            qty: item.quantity,
            rate: item.rate,
            uom: item.uom,
          })),
        }
      );

      // Step 2: Submit Sales Order
      await erpnext.callMethod("frappe.client.submit", {
        doc: { doctype: "Sales Order", name: salesOrder.name },
      });

      // Step 3: Create Sales Invoice linked to Sales Order
      const salesInvoice = await erpnext.createDoc<{ name: string }>(
        "Sales Invoice",
        {
          customer: patient.customer,
          company: "Care Vibes",
          posting_date: today,
          is_pos: 1,
          items: items.map((item) => ({
            item_code: item.item_code,
            item_name: item.item_name,
            qty: item.quantity,
            rate: item.rate,
            uom: item.uom,
            sales_order: salesOrder.name,
          })),
          payments: payments.map((p) => ({
            mode_of_payment: p.method,
            amount: p.amount,
          })),
        }
      );

      // Step 4: Submit Sales Invoice
      await erpnext.callMethod("frappe.client.submit", {
        doc: { doctype: "Sales Invoice", name: salesInvoice.name },
      });

      return { salesOrder, salesInvoice };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}
