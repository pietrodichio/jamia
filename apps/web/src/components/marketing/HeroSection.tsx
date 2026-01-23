import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';

/**
 * Marketing hero section for home page
 * Colorful design with gradient text and sparkles badge
 * CTAs: "Trova eventi" → /discover, "Accedi" → /auth
 */
export function HeroSection() {
  const navigate = useNavigate();

  return (
    <div className="py-16 md:py-24">
      <div className="max-w-4xl mx-auto text-center space-y-8">
        {/* Sparkles badge */}
        <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-primary">
            Scopri e organizza eventi di AcroYoga
          </span>
        </div>

        {/* Main heading with gradient */}
        <h1 className="text-5xl md:text-7xl font-bold leading-tight">
          Trova e partecipa a{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
            eventi di AcroYoga
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Jamia ti aiuta a scoprire jam, lezioni, workshop e convegni di AcroYoga nella tua zona.
          Organizza i tuoi eventi con prenotazioni intelligenti, liste d'attesa bilanciate e notifiche automatiche.
        </p>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <Button
            className="rounded-xl text-lg h-14 px-8"
            onClick={() => navigate('/discover')}
          >
            Trova eventi
          </Button>
          <Button
            variant="outline"
            className="rounded-xl text-lg h-14 px-8"
            onClick={() => navigate('/auth')}
          >
            Accedi
          </Button>
        </div>
      </div>
    </div>
  );
}
