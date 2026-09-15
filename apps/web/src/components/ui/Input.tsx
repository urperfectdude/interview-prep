import { InputHTMLAttributes, forwardRef } from "react";

// Shared by Input, Textarea and Select; each adds its own height and horizontal padding.
export const fieldClass =
  "w-full min-w-0 rounded-md border border-input bg-card text-sm shadow-xs outline-none transition-[color,box-shadow,border-color] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:opacity-50";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className = "", ...props },
  ref
) {
  return <input ref={ref} className={`${fieldClass} h-9 px-3 ${className}`} {...props} />;
});
