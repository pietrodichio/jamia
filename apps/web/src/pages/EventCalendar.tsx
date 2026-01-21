import { useQuery } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { useEventFilters } from '@/hooks/useEventFilters';
import { eventsApi } from '@/api/events.api';
import { CalendarView } from '@/components/events/CalendarView';
import { LocationSearch } from '@/components/search/LocationSearch';
import { KeywordSearch } from '@/components/search/KeywordSearch';
import { EventFilters } from '@/components/events/EventFilters';
import { Button } from '@/components/ui/button';

export default function EventCalendar() {
  const navigate = useNavigate();
  const { filters } = useEventFilters();

  const { data: events, isLoading, error } = useQuery({
    queryKey: ['events', 'search', filters],
    queryFn: () => eventsApi.searchEvents({
      lng: parseFloat(filters.lng),
      lat: parseFloat(filters.lat),
      radius: parseInt(filters.radius),
      types: filters.types,
      dateFrom: filters.dateFrom || undefined,
      dateTo: filters.dateTo || undefined,
      keyword: filters.query || undefined,
    }),
    enabled: !!filters.lat && !!filters.lng,
  });

  // Show location prompt if no location set
  if (!filters.lat || !filters.lng) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Event Calendar</h1>

        {/* View toggle */}
        <div className="flex gap-2 mb-6">
          <Link to="/discover">
            <Button variant="outline">List View</Button>
          </Link>
          <Button variant="default">Calendar View</Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <aside className="lg:col-span-1 space-y-4">
            <LocationSearch />
            <KeywordSearch />
            <EventFilters />
          </aside>
          <main className="lg:col-span-3">
            <div className="flex items-center justify-center h-96 border rounded-lg bg-muted/10">
              <div className="text-center space-y-2">
                <p className="text-lg font-medium">Set your location to view calendar</p>
                <p className="text-sm text-muted-foreground">
                  Use the location search on the left to find events near you
                </p>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Event Calendar</h1>

      {/* View toggle */}
      <div className="flex gap-2 mb-6">
        <Link to="/discover">
          <Button variant="outline">List View</Button>
        </Link>
        <Button variant="default">Calendar View</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <aside className="lg:col-span-1 space-y-4">
          <LocationSearch />
          <KeywordSearch />
          <EventFilters />
        </aside>
        <main className="lg:col-span-3">
          {isLoading && (
            <div className="flex items-center justify-center h-96 border rounded-lg">
              <p className="text-lg text-muted-foreground">Loading events...</p>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center h-96 border rounded-lg bg-destructive/10">
              <p className="text-lg text-destructive">Error loading events. Please try again.</p>
            </div>
          )}

          {!isLoading && !error && (
            <div className="border rounded-lg p-4">
              <CalendarView
                events={events || []}
                onSelectEvent={(event) => navigate(`/events/${event.id}`)}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
