import { useQuery } from '@tanstack/react-query';
import { useEventFilters } from '@/hooks/useEventFilters';
import { eventsApi } from '@/api/events.api';
import { EventCard } from './EventCard';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, MapPin } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useEffect } from 'react';

export function EventList() {
  const { filters, tags, accommodationOptions, foodOptions } = useEventFilters();
  const { toast } = useToast();

  // Only run query if location is set
  const enabled = Boolean(filters.lat && filters.lng);

  const { data: events, isLoading, error } = useQuery({
    queryKey: ['events', 'search', filters, tags, accommodationOptions, foodOptions],
    queryFn: () => eventsApi.searchEvents({
      lng: parseFloat(filters.lng),
      lat: parseFloat(filters.lat),
      radius: parseInt(filters.radius),
      types: filters.types.length > 0 ? filters.types : undefined,
      dateFrom: filters.dateFrom || undefined,
      dateTo: filters.dateTo || undefined,
      keyword: filters.query || undefined,
      tags: tags.length > 0 ? tags : undefined,
      accommodation_options: accommodationOptions.length > 0 ? accommodationOptions : undefined,
      food_options: foodOptions.length > 0 ? foodOptions : undefined,
    }),
    enabled,
    staleTime: 30000, // Cache for 30 seconds
  });

  // Show error toast when query fails
  useEffect(() => {
    if (error) {
      toast({
        title: 'Error loading events',
        description: error instanceof Error ? error.message : 'Failed to fetch events',
        variant: 'destructive',
      });
    }
  }, [error, toast]);

  // Show message if location not set
  if (!enabled) {
    return (
      <Alert>
        <MapPin className="h-4 w-4" />
        <AlertTitle>Set your location</AlertTitle>
        <AlertDescription>
          Please set your location using the "Use My Location" button or enter coordinates manually to discover events near you.
        </AlertDescription>
      </Alert>
    );
  }

  // Show loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="border rounded-2xl p-6 space-y-3">
            <div className="flex justify-between gap-2">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
              <Skeleton className="h-6 w-20" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Failed to load events. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  // Show empty state
  if (!events || events.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>No events found</AlertTitle>
        <AlertDescription>
          No events match your search criteria. Try adjusting your filters or expanding your search radius.
        </AlertDescription>
      </Alert>
    );
  }

  // Show events list (already sorted by distance from backend)
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Found {events.length} {events.length === 1 ? 'event' : 'events'} near you
      </p>
      {events.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  );
}
