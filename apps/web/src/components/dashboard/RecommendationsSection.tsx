import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { profilesApi } from '@/api/profiles.api';
import { eventsApi } from '@/api/events.api';
import { EventCard } from '@/components/events/EventCard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Loader2 } from 'lucide-react';
import type { Event } from '@jamia/types/event';

interface RecommendationsSectionProps {
  userId?: string;
}

export function RecommendationsSection({ userId }: RecommendationsSectionProps) {
  const { t } = useTranslation('dashboard');
  const navigate = useNavigate();

  // Fetch user profile to get location
  const profileQuery = useQuery({
    queryKey: ['profile', userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      if (!userId) return null;
      return profilesApi.getProfile(userId);
    },
    staleTime: 5 * 60 * 1000,
  });

  const profile = profileQuery.data;
  const hasLocation = profile?.lat && profile?.lng;

  // Fetch nearby events if user has location
  const recommendationsQuery = useQuery<(Event & { distance_meters: number })[]>({
    queryKey: ['events', 'recommendations', userId, profile?.lat, profile?.lng],
    enabled: Boolean(hasLocation && userId),
    queryFn: async () => {
      if (!profile?.lat || !profile?.lng) return [];

      const events = await eventsApi.searchEvents({
        lat: profile.lat,
        lng: profile.lng,
        radius: 50, // 50 km radius
      });

      // Filter out user's own events
      const filtered = events.filter(event => event.owner_id !== userId);

      // Limit to 5 recommendations
      return filtered.slice(0, 5);
    },
    staleTime: 5 * 60 * 1000,
  });

  const isLoading = profileQuery.isLoading || recommendationsQuery.isLoading;
  const recommendations = recommendationsQuery.data || [];

  return (
    <Card className="border-primary/10 rounded-2xl">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">
          {t('sections.recommendations')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !hasLocation ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-2">
              Imposta la tua posizione per vedere eventi vicini
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Personalizza i tuoi consigli in base alla tua posizione
            </p>
            <Button
              onClick={() => navigate('/profile')}
              variant="outline"
              className="rounded-xl"
            >
              Vai al Profilo
            </Button>
          </div>
        ) : recommendations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Nessun evento nelle vicinanze al momento
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recommendations.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
