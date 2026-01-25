import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { ViewToggle } from '@/components/events/ViewToggle';
import { EventCardGrid } from '@/components/events/EventCardGrid';
import { CalendarView } from '@/components/events/CalendarView';
import { LocationSearch } from '@/components/search/LocationSearch';
import { KeywordSearch } from '@/components/search/KeywordSearch';
import { UnifiedFilters } from '@/components/events/UnifiedFilters';
import { useEventFilters } from '@/hooks/useEventFilters';
import { eventsApi } from '@/api/events.api';
import type { EventType } from '@jamia/types/event';

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

  // Fetch events with current filters
  const { data: events, isLoading, error } = useQuery({
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
        <div className="sticky top-0 z-10 mb-4">
          <div className="flex flex-wrap items-center gap-2">
            <LocationSearch />
            <KeywordSearch />
            <UnifiedFilters />
            <ViewToggle currentView={view} onViewChange={setView} />
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex justify-end mb-4">

        </div>

        {/* Results Area */}
        <main>
          {isLoading ? (
            <div className="flex items-center justify-center h-96 border rounded-lg">
              <p className="text-lg text-muted-foreground">
                {t('common:common.loading')}
              </p>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-96 border rounded-lg bg-destructive/10">
              <p className="text-lg text-destructive">
                {t('common:common.error')}. {t('common:common.tryAgain')}
              </p>
            </div>
          ) : (
            <>
              {view === 'grid' ? (
                <EventCardGrid events={events || []} />
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
