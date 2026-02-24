import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { eventsApi } from '@/api/events.api';
import { EventCard } from '@/components/events/EventCard';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Plus, Loader2, FileText, CalendarCheck, History, Users } from 'lucide-react';
import type { Event } from '@jamia/types/event';

/**
 * Helper to determine if an event is a managed jam (has participant management).
 * Returns the jam management URL or null.
 */
function getJamManageUrl(event: Event): string | null {
  if (event.source_jam_id) {
    return `/jam/${event.source_jam_id}`;
  }
  if (event.type === 'jam' && event.manage_participants) {
    return `/jam/${event.id}`;
  }
  return null;
}

interface EventCardWithActionsProps {
  event: Event;
}

/**
 * EventCard wrapper that adds management actions for managed jam events.
 * Shows a "Gestisci" button overlay for jams with participant management.
 */
function EventCardWithActions({ event }: EventCardWithActionsProps) {
  const navigate = useNavigate();
  const jamManageUrl = getJamManageUrl(event);

  const handleManageClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (jamManageUrl) {
      navigate(jamManageUrl);
    }
  };

  return (
    <div className="relative group/card">
      <EventCard event={event} />
      {/* Management overlay for managed jams */}
      {jamManageUrl && (
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/card:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
          <Button
            onClick={handleManageClick}
            variant="secondary"
            className="rounded-xl"
          >
            <Users className="mr-2 h-4 w-4" />
            Gestisci
          </Button>
        </div>
      )}
    </div>
  );
}

interface MyEventsSectionProps {
  userId?: string;
}

/**
 * User's owned and co-organized events section
 * Displays drafts, active events, and past events with EventCard
 */
export function MyEventsSection({ userId }: MyEventsSectionProps) {
  const { t } = useTranslation('dashboard');
  const navigate = useNavigate();

  // Fetch user's owned events
  const myEventsQuery = useQuery<Event[]>({
    queryKey: ['events', 'my-events', userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      return eventsApi.getMyEvents();
    },
    staleTime: 2 * 60 * 1000,
  });

  // Fetch co-organized events
  const coOrganizedQuery = useQuery<Event[]>({
    queryKey: ['events', 'co-organized', userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      return eventsApi.getCoOrganizedEvents();
    },
    staleTime: 2 * 60 * 1000,
  });

  // Merge and deduplicate events
  const allEvents = (() => {
    const owned = myEventsQuery.data || [];
    const coOrganized = coOrganizedQuery.data || [];

    // Deduplicate by ID (in case user owns and co-organizes the same event)
    const eventMap = new Map<string, Event>();
    [...owned, ...coOrganized].forEach(event => {
      eventMap.set(event.id, event);
    });

    return Array.from(eventMap.values());
  })();

  const now = new Date();

  // Categorize events
  const draftEvents = allEvents
    .filter(event => event.status === 'draft')
    .sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime());

  const activeEvents = allEvents
    .filter(event => event.status === 'published' && new Date(event.ends_at) >= now)
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());

  const pastEvents = allEvents
    .filter(event => event.status === 'published' && new Date(event.ends_at) < now)
    .sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime());

  const isLoading = myEventsQuery.isLoading || coOrganizedQuery.isLoading;
  const hasNoEvents = draftEvents.length === 0 && activeEvents.length === 0 && pastEvents.length === 0;

  return (
    <Card className="border-primary/10 rounded-2xl">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">I miei Eventi</CardTitle>
        <CardDescription>Eventi che organizzi o co-organizzi</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : hasNoEvents ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">Nessun evento creato</p>
            <Button
              onClick={() => navigate('/create-event')}
              className="rounded-xl"
            >
              <Plus className="mr-2 h-4 w-4" />
              Crea un evento
            </Button>
          </div>
        ) : (
          <>
            {/* Draft Events */}
            {draftEvents.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <h4 className="font-medium text-muted-foreground">Bozze ({draftEvents.length})</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {draftEvents.map((event) => (
                    <EventCardWithActions key={event.id} event={event} />
                  ))}
                </div>
              </div>
            )}

            {/* Active Events */}
            {activeEvents.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <CalendarCheck className="h-5 w-5 text-muted-foreground" />
                  <h4 className="font-medium text-muted-foreground">Eventi attivi ({activeEvents.length})</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeEvents.map((event) => (
                    <EventCardWithActions key={event.id} event={event} />
                  ))}
                </div>
              </div>
            )}

            {/* Past Events */}
            {pastEvents.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <History className="h-5 w-5 text-muted-foreground" />
                  <h4 className="font-medium text-muted-foreground">Storico ({pastEvents.length})</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pastEvents.map((event) => (
                    <EventCardWithActions key={event.id} event={event} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
