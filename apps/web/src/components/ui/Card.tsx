import { HTMLAttributes } from "react";

export function Card({ className = "", children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-2xl border border-border bg-surface shadow-[0_1px_2px_rgba(20,18,31,0.04),0_8px_24px_rgba(20,18,31,0.06)] ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
