import type { CartItem } from "./types";

/** Where a bill's lab samples are collected. Clinic unless chosen otherwise. */
export type CollectionChoice =
  | { mode: "clinic" }
  | {
      mode: "home";
      date?: string; // YYYY-MM-DD
      time?: string; // HH:MM
      address?: { name: string; label: string };
    };

/** Tests that need a sample drawn. Radiology doesn't. */
export function hasLabItems(items: CartItem[]): boolean {
  return items.some((i) => i.item_group === "Laboratory");
}

/** The home choice that applies to this cart, if any. */
export function homeCollectionFor(items: CartItem[], collection: CollectionChoice) {
  return collection.mode === "home" && hasLabItems(items) ? collection : null;
}

/** A home collection can't be billed without where and when to collect. */
export function collectionReady(items: CartItem[], collection: CollectionChoice): boolean {
  const home = homeCollectionFor(items, collection);
  return !home || !!(home.address && home.date && home.time);
}
