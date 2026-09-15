import { AudioLines } from "lucide-react";

export function Logo() {
  return (
    <span className="flex items-center gap-2 font-semibold tracking-tight">
      <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <AudioLines className="size-4" />
      </span>
      InterviewPrep
    </span>
  );
}
