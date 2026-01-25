import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface WizardStepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  stepLabels: string[];
  onStepClick?: (step: number) => void;
}

export function WizardStepIndicator({
  currentStep,
  totalSteps,
  stepLabels,
  onStepClick,
}: WizardStepIndicatorProps) {
  // Calculate width percentage for the active line
  // (currentStep - 1) because steps are 1-based, divided by (totalSteps - 1) intervals
  const progressWidth = ((currentStep - 1) / (totalSteps - 1)) * 100;

  return (
    <div className="w-full py-8 px-2 md:px-0">
      <div className="relative flex items-center justify-between">
        {/* Background Line */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-[2px] bg-muted -z-10" />

        {/* Active Progress Line */}
        <div
          className="absolute left-0 top-1/2 -translate-y-1/2 h-[2px] bg-primary transition-all duration-500 ease-in-out -z-10"
          style={{ width: `${progressWidth}%` }}
        />

        {Array.from({ length: totalSteps }, (_, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isActive = stepNumber === currentStep;
          const isUpcoming = stepNumber > currentStep;

          return (
            <div
              key={stepNumber}
              className="relative flex flex-col items-center group"
            >
              {/* Step Circle */}
              <button
                type="button"
                onClick={() => isCompleted && onStepClick?.(stepNumber)}
                disabled={!isCompleted}
                className={cn(
                  'relative z-10 flex items-center justify-center w-10 h-10 rounded-full border-2 bg-background transition-all duration-300 ease-in-out',
                  isCompleted &&
                    'border-primary bg-primary text-primary-foreground hover:scale-110 cursor-pointer',
                  isActive &&
                    'border-primary ring-4 ring-primary/20 scale-110',
                  isUpcoming && 'border-muted-foreground/30 text-muted-foreground'
                )}
              >
                {isCompleted ? (
                  <Check className="w-5 h-5 animate-in zoom-in spin-in-45 duration-300" />
                ) : (
                  <span
                    className={cn(
                      'text-sm font-semibold transition-colors duration-300',
                      isActive ? 'text-primary' : 'text-muted-foreground'
                    )}
                  >
                    {stepNumber}
                  </span>
                )}
              </button>

              {/* Step Label */}
              <div
                className={cn(
                  'absolute top-14 left-1/2 -translate-x-1/2 w-max max-w-[120px] text-center transition-all duration-300',
                  isActive
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-70 group-hover:opacity-100'
                )}
              >
                <span
                  className={cn(
                    'text-xs md:text-sm font-medium block truncate px-2 py-1 rounded-md transition-colors',
                    isActive
                      ? 'text-primary font-semibold bg-primary/5'
                      : 'text-muted-foreground'
                  )}
                >
                  {stepLabels[index] ?? `Step ${stepNumber}`}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
