import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

/**
 * Marketing hero section for home page
 * Displays Italian marketing content with CTA buttons
 */
export function HeroSection() {
  const { t } = useTranslation('marketing');
  const navigate = useNavigate();

  return (
    <div className="max-w-4xl mx-auto text-center py-12">
      <h1 className="text-4xl font-bold mb-6">
        {t('hero.title')}
      </h1>

      <p className="text-xl text-muted-foreground mb-8">
        {t('hero.subtitle')}
      </p>

      <div className="flex gap-4 justify-center">
        <Button
          size="lg"
          onClick={() => navigate('/discover')}
        >
          {t('hero.cta_explore')}
        </Button>

        <Button
          size="lg"
          variant="secondary"
          onClick={() => navigate('/events/new')}
        >
          {t('hero.cta_create')}
        </Button>
      </div>
    </div>
  );
}
