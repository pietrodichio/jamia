import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { eventsApi } from '@/api/events.api';
import { teachersApi } from '@/api/teachers.api';
import { useEventFilters } from '@/hooks/useEventFilters';
import { useEventOccurrences } from '@/hooks/useEventOccurrences';
import { RecurrenceDisplay } from '@/components/events/RecurrenceDisplay';
import { OccurrenceEditor } from '@/components/events/OccurrenceEditor';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Calendar,
  MapPin,
  DollarSign,
  ExternalLink,
  Mail,
  User,
  Navigation,
  ArrowLeft,
  Clock
} from 'lucide-react';

export default function EventDetail() {
  const { eventId } = useParams<{ eventId: string }>();
  const { filters } = useEventFilters();
  const [editingOccurrence, setEditingOccurrence] = useState<string | null>(null);

  const { data: event, isLoading, error } = useQuery({
    queryKey: ['events', eventId],
    queryFn: () => eventsApi.getEvent(eventId!),
    enabled: !!eventId,
  });

  // Fetch teachers for this event
  const { data: teachers } = useQuery({
    queryKey: ['events', eventId, 'teachers'],
    queryFn: () => teachersApi.listTeachers(eventId!),
    enabled: !!eventId
  });

  // Generate occurrences for recurring events (next 90 days)
  const occurrences = useEventOccurrences(
    event?.recurrence_rule,
    event?.recurrence_dtstart,
    new Date(),
    new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
  );

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="flex items-center justify-center h-96">
          <div className="text-lg text-muted-foreground">Loading event...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <p className="text-lg text-destructive mb-4">Error loading event</p>
            <Link to="/calendar">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Calendar
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <p className="text-lg text-muted-foreground mb-4">Event not found</p>
            <Link to="/calendar">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Calendar
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Calculate distance if search location set
  const distance = (filters.lat && filters.lng && event.location_lat && event.location_lng)
    ? calculateDistance(
        parseFloat(filters.lat), parseFloat(filters.lng),
        event.location_lat, event.location_lng
      )
    : null;

  const eventTypeBadgeVariant: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
    jam: "default",
    class: "secondary",
    workshop: "outline",
    convention: "destructive",
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Back Navigation */}
      <div className="mb-6">
        <Link to="/calendar">
          <Button variant="ghost" className="rounded-xl">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Calendar
          </Button>
        </Link>
      </div>

      {/* Main Event Card */}
      <Card className="border-primary/10 rounded-2xl mb-6">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant={eventTypeBadgeVariant[event.type] || "default"} className="capitalize">
                  {event.type}
                </Badge>
                {distance !== null && (
                  <Badge variant="outline" className="gap-1">
                    <Navigation className="h-3 w-3" />
                    {distance.toFixed(1)} km away
                  </Badge>
                )}
              </div>
              <CardTitle className="text-3xl font-bold mb-2">{event.title}</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Date and Time */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-lg">
              <Calendar className="h-5 w-5 text-primary" />
              <div>
                <div className="font-medium">
                  {format(new Date(event.starts_at), 'EEEE, MMMM d, yyyy')}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>
                    {format(new Date(event.starts_at), 'h:mm a')} - {format(new Date(event.ends_at), 'h:mm a')}
                  </span>
                </div>
              </div>
            </div>
            {/* Recurrence Display */}
            <RecurrenceDisplay
              recurrenceRule={event.recurrence_rule}
              recurrenceDtstart={event.recurrence_dtstart}
            />
          </div>

          <Separator />

          {/* Location */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-primary mt-0.5" />
              <div className="flex-1">
                <div className="font-medium mb-2">{event.location_text}</div>
                {event.gmaps_link && (
                  <a
                    href={event.gmaps_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    View on Google Maps
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          {event.description && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">About this event</h3>
                <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {event.description}
                </p>
              </div>
            </>
          )}

          {/* Teachers & Instructors */}
          {teachers && teachers.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Teachers & Instructors</h3>
                <div className="flex flex-wrap gap-3">
                  {teachers.map(teacher => (
                    <Link
                      key={teacher.id}
                      to={`/teachers/${teacher.user_id}`}
                      className="flex items-center gap-2 border rounded-lg p-3 hover:bg-accent transition-colors"
                    >
                      <img
                        src={teacher.profiles?.photo_url || '/default-avatar.png'}
                        alt={teacher.profiles?.name || 'Teacher'}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      <div>
                        <p className="font-medium">{teacher.profiles?.name}</p>
                        {teacher.role && (
                          <p className="text-sm text-muted-foreground">{teacher.role}</p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Price */}
          {event.price && (
            <>
              <Separator />
              <div className="flex items-center gap-3">
                <DollarSign className="h-5 w-5 text-primary" />
                <div>
                  <div className="font-medium">Price</div>
                  <div className="text-muted-foreground">{event.price}</div>
                </div>
              </div>
            </>
          )}

          {/* Organizer Contact */}
          {event.organizer_contact && (
            <>
              <Separator />
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-primary" />
                <div>
                  <div className="font-medium">Contact</div>
                  <div className="text-muted-foreground">{event.organizer_contact}</div>
                </div>
              </div>
            </>
          )}

          {/* External Link */}
          {event.external_link && (
            <>
              <Separator />
              <div>
                <a
                  href={event.external_link}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button className="w-full rounded-xl">
                    Visit Event Website
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </Button>
                </a>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Upcoming Occurrences (for recurring events) */}
      {event.recurrence_rule && occurrences.length > 0 && (
        <Card className="border-primary/10 rounded-2xl mb-6">
          <CardHeader>
            <CardTitle>Upcoming Occurrences</CardTitle>
            <CardDescription>Next occurrences of this recurring event</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {occurrences.slice(0, 5).map(date => (
                <div key={date.toISOString()} className="flex items-center justify-between border rounded-lg p-3">
                  <div>
                    <div className="font-medium">
                      {format(date, 'EEEE, MMMM d, yyyy')}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {format(date, 'h:mm a')}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingOccurrence(date.toISOString())}
                  >
                    Edit
                  </Button>
                </div>
              ))}
              {occurrences.length > 5 && (
                <p className="text-sm text-muted-foreground text-center pt-2">
                  And {occurrences.length - 5} more occurrences...
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Organizer Card */}
      <Card className="border-primary/10 rounded-2xl">
        <CardHeader>
          <CardTitle>Organizer</CardTitle>
          <CardDescription>Event organized by</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-lg">{event.organizer.name}</div>
              <div className="text-sm text-muted-foreground">{event.organizer.email}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Occurrence Editor Dialog */}
      {editingOccurrence && (
        <OccurrenceEditor
          event={event}
          occurrenceDate={editingOccurrence}
          isOpen={!!editingOccurrence}
          onClose={() => setEditingOccurrence(null)}
        />
      )}
    </div>
  );
}

// Simple haversine for client-side distance (for display only, not authoritative)
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}
