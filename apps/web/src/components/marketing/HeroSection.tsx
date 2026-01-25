import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { User as SupabaseUser } from '@supabase/supabase-js';

/**
 * Marketing hero section for home page
 * Colorful design with gradient text and sparkles badge
 * CTAs: "Trova eventi" → /discover, "Accedi" → /auth (or "Dashboard" when logged in)
 */
export function HeroSection() {
  const navigate = useNavigate();

  // Check if user is logged in
  const currentUserQuery = useQuery<SupabaseUser | null>({
    queryKey: ['current-user'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return session?.user ?? null;
    },
    staleTime: 5 * 60 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const currentUser = currentUserQuery.data ?? null;
  const isLoggedIn = Boolean(currentUser);

  return (
    <div className="py-16 md:py-24">
      <div className="max-w-4xl mx-auto text-center space-y-8">
        {/* Sparkles badge */}
        <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-primary">
            La prima piattaforma italiana dedicata all'AcroYoga
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
          Jamia ti aiuta a scoprire jam, lezioni, workshop e conventions di AcroYoga nella tua zona.
        </p>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <Button
            className="rounded-xl text-lg h-14 px-8"
            onClick={() => navigate('/discover')}
          >
            Trova eventi
          </Button>
          {currentUserQuery.isLoading ? (
            <Button
              variant="outline"
              className="rounded-xl text-lg h-14 px-8"
              disabled
            >
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Caricamento...
            </Button>
          ) : (
            <Button
              variant="outline"
              className="rounded-xl text-lg h-14 px-8"
              onClick={() => navigate(isLoggedIn ? '/dashboard' : '/auth')}
            >
              {isLoggedIn ? 'Dashboard' : 'Accedi'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
