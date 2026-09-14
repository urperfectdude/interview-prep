interface Step {
  label: string;
}

interface StepIndicatorProps {
  steps: Step[];
  currentIndex: number;
}

export function StepIndicator({ steps, currentIndex }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-2">
      {steps.map((step, index) => {
        const isComplete = index < currentIndex;
        const isActive = index === currentIndex;
        return (
          <div key={step.label} className="flex items-center">
            <div className="flex items-center gap-2">
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                  isActive || isComplete
                    ? "bg-accent text-white"
                    : "border border-border bg-surface text-muted"
                }`}
              >
                {index + 1}
              </span>
              <span className={`text-sm font-medium ${isActive ? "text-foreground" : "text-muted"}`}>
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <span className="mx-3 h-px w-10 bg-border" aria-hidden />
            )}
          </div>
        );
      })}
    </div>
  );
}
