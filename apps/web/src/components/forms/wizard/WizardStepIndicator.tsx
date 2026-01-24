import { Check } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

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
  return (
    <div className="w-full py-6">
      <div className="flex items-center justify-center gap-2 md:gap-4">
        {Array.from({ length: totalSteps }, (_, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isActive = stepNumber === currentStep;
          const isUpcoming = stepNumber > currentStep;

          return (
            <div key={stepNumber} className="contents">
              {/* Step circle and label */}
              <div className="flex flex-col items-center">
                {/* Step circle */}
                <button
                  type="button"
                  onClick={() => isCompleted && onStepClick?.(stepNumber)}
                  disabled={isUpcoming}
                  className={cn(
                    'flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors',
                    isCompleted &&
                      'bg-primary border-primary text-primary-foreground cursor-pointer hover:opacity-80',
                    isActive &&
                      'bg-primary border-primary text-primary-foreground',
                    isUpcoming && 'bg-muted border-muted-foreground/30 text-muted-foreground cursor-not-allowed'
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <span className="text-sm font-medium">{stepNumber}</span>
                  )}
                </button>

                {/* Step label - show abbreviated on mobile, full on desktop */}
                <span
                  className={cn(
                    'mt-2 text-xs md:text-sm font-medium text-center max-w-[60px] md:max-w-none truncate',
                    isActive && 'text-primary',
                    (isCompleted || isUpcoming) && 'text-muted-foreground'
                  )}
                >
                  {/* Show abbreviated label on mobile */}
                  <span className="md:hidden truncate">
                    {stepLabels[index]?.substring(0, 5) || stepNumber}
                  </span>
                  {/* Show full label on desktop */}
                  <span className="hidden md:inline">
                    {stepLabels[index] || `Step ${stepNumber}`}
                  </span>
                </span>
              </div>

              {/* Separator between steps (not after last step) */}
              {stepNumber < totalSteps && (
                <Separator
                  key={`separator-${stepNumber}`}
                  className={cn(
                    'flex-1 min-w-[20px] md:min-w-[40px] transition-colors',
                    isCompleted && 'bg-primary',
                    (isActive || isUpcoming) && 'bg-muted-foreground/30'
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
