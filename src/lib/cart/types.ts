export interface CartItem {
  item_code: string;
  item_name: string;
  rate: number;
  quantity: number;
  uom: string;
  image?: string;
  item_group?: string;
}

export type PaymentMethod = "Cash" | "UPI" | "Card";

export interface PaymentLine {
  method: PaymentMethod;
  amount: number;
  reference?: string;
}

export interface CartTotals {
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  grandTotal: number;
  itemCount: number;
}
