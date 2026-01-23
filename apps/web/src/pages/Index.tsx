import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { HeroSection } from '@/components/marketing/HeroSection';
import { EventCardGrid } from '@/components/events/EventCardGrid';
import { eventsApi } from '@/api/events.api';
import { supabase } from '@/integrations/supabase/client';

/**
 * Home page (/) - Airbnb-style approach
 * Shows marketing hero section + preview of upcoming events
 * Works for both logged-in and logged-out users
 */
const Index = () => {
  const { t } = useTranslation('events');

  // Fetch recent/upcoming events (limited to 9 for preview)
  // For now, we'll show recent events without location requirement
  // In the future, we can fetch user's saved location from profile
  const { data: events, isLoading } = useQuery({
    queryKey: ['home-events'],
    queryFn: async () => {
      // Get user session to check if logged in
      const { data: { session } } = await supabase.auth.getSession();

      // For now, fetch without location filter
      // TODO: In future, fetch user's saved location from profile if logged in
      // and use that to show nearby events

      // Return empty array for now - will be populated when we have events
      // or when we implement location-based fetching
      return [];
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
      {/* Hero Section */}
      <div className="container mx-auto px-4">
        <HeroSection />
      </div>

      {/* Events Section */}
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-bold">
              {t('home.upcomingEvents')}
            </h2>
            <Link
              to="/discover"
              className="text-primary hover:underline font-medium"
            >
              {t('home.viewAll')}
            </Link>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <p className="text-muted-foreground">{t('common:common.loading')}</p>
            </div>
          ) : (
            <EventCardGrid events={events || []} />
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;
