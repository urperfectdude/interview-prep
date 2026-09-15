import { HTMLAttributes } from "react";

type Variant = "default" | "secondary" | "outline" | "success" | "destructive";

const variantClasses: Record<Variant, string> = {
  default: "border-transparent bg-primary/10 text-primary",
  secondary: "border-transparent bg-secondary text-secondary-foreground",
  outline: "text-muted-foreground",
  success: "border-transparent bg-success/10 text-success",
  destructive: "border-transparent bg-destructive/10 text-destructive",
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: Variant;
}

export function Badge({ variant = "default", className = "", ...props }: BadgeProps) {
  return (
    <span
      className={`inline-flex w-fit items-center gap-1 whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium [&_svg]:size-3 ${variantClasses[variant]} ${className}`}
      {...props}
    />
  );
}
