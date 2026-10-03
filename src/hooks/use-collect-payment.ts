"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { erpnext } from "@/lib/erpnext/client";
import { clinicToday } from "@/lib/date";
import type { ERPNextSalesInvoice } from "@/types/erpnext";

interface CollectPaymentInput {
  invoice: ERPNextSalesInvoice;
  modeOfPayment: string;
  amount: number;
  reference?: string;
}

/**
 * Settle (all or part of) a pay-later invoice with a Payment Entry. When the
 * invoice becomes fully paid, ERPNext's "Doctor Margin on Payment" script
 * books the doctor's margin; a "Doctor Cash" payment is also recorded against
 * the doctor.
 */
export function useCollectPayment() {
  const queryClient = useQueryClient();

  return useMutation<{ name: string }, Error, CollectPaymentInput>({
    mutationFn: async ({ invoice, modeOfPayment, amount, reference }) => {
      const { message } = await erpnext.callMethod<{ message: { account: string } }>(
        "erpnext.accounts.doctype.sales_invoice.sales_invoice.get_bank_cash_account",
        { mode_of_payment: modeOfPayment, company: invoice.company }
      );
      const today = clinicToday();
      const pe = await erpnext.createDoc<{ name: string }>("Payment Entry", {
        payment_type: "Receive",
        company: invoice.company,
        posting_date: today,
        mode_of_payment: modeOfPayment,
        party_type: "Customer",
        party: invoice.customer,
        paid_from: invoice.debit_to,
        paid_to: message.account,
        paid_amount: amount,
        received_amount: amount,
        source_exchange_rate: 1,
        target_exchange_rate: 1,
        // Required for bank-type modes; the invoice number keeps it traceable.
        reference_no: reference || invoice.name,
        reference_date: today,
        references: [
          {
            reference_doctype: "Sales Invoice",
            reference_name: invoice.name,
            allocated_amount: amount,
          },
        ],
      });
      await erpnext.submitDoc("Payment Entry", pe.name);
      return pe;
    },
    onSuccess: (_pe, { invoice }) => {
      queryClient.invalidateQueries({ queryKey: ["order", invoice.name] });
      queryClient.invalidateQueries({ queryKey: ["invoice-payments", invoice.name] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}
