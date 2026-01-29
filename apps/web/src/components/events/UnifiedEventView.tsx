import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { ViewToggle } from '@/components/events/ViewToggle';
import { EventCardGrid } from '@/components/events/EventCardGrid';
import { CalendarView } from '@/components/events/CalendarView';
import { UnifiedSearchBar } from '@/components/search/UnifiedSearchBar';
import { UnifiedFilters } from '@/components/events/UnifiedFilters';
import { useEventFilters } from '@/hooks/useEventFilters';
import { eventsApi } from '@/api/events.api';
import type { EventType } from '@jamia/types/event';

/**
 * Skeleton loading card mimicking EventCard structure
 */
function EventCardSkeleton() {
  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      {/* Image skeleton - top 60% */}
      <Skeleton className="h-48 w-full rounded-none" />
      {/* Content area */}
      <div className="p-4 space-y-3">
        {/* Title - 2 lines */}
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        {/* Meta info - 1 line */}
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );
}

/**
 * Loading state with skeleton cards
 */
function LoadingState() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <EventCardSkeleton />
      <EventCardSkeleton />
      <EventCardSkeleton />
    </div>
  );
}

/**
 * Error state with retry button
 */
function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-96 border rounded-lg bg-destructive/10">
      <p className="text-lg text-destructive mb-4">
        Si e verificato un errore nel caricamento degli eventi.
      </p>
      <Button onClick={onRetry} variant="outline">
        <RefreshCw className="mr-2 h-4 w-4" />
        Riprova
      </Button>
    </div>
  );
}

/**
 * Unified event discovery view
 * Merges grid and calendar views into single component
 * View state managed via URL parameter (bookmarkable)
 * Filter bar shared across both views
 */
export function UnifiedEventView() {
  const { t } = useTranslation(['common', 'events']);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    filters,
    tags,
    updateFilter,
    clearFilters,
  } = useEventFilters();

  // Read view from URL, default to grid
  const view = (searchParams.get('view') || 'grid') as 'grid' | 'calendar';

  // Set view in URL
  const setView = (newView: 'grid' | 'calendar') => {
    setSearchParams(
      (params) => {
        const newParams = new URLSearchParams(params);
        newParams.set('view', newView);
        return newParams;
      },
      { replace: true }
    );
  };

  // Determine if location is set
  const hasLocation = !!filters.lat && !!filters.lng;

  // Determine if filters are active (beyond location)
  const hasActiveFilters = !!(
    filters.query ||
    (filters.types && filters.types.length > 0) ||
    filters.dateFrom ||
    filters.dateTo ||
    tags.length > 0
  );

  // Fetch events with current filters
  const { data: events, isLoading, error, refetch } = useQuery({
    queryKey: ['events', hasLocation ? 'search' : 'public', filters, tags],
    queryFn: () => {
      if (hasLocation) {
        // Use location-based search
        const searchParams: {
          lng: number;
          lat: number;
          radius: number;
          types?: EventType[];
          dateFrom?: string;
          dateTo?: string;
          keyword?: string;
          tags?: string[];
        } = {
          lng: parseFloat(filters.lng),
          lat: parseFloat(filters.lat),
          radius: parseInt(filters.radius),
        };

        // Add optional filters
        if (filters.types && filters.types.length > 0) {
          searchParams.types = filters.types as EventType[];
        }
        if (filters.dateFrom) searchParams.dateFrom = filters.dateFrom;
        if (filters.dateTo) searchParams.dateTo = filters.dateTo;
        if (filters.query) searchParams.keyword = filters.query;
        if (tags.length > 0) searchParams.tags = tags;

        return eventsApi.searchEvents(searchParams);
      } else {
        // Use public events API with filters
        const publicParams: {
          startsAt?: string;
          limit?: number;
          types?: EventType[];
          dateFrom?: string;
          dateTo?: string;
          keyword?: string;
          tags?: string[];
        } = {};

        // Set startsAt to dateFrom if provided, otherwise use current date
        publicParams.startsAt = filters.dateFrom || new Date().toISOString();
        publicParams.limit = 100; // Higher limit for public events

        // Add optional filters
        if (filters.types && filters.types.length > 0) {
          publicParams.types = filters.types as EventType[];
        }
        if (filters.dateTo) publicParams.dateTo = filters.dateTo;
        if (filters.query) publicParams.keyword = filters.query;
        if (tags.length > 0) publicParams.tags = tags;

        return eventsApi.getPublicEvents(publicParams);
      }
    },
  });

  // Empty state context for EventCardGrid
  const emptyStateContext = {
    hasLocation,
    radius: filters.radius,
    searchQuery: filters.query,
    hasActiveFilters,
    onSetLocation: () => {
      // Scroll to top where LocationSearch is located
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    onExpandRadius: () => {
      const currentRadius = parseInt(filters.radius, 10);
      const nextRadius = currentRadius < 100 ? 100 : currentRadius < 200 ? 200 : 500;
      updateFilter('radius', nextRadius.toString());
    },
    onClearFilters: clearFilters,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
      <div className="container mx-auto p-4 max-w-7xl">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-4 w-fit pl-0 hover:pl-2 transition-all"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('common:buttons.back')}
        </Button>

        <h1 className="text-2xl font-bold mb-4">{t('events:filters.searchPlaceholder')}</h1>

        {/* Filter Bar - Sticky at top */}
        <div className="sticky top-0 z-10 mb-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 -mx-4 px-4 py-3 border-b">
          {/* Main search bar row */}
          <div className="flex items-center gap-3">
            <div className="flex-1 max-w-2xl">
              <UnifiedSearchBar />
            </div>
            <ViewToggle currentView={view} onViewChange={setView} />
          </div>

          {/* Filters row - below search bar */}
          <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1">
            <UnifiedFilters />
          </div>
        </div>

        {/* Results Area */}
        <main>
          {isLoading ? (
            <LoadingState />
          ) : error ? (
            <ErrorState onRetry={() => refetch()} />
          ) : (
            <>
              {view === 'grid' ? (
                <EventCardGrid events={events || []} emptyStateContext={emptyStateContext} />
              ) : (
                <div className="border rounded-lg p-4">
                  <CalendarView
                    events={events || []}
                    onSelectEvent={(event) => {
                      window.location.href = `/events/${event.id}`;
                    }}
                  />
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
