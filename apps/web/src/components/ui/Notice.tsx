import type { ReactNode } from "react";
import { CircleAlert, CircleCheck } from "lucide-react";

interface NoticeProps {
  tone?: "error" | "success";
  className?: string;
  children: ReactNode;
}

export function Notice({ tone = "error", className = "", children }: NoticeProps) {
  const Icon = tone === "success" ? CircleCheck : CircleAlert;
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={`flex items-start gap-2 text-sm ${tone === "success" ? "text-success" : "text-destructive"} ${className}`}
    >
      <Icon className="mt-0.5 size-4 flex-none" />
      <span>{children}</span>
    </p>
  );
}
