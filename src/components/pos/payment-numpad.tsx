"use client";

import { Delete } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PaymentNumpadProps {
  value: string;
  onChange: (value: string) => void;
}

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
    <div className="grid grid-cols-3 gap-2">
      {keys.map((key) => (
        <Button
          key={key}
          variant="outline"
          className="h-12 text-lg font-medium"
          onClick={() => handleKey(key)}
        >
          {key === "backspace" ? <Delete className="h-5 w-5" /> : key}
        </Button>
      ))}
    </div>
  );
}
