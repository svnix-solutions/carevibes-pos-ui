"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem, PaymentLine } from "./types";
import type { ERPNextPatient, ERPNextSupplier } from "@/types/erpnext";

interface CartState {
  patient: ERPNextPatient | null;
  items: CartItem[];
  payments: PaymentLine[];
  discount: number;
  selectedLab: ERPNextSupplier | null;
  selectedDoctor: ERPNextSupplier | null;

  setPatient: (patient: ERPNextPatient | null) => void;
  addItem: (item: Omit<CartItem, "quantity">) => void;
  updateQuantity: (itemCode: string, quantity: number) => void;
  removeItem: (itemCode: string) => void;
  addPayment: (payment: PaymentLine) => void;
  removePayment: (index: number) => void;
  clearPayments: () => void;
  setDiscount: (discount: number) => void;
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
      discount: 0,
      selectedLab: null,
      selectedDoctor: null,

      setPatient: (patient) => set({ patient }),

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

      setDiscount: (discount) => set({ discount }),

      setLab: (lab) => set({ selectedLab: lab }),

      setDoctor: (doctor) => set({ selectedDoctor: doctor }),

      clearCart: () =>
        set({
          patient: null,
          items: [],
          payments: [],
          discount: 0,
          selectedLab: null,
          selectedDoctor: null,
        }),
    }),
    {
      name: "pos-cart",
      partialize: (state) => ({
        patient: state.patient,
        items: state.items,
        selectedLab: state.selectedLab,
        selectedDoctor: state.selectedDoctor,
      }),
    }
  )
);
