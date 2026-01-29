import { MapPin, Search, FilterX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EventCard } from './EventCard';
import type { Event } from '@jamia/types/event';

interface EmptyStateContext {
  hasLocation: boolean;
  radius?: string;
  searchQuery?: string;
  hasActiveFilters?: boolean;
  onSetLocation?: () => void;
  onExpandRadius?: () => void;
  onClearFilters?: () => void;
}

interface EventCardGridProps {
  events: Event[];
  emptyStateContext?: EmptyStateContext;
}

/**
 * Determines next radius to suggest based on current radius
 */
function getNextRadius(currentRadius: string): string {
  const current = parseInt(currentRadius, 10);
  if (current < 100) return '100';
  if (current < 200) return '200';
  return '500';
}

/**
 * Empty state when no location is set
 */
function NoLocationState({ onSetLocation }: { onSetLocation?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold mb-2">Imposta la tua posizione</h3>
      <p className="text-muted-foreground mb-6 max-w-md">
        Per trovare eventi vicino a te, imposta la tua posizione o cerca una citta.
      </p>
      {onSetLocation && (
        <Button onClick={onSetLocation}>Rileva posizione</Button>
      )}
      <p className="text-sm text-muted-foreground mt-4">
        oppure cerca una citta specifica
      </p>
    </div>
  );
}

/**
 * Empty state when location is set but no results found
 */
function NoResultsInAreaState({
  radius,
  onExpandRadius,
}: {
  radius?: string;
  onExpandRadius?: () => void;
}) {
  const currentRadius = radius || '50';
  const nextRadius = getNextRadius(currentRadius);

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <Search className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold mb-2">Nessun evento in questa zona</h3>
      <p className="text-muted-foreground mb-6 max-w-md">
        Non ci sono eventi entro {currentRadius} km. Prova ad espandere il raggio di ricerca.
      </p>
      {onExpandRadius && (
        <Button onClick={onExpandRadius}>Espandi a {nextRadius} km</Button>
      )}
      <p className="text-sm text-muted-foreground mt-4">
        oppure prova un'altra citta
      </p>
    </div>
  );
}

/**
 * Empty state when filters are applied but no results found
 */
function NoResultsWithFiltersState({
  onClearFilters,
}: {
  onClearFilters?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <FilterX className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold mb-2">Nessun evento con questi filtri</h3>
      <p className="text-muted-foreground mb-6 max-w-md">
        Prova a rimuovere alcuni filtri per vedere piu risultati.
      </p>
      {onClearFilters && (
        <Button onClick={onClearFilters}>Rimuovi filtri</Button>
      )}
    </div>
  );
}

/**
 * Responsive grid layout for event cards
 * Adapts from 1 column (mobile) to 2 (tablet) to 3 columns (desktop)
 * Provides context-aware empty states with actionable guidance
 */
export function EventCardGrid({ events, emptyStateContext }: EventCardGridProps) {
  if (events.length === 0) {
    // Determine which empty state to show based on context
    if (emptyStateContext) {
      const { hasLocation, hasActiveFilters, radius, onSetLocation, onExpandRadius, onClearFilters } = emptyStateContext;

      // No location set - prompt user to set location
      if (!hasLocation) {
        return <NoLocationState onSetLocation={onSetLocation} />;
      }

      // Location set, filters active, no results - suggest clearing filters
      if (hasActiveFilters) {
        return <NoResultsWithFiltersState onClearFilters={onClearFilters} />;
      }

      // Location set, no filters, no results - suggest expanding radius
      return <NoResultsInAreaState radius={radius} onExpandRadius={onExpandRadius} />;
    }

    // Fallback for when no context is provided
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <p className="text-lg">Nessun evento trovato</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr">
      {events.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  );
}
