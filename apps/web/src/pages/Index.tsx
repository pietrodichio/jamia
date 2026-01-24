import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { HeroSection } from '@/components/marketing/HeroSection';
import { FeaturesSection } from '@/components/marketing/FeaturesSection';
import { EventCardGrid } from '@/components/events/EventCardGrid';
import { eventsApi } from '@/api/events.api';

/**
 * Home page (/) - Airbnb-style approach
 * Shows marketing hero section + preview of upcoming events
 * Works for both logged-in and logged-out users
 */
const Index = () => {
  const { t } = useTranslation('events');

  // Fetch upcoming published events (limited to 9 for preview)
  const { data: events, isLoading } = useQuery({
    queryKey: ['home-events'],
    queryFn: async () => {
      const now = new Date().toISOString();
      return eventsApi.getPublicEvents({ startsAt: now, limit: 9 });
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

      {/* Marketing Features Section */}
      <FeaturesSection />
    </div>
  );
};

export default Index;
