import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ViewToggle } from '@/components/events/ViewToggle';
import { EventCardGrid } from '@/components/events/EventCardGrid';
import { CalendarView } from '@/components/events/CalendarView';
import { LocationSearch } from '@/components/search/LocationSearch';
import { EventFilters } from '@/components/events/EventFilters';
import { KeywordSearch } from '@/components/search/KeywordSearch';
import { TagFilter } from '@/components/events/TagFilter';
import { AmenityFilters } from '@/components/events/AmenityFilters';
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
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    filters,
    tags,
    setTags,
    accommodationOptions,
    setAccommodationOptions,
    foodOptions,
    setFoodOptions,
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

  // Fetch events with current filters
  const { data: events, isLoading, error } = useQuery({
    queryKey: ['events', 'search', filters, tags, accommodationOptions, foodOptions],
    queryFn: () => {
      // Build search params
      const searchParams: any = {
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
      if (accommodationOptions.length > 0) {
        searchParams.accommodation_options = accommodationOptions;
      }
      if (foodOptions.length > 0) searchParams.food_options = foodOptions;

      return eventsApi.searchEvents(searchParams);
    },
    enabled: !!filters.lat && !!filters.lng, // Only fetch if location is set
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
      <div className="container mx-auto p-6 max-w-7xl">
        <h1 className="text-3xl font-bold mb-6">{t('events:filters.searchPlaceholder')}</h1>

        {/* Filter Bar - Sticky at top */}
        <div className="sticky top-0 z-10 bg-background border-b pb-4 mb-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <LocationSearch />
            <KeywordSearch />
            <EventFilters />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TagFilter selectedTags={tags} onChange={setTags} />
            <AmenityFilters
              selectedAccommodation={accommodationOptions}
              selectedFood={foodOptions}
              onAccommodationChange={setAccommodationOptions}
              onFoodChange={setFoodOptions}
            />
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex justify-end mb-4">
          <ViewToggle currentView={view} onViewChange={setView} />
        </div>

        {/* Results Area */}
        <main>
          {/* Show location prompt if no location set */}
          {!filters.lat || !filters.lng ? (
            <div className="flex items-center justify-center h-96 border rounded-lg bg-muted/10">
              <div className="text-center space-y-2">
                <p className="text-lg font-medium">
                  Imposta la tua posizione per visualizzare gli eventi
                </p>
                <p className="text-sm text-muted-foreground">
                  Usa la ricerca posizione sopra per trovare eventi vicino a te
                </p>
              </div>
            </div>
          ) : isLoading ? (
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
