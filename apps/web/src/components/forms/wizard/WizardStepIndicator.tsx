import { Check } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface WizardStepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  stepLabels: string[];
}

export function WizardStepIndicator({
  currentStep,
  totalSteps,
  stepLabels,
}: WizardStepIndicatorProps) {
  return (
    <div className="w-full py-6">
      <div className="flex items-center justify-between">
        {Array.from({ length: totalSteps }, (_, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isActive = stepNumber === currentStep;
          const isUpcoming = stepNumber > currentStep;

          return (
            <div key={stepNumber} className="flex items-center flex-1">
              {/* Step circle and label */}
              <div className="flex flex-col items-center">
                {/* Step circle */}
                <div
                  className={cn(
                    'flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors',
                    isCompleted &&
                      'bg-primary border-primary text-primary-foreground',
                    isActive &&
                      'bg-primary border-primary text-primary-foreground',
                    isUpcoming && 'bg-muted border-muted-foreground/30 text-muted-foreground'
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <span className="text-sm font-medium">{stepNumber}</span>
                  )}
                </div>

                {/* Step label - hidden on mobile, shown on desktop */}
                <span
                  className={cn(
                    'mt-2 text-xs md:text-sm font-medium text-center max-w-[80px] md:max-w-none',
                    isActive && 'text-primary',
                    (isCompleted || isUpcoming) && 'text-muted-foreground'
                  )}
                >
                  {/* Show only step number on mobile */}
                  <span className="md:hidden">
                    {stepNumber}
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
                  className={cn(
                    'flex-1 mx-2 transition-colors',
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
