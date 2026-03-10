"use client";

import { Delete } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PaymentNumpadProps {
  value: string;
  onChange: (value: string) => void;
}

const QUICK_AMOUNTS = [100, 200, 500, 1000, 2000];

export function PaymentNumpad({ value, onChange }: PaymentNumpadProps) {
  function handleKey(key: string) {
    if (key === "backspace") {
      onChange(value.slice(0, -1));
    } else if (key === "clear") {
      onChange("");
    } else if (key === ".") {
      if (!value.includes(".")) {
        onChange(value + ".");
      }
    } else {
      // Limit to 2 decimal places
      const parts = value.split(".");
      if (parts[1] && parts[1].length >= 2) return;
      onChange(value + key);
    }
  }

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "backspace"];

  return (
    <div className="space-y-3">
      {/* Quick amount buttons */}
      <div className="flex flex-wrap gap-1.5">
        {QUICK_AMOUNTS.map((amt) => (
          <Button
            key={amt}
            variant="secondary"
            size="sm"
            className="h-8 px-3 text-xs font-medium"
            onClick={() => onChange(String(amt))}
          >
            {amt.toLocaleString("en-IN")}
          </Button>
        ))}
      </div>

      {/* Numpad */}
      <div className="grid grid-cols-3 gap-2">
        {keys.map((key) => (
          <Button
            key={key}
            variant="outline"
            className="h-14 text-lg font-semibold transition-transform active:scale-95"
            onClick={() => handleKey(key)}
          >
            {key === "backspace" ? <Delete className="h-5 w-5" /> : key}
          </Button>
        ))}
      </div>
    </div>
  );
}
