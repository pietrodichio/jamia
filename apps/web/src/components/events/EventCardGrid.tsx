import { EventCard } from './EventCard';
import type { Event } from '@jamia/types/event';

interface EventCardGridProps {
  events: Event[];
}

/**
 * Responsive grid layout for event cards
 * Adapts from 1 column (mobile) to 2 (tablet) to 3 columns (desktop)
 */
export function EventCardGrid({ events }: EventCardGridProps) {
  if (events.length === 0) {
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
