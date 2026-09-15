import { LoaderCircle } from "lucide-react";

export function Spinner({ className = "" }: { className?: string }) {
  return <LoaderCircle aria-hidden className={`size-4 animate-spin ${className}`} />;
}
