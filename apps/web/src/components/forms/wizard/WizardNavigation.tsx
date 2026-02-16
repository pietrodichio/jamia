import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

interface WizardNavigationProps {
  currentStep: number;
  totalSteps: number;
  onBack: () => void;
  onNext: () => void;
  isSubmitting: boolean;
  canGoNext: boolean;
  onSubmitIntent?: () => void;
}

export function WizardNavigation({
  currentStep,
  totalSteps,
  onBack,
  onNext,
  isSubmitting,
  canGoNext,
  onSubmitIntent,
}: WizardNavigationProps) {
  const { t } = useTranslation('common');

  const isFirstStep = currentStep === 1;
  const isLastStep = currentStep === totalSteps;

  return (
    <div className="flex justify-between items-center gap-4 pt-6 border-t">
      {/* Back button - hidden on first step */}
      {!isFirstStep && (
        <Button type="button" variant="outline" onClick={onBack}>
          {t('buttons.back')}
        </Button>
      )}

      {/* Spacer when back button is hidden */}
      {isFirstStep && <div />}

      {/* Next or Submit button */}
      {isLastStep ? (
        <Button type="submit" onClick={onSubmitIntent} disabled={isSubmitting}>
          {isSubmitting ? t('common.loading') : 'Pubblica'}
        </Button>
      ) : (
        <Button type="button" onClick={onNext} disabled={!canGoNext}>
          {t('buttons.next')}
        </Button>
      )}
    </div>
  );
}
