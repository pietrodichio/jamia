import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import type { Event } from '@jamia/types/event';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales: { 'en-US': enUS }
});

interface CalendarViewProps {
  events: (Event & { distance_meters?: number })[];
  onSelectEvent?: (event: Event) => void;
}

export function CalendarView({ events, onSelectEvent }: CalendarViewProps) {
  const calendarEvents = events.map(event => ({
    id: event.id,
    title: event.title,
    start: new Date(event.starts_at),
    end: new Date(event.ends_at),
    resource: event, // Full event data
  }));

  return (
    <div style={{ height: 600 }}>
      <Calendar
        localizer={localizer}
        events={calendarEvents}
        startAccessor="start"
        endAccessor="end"
        style={{ height: '100%' }}
        views={['month', 'week', 'day']}
        onSelectEvent={(calEvent) => {
          if (onSelectEvent) {
            onSelectEvent(calEvent.resource as Event);
          }
        }}
      />
    </div>
  );
}
