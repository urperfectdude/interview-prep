import { Check } from "lucide-react";

interface Step {
  label: string;
  description?: string;
}

interface StepIndicatorProps {
  steps: Step[];
  currentIndex: number;
}

export function StepIndicator({ steps, currentIndex }: StepIndicatorProps) {
  return (
    <ol>
      {steps.map((step, index) => {
        const isComplete = index < currentIndex;
        const isActive = index === currentIndex;
        return (
          <li
            key={step.label}
            className="relative flex gap-3 pb-8 last:pb-0"
            aria-current={isActive ? "step" : undefined}
          >
            {index < steps.length - 1 && (
              <span
                aria-hidden
                className={`absolute bottom-1 left-3 top-7 w-px -translate-x-1/2 transition-colors ${
                  isComplete ? "bg-primary" : "bg-border"
                }`}
              />
            )}
            <span
              className={`flex size-6 flex-none items-center justify-center rounded-full text-xs font-medium transition-colors ${
                isComplete
                  ? "bg-primary text-primary-foreground"
                  : isActive
                    ? "border-2 border-primary bg-background text-primary"
                    : "border bg-background text-muted-foreground"
              }`}
            >
              {isComplete ? <Check className="size-3.5" /> : index + 1}
            </span>
            <div className="pt-0.5">
              <p
                className={`text-sm leading-5 ${
                  isActive ? "font-medium" : isComplete ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {step.label}
              </p>
              {step.description && <p className="mt-0.5 text-xs text-muted-foreground">{step.description}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
