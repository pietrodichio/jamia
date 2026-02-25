import { Check } from 'lucide-react';
import { useMemo, useRef, useEffect } from 'react';
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
  const scrollContainerRef = useRef<HTMLOListElement>(null);

  const stepper = useMemo(() => {
    const stepConfigs = Array.from({ length: totalSteps }, (_, index) => ({
      id: `step-${index + 1}`,
      label: stepLabels[index] ?? `Step ${index + 1}`,
    }));
    return defineStepper(...stepConfigs);
  }, [stepLabels, totalSteps]);

  const stepCount = stepper.steps.length;
  const clampedStep = Math.min(Math.max(currentStep, 1), stepCount || 1);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const activeStepElement = container.children[clampedStep - 1] as HTMLElement;

    if (activeStepElement) {
      activeStepElement.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [clampedStep]);

  return (
    <nav aria-label="Wizard progress" className="w-full py-4 md:py-6 px-0">
      <div className="relative rounded-2xl border bg-card/70 px-2 py-4 md:px-4 md:py-6 shadow-sm">
        <ol
          ref={scrollContainerRef}
          className="flex w-full justify-between gap-2 overflow-hidden px-1 py-2"
        >
          {stepper.steps.map((step) => {
            const stepNumber = stepper.utils.getIndex(step.id) + 1;
            const isCompleted = stepNumber < clampedStep;
            const isActive = stepNumber === clampedStep;
            const isUpcoming = stepNumber > clampedStep;

            return (
              <li key={step.id} className="flex flex-none md:flex-1 flex-col items-center text-center snap-start">
                <button
                  type="button"
                  onClick={() => isCompleted && onStepClick?.(stepNumber)}
                  disabled={!isCompleted}
                  aria-current={isActive ? 'step' : undefined}
                  className={cn(
                    'relative z-10 flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-full border bg-background transition-all duration-300',
                    isCompleted && 'border-primary bg-primary text-primary-foreground shadow-sm',
                    isActive && 'border-primary ring-2 md:ring-4 ring-primary/20 scale-105 shadow-md',
                    isUpcoming && 'border-muted-foreground/30 text-muted-foreground'
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-3 w-3 md:h-5 md:w-5" />
                  ) : (
                    <span className={cn('text-xs md:text-sm font-semibold', isActive ? 'text-primary' : 'text-muted-foreground')}>
                      {stepNumber}
                    </span>
                  )}
                </button>

                <span
                  className={cn(
                    'mt-2 md:mt-3 text-[10px] md:text-sm font-medium px-1 md:px-2 py-0.5 md:py-1 rounded-full transition-colors line-clamp-2',
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
    </nav >
  );
}
