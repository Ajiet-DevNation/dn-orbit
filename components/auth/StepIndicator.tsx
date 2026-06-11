interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

export function StepIndicator({ currentStep, totalSteps }: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-3 font-mono text-xs uppercase tracking-widest text-[#888888]">
      <span>
        STEP_{currentStep}_OF_{totalSteps}
      </span>
      <div className="flex gap-1.5">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <span
            key={i}
            className={`block h-1.5 w-6 transition-all duration-300 ${
              i < currentStep ? "bg-[#22c55e]" : "bg-[#333333]"
            }`}
          />
        ))}
      </div>
    </div>
  );
}