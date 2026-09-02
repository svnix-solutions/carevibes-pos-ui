"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { MAX_DISCOUNT_PERCENT } from "./calculations";
import type {
  AppliedCoupon,
  CartDiscount,
  CartItem,
  DiscountType,
  PaymentLine,
} from "./types";
import type { ERPNextPatient, ERPNextSupplier } from "@/types/erpnext";

/** Return the item with any discount removed. */
function withoutDiscount(item: CartItem): CartItem {
  const next = { ...item };
  delete next.discountType;
  delete next.discountValue;
  return next;
}

interface CartState {
  patient: ERPNextPatient | null;
  items: CartItem[];
  payments: PaymentLine[];
  cartDiscount: CartDiscount | null;
  appliedCoupon: AppliedCoupon | null;
  selectedLab: ERPNextSupplier | null;
  selectedDoctor: ERPNextSupplier | null;

  setPatient: (patient: ERPNextPatient | null) => void;
  addItem: (item: Omit<CartItem, "quantity">) => void;
  updateQuantity: (itemCode: string, quantity: number) => void;
  removeItem: (itemCode: string) => void;
  addPayment: (payment: PaymentLine) => void;
  removePayment: (index: number) => void;
  clearPayments: () => void;
  setItemDiscount: (
    itemCode: string,
    discountType: DiscountType,
    discountValue: number
  ) => void;
  clearItemDiscount: (itemCode: string) => void;
  setCartDiscount: (discountType: DiscountType, discountValue: number) => void;
  clearCartDiscount: () => void;
  setCoupon: (coupon: AppliedCoupon | null) => void;
  setLab: (lab: ERPNextSupplier | null) => void;
  setDoctor: (doctor: ERPNextSupplier | null) => void;
  clearCart: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      patient: null,
      items: [],
      payments: [],
      cartDiscount: null,
      appliedCoupon: null,
      selectedLab: null,
      selectedDoctor: null,

      // A coupon is priced against a specific patient, so changing the patient
      // invalidates it rather than silently carrying it to the next person.
      setPatient: (patient) =>
        set((state) => ({
          patient,
          appliedCoupon:
            state.patient?.customer === patient?.customer
              ? state.appliedCoupon
              : null,
        })),

      addItem: (item) =>
        set((state) => {
          const existing = state.items.find(
            (i) => i.item_code === item.item_code
          );
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.item_code === item.item_code
                  ? { ...i, quantity: i.quantity + 1 }
                  : i
              ),
            };
          }
          return { items: [...state.items, { ...item, quantity: 1 }] };
        }),

      updateQuantity: (itemCode, quantity) =>
        set((state) => ({
          items:
            quantity <= 0
              ? state.items.filter((i) => i.item_code !== itemCode)
              : state.items.map((i) =>
                  i.item_code === itemCode ? { ...i, quantity } : i
                ),
        })),

      removeItem: (itemCode) =>
        set((state) => ({
          items: state.items.filter((i) => i.item_code !== itemCode),
        })),

      addPayment: (payment) =>
        set((state) => ({ payments: [...state.payments, payment] })),

      removePayment: (index) =>
        set((state) => ({
          payments: state.payments.filter((_, i) => i !== index),
        })),

      clearPayments: () => set({ payments: [] }),

      // Clamped on the way in: a percent can't exceed 100, and a flat amount
      // can't exceed the line. calculateLine re-caps flat amounts as well,
      // since a later qty change can shrink the line under a stored amount.
      setItemDiscount: (itemCode, discountType, discountValue) =>
        set((state) => ({
          items: state.items.map((i) => {
            if (i.item_code !== itemCode) return i;
            if (!Number.isFinite(discountValue) || discountValue <= 0) {
              return withoutDiscount(i);
            }
            const max =
              discountType === "percent"
                ? MAX_DISCOUNT_PERCENT
                : (i.rate * i.quantity * MAX_DISCOUNT_PERCENT) / 100;
            return {
              ...i,
              discountType,
              discountValue: Math.min(discountValue, max),
            };
          }),
        })),

      clearItemDiscount: (itemCode) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.item_code === itemCode ? withoutDiscount(i) : i
          ),
        })),

      setCartDiscount: (discountType, discountValue) =>
        set(() => {
          if (!Number.isFinite(discountValue) || discountValue <= 0) {
            return { cartDiscount: null };
          }
          return {
            cartDiscount: {
              type: discountType,
              // Flat amounts are capped in calculateTotals, which is the only
              // place that knows the cart total the ceiling is measured against.
              value:
                discountType === "percent"
                  ? Math.min(discountValue, MAX_DISCOUNT_PERCENT)
                  : discountValue,
            },
          };
        }),

      clearCartDiscount: () => set({ cartDiscount: null }),

      setCoupon: (coupon) => set({ appliedCoupon: coupon }),

      setLab: (lab) => set({ selectedLab: lab }),

      setDoctor: (doctor) => set({ selectedDoctor: doctor }),

      clearCart: () =>
        set({
          patient: null,
          items: [],
          payments: [],
          cartDiscount: null,
          appliedCoupon: null,
          selectedLab: null,
          selectedDoctor: null,
        }),
    }),
    {
      name: "pos-cart",
      // Discounts are persisted alongside the cart they belong to — line
      // discounts ride on `items`, and the cart discount explicitly. Without
      // this a refresh would silently drop them while keeping the items.
      partialize: (state) => ({
        patient: state.patient,
        items: state.items,
        cartDiscount: state.cartDiscount,
        appliedCoupon: state.appliedCoupon,
        selectedLab: state.selectedLab,
        selectedDoctor: state.selectedDoctor,
      }),
    }
  )
);
