"use client";

import { useEffect, type RefObject } from "react";

interface KeyboardShortcutHandlers {
  searchInputRef?: RefObject<HTMLInputElement | null>;
  onOpenPayment?: () => void;
}

export function useKeyboardShortcuts({
  searchInputRef,
  onOpenPayment,
}: KeyboardShortcutHandlers) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Ignore if user is typing in an input/textarea
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (e.key === "/" || e.key === "F3") {
        e.preventDefault();
        searchInputRef?.current?.focus();
      }

      if (e.key === "F2") {
        e.preventDefault();
        // Click the patient search trigger button (identified by data attribute)
        const btn = document.querySelector<HTMLButtonElement>("[data-patient-trigger]");
        btn?.click();
      }

      if (e.key === "F9" && onOpenPayment) {
        e.preventDefault();
        onOpenPayment();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [searchInputRef, onOpenPayment]);
}
