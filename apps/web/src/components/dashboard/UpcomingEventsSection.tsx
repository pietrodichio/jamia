import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { eventsApi } from '@/api/events.api';
import { EventCard } from '@/components/events/EventCard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Plus, Loader2 } from 'lucide-react';
import type { EventWithOrganizer } from '@jamia/types/event';

interface UpcomingEventsSectionProps {
  userId?: string;
}

export function UpcomingEventsSection({ userId }: UpcomingEventsSectionProps) {
  const { t } = useTranslation('dashboard');
  const navigate = useNavigate();

  // Fetch user's owned events
  const myEventsQuery = useQuery<EventWithOrganizer[]>({
    queryKey: ['events', 'my-events', userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const events = await eventsApi.getMyEvents();
      return events as EventWithOrganizer[];
    },
    staleTime: 2 * 60 * 1000,
  });

  // Fetch co-organized events
  const coOrganizedQuery = useQuery<EventWithOrganizer[]>({
    queryKey: ['events', 'co-organized', userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const events = await eventsApi.getCoOrganizedEvents();
      return events as EventWithOrganizer[];
    },
    staleTime: 2 * 60 * 1000,
  });

  // Merge, filter, sort, and limit events
  const upcomingEvents = (() => {
    if (!myEventsQuery.data || !coOrganizedQuery.data) return [];

    const allEvents = [...myEventsQuery.data, ...coOrganizedQuery.data];
    const now = new Date();

    // Filter: only future events (starts_at > now)
    const futureEvents = allEvents.filter(event => new Date(event.starts_at) > now);

    // Sort by date (earliest first)
    const sorted = futureEvents.sort(
      (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
    );

    // Limit to 5 events
    return sorted.slice(0, 5);
  })();

  const isLoading = myEventsQuery.isLoading || coOrganizedQuery.isLoading;

  return (
    <Card className="border-primary/10 rounded-2xl">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-xl font-semibold">
          {t('sections.upcomingEvents')}
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/events?filter=mine')}
          className="text-sm font-medium"
        >
          Vedi tutti
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : upcomingEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              Non hai eventi in programma
            </p>
            <Button
              onClick={() => navigate('/events/new')}
              className="rounded-xl"
            >
              <Plus className="mr-2 h-4 w-4" />
              Crea un evento
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
