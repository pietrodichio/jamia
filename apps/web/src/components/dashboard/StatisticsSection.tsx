import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { eventsApi } from '@/api/events.api';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Users, Ticket, Loader2 } from 'lucide-react';
import { apiClient } from '@/api/client';

interface StatisticsSectionProps {
  userId?: string;
}

export function StatisticsSection({ userId }: StatisticsSectionProps) {
  const { t } = useTranslation('dashboard');

  // Count owned events
  const myEventsQuery = useQuery({
    queryKey: ['events', 'my-events', 'count', userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const events = await eventsApi.getMyEvents();
      return events.length;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Count co-organized events
  const coOrganizedQuery = useQuery({
    queryKey: ['events', 'co-organized', 'count', userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const events = await eventsApi.getCoOrganizedEvents();
      return events.length;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Count managed participants (across all jams owned by user)
  const participantsQuery = useQuery({
    queryKey: ['participants', 'count', userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      try {
        // Get count of participants in jams owned by user
        const response = await apiClient.get('/participants', {
          params: {
            owner_id: userId,
          },
        });
        return response.data?.length || 0;
      } catch (error) {
        console.warn('Failed to fetch participants count', error);
        return 0;
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  const totalEventsCreated = (myEventsQuery.data || 0) + (coOrganizedQuery.data || 0);
  const participantsManaged = participantsQuery.data || 0;

  // Placeholder for future enhancement
  const eventsAttended = 0;

  const isLoading = myEventsQuery.isLoading || coOrganizedQuery.isLoading || participantsQuery.isLoading;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Events Created */}
      <Card className="border-primary/10 rounded-2xl">
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="flex flex-col items-center text-center">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <div className="text-3xl font-bold mb-1">{totalEventsCreated}</div>
              <p className="text-sm text-muted-foreground">
                {t('stats.eventsCreated')}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Participants Managed */}
      <Card className="border-primary/10 rounded-2xl">
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="flex flex-col items-center text-center">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div className="text-3xl font-bold mb-1">{participantsManaged}</div>
              <p className="text-sm text-muted-foreground">
                {t('stats.participantsManaged')}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Events Attended (placeholder) */}
      <Card className="border-primary/10 rounded-2xl">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Ticket className="h-6 w-6 text-primary" />
            </div>
            <div className="text-3xl font-bold mb-1">{eventsAttended}</div>
            <p className="text-sm text-muted-foreground">
              {t('stats.eventsAttended')}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
