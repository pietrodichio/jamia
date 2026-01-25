import { Check } from 'lucide-react';
import { useMemo } from 'react';
import { defineStepper } from '@stepperize/react';
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
  const stepper = useMemo(() => {
    const stepConfigs = Array.from({ length: totalSteps }, (_, index) => ({
      id: `step-${index + 1}`,
      label: stepLabels[index] ?? `Step ${index + 1}`,
    }));
    return defineStepper(...stepConfigs);
  }, [stepLabels, totalSteps]);

  const stepCount = stepper.steps.length;
  const clampedStep = Math.min(Math.max(currentStep, 1), stepCount || 1);



  return (
    <nav aria-label="Wizard progress" className="w-full py-6 px-2 md:px-0">
      <div className="relative rounded-2xl border bg-card/70 px-4 py-6 shadow-sm">


        <ol className="relative grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-4 pt-1">
          {stepper.steps.map((step) => {
            const stepNumber = stepper.utils.getIndex(step.id) + 1;
            const isCompleted = stepNumber < clampedStep;
            const isActive = stepNumber === clampedStep;
            const isUpcoming = stepNumber > clampedStep;

            return (
              <li key={step.id} className="flex flex-col items-center text-center">
                <button
                  type="button"
                  onClick={() => isCompleted && onStepClick?.(stepNumber)}
                  disabled={!isCompleted}
                  aria-current={isActive ? 'step' : undefined}
                  className={cn(
                    'relative z-10 flex h-10 w-10 items-center justify-center rounded-full border bg-background transition-all duration-300',
                    isCompleted && 'border-primary bg-primary text-primary-foreground shadow-sm',
                    isActive && 'border-primary ring-4 ring-primary/20 scale-105 shadow-md',
                    isUpcoming && 'border-muted-foreground/30 text-muted-foreground'
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <span className={cn('text-sm font-semibold', isActive ? 'text-primary' : 'text-muted-foreground')}>
                      {stepNumber}
                    </span>
                  )}
                </button>

                <span
                  className={cn(
                    'mt-3 text-xs md:text-sm font-medium px-2 py-1 rounded-full transition-colors',
                    isActive && 'text-primary bg-primary/10',
                    isCompleted && 'text-primary',
                    isUpcoming && 'text-muted-foreground'
                  )}
                >
                  {step.label ?? `Step ${stepNumber}`}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}
