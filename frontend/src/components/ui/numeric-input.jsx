import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { sanitizeIntegerInput, toPersianDigits } from "@/lib/format";

/**
 * Numeric text field that accepts Persian (۰-۹) and English (0-9) digits.
 * Stores normalized ASCII digits in onValueChange.
 */
const NumericInput = React.forwardRef(
  ({ className, value = "", onValueChange, onChange, maxLength, ...props }, ref) => {
    const displayValue = value === "" || value === null || value === undefined ? "" : toPersianDigits(value);

    const handleChange = (e) => {
      const normalized = sanitizeIntegerInput(e.target.value);
      if (maxLength != null) {
        onValueChange?.(normalized.slice(0, maxLength));
      } else {
        onValueChange?.(normalized);
      }
      onChange?.(e);
    };

    return (
      <Input
        ref={ref}
        type="text"
        inputMode="numeric"
        dir="ltr"
        className={cn("fa-num text-end", className)}
        value={displayValue}
        onChange={handleChange}
        {...props}
      />
    );
  }
);
NumericInput.displayName = "NumericInput";

export { NumericInput };
