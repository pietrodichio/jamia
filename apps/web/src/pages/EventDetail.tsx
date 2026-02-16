import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { it } from 'date-fns/locale/it';
import { eventsApi } from '@/api/events.api';
import { teachersApi } from '@/api/teachers.api';
import { profilesApi } from '@/api/profiles.api';
import { eventOrganizersApi } from '@/api/event-organizers.api';
import { supabase } from '@/integrations/supabase/client';
import { useEventOccurrences } from '@/hooks/useEventOccurrences';
import { EventHero } from '@/components/events/EventHero';
import { EventActions } from '@/components/events/EventActions';
import { EventAdminActions } from '@/components/events/EventAdminActions';
import { EventOrganizerInfo } from '@/components/events/EventOrganizerInfo';
import { TeachersList } from '@/components/events/TeachersList';
import { RecurrenceDisplay } from '@/components/events/RecurrenceDisplay';
import { OccurrenceEditor } from '@/components/events/OccurrenceEditor';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EVENT_TAG_LABELS, type EVENT_TAG_OPTIONS } from '@/lib/event-tags';
import { sanitizeHtml } from '@/lib/sanitize';
import { MapPin, DollarSign, ArrowLeft, Clock, Tag } from 'lucide-react';
import type { Profile } from '@/api/profiles.api';

export default function EventDetail() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation(['events', 'common']);
  const [editingOccurrence, setEditingOccurrence] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Get current user
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    getCurrentUser();
  }, []);

  const { data: event, isLoading, error } = useQuery({
    queryKey: ['events', eventId],
    queryFn: async () => {
      if (!eventId) throw new Error('No event ID');
      return eventsApi.getEvent(eventId);
    },
    enabled: !!eventId,
  });

  // Fetch teachers for this event
  const { data: teachers } = useQuery({
    queryKey: ['events', eventId, 'teachers'],
    queryFn: async () => {
      if (!eventId) throw new Error('No event ID');
      return teachersApi.listTeachers(eventId);
    },
    enabled: !!eventId && event?.type !== 'jam',
  });

  // Fetch current user's profile to check if super admin
  const { data: currentUserProfile } = useQuery<Profile & { is_super_admin?: boolean }>({
    queryKey: ['profile', currentUserId],
    queryFn: async () => {
      if (!currentUserId) throw new Error('No user ID');
      return profilesApi.getProfile(currentUserId);
    },
    enabled: !!currentUserId,
  });

  // Fetch co-organizers for this event
  const { data: coOrganizers } = useQuery({
    queryKey: ['events', eventId, 'organizers'],
    queryFn: async () => {
      if (!eventId) throw new Error('No event ID');
      return eventOrganizersApi.getCoOrganizers(eventId);
    },
    enabled: !!eventId && !!currentUserId,
  });

  // Generate occurrences for recurring events (next 90 days)
  const occurrenceRangeStart = useMemo(() => new Date(), []);
  const occurrenceRangeEnd = useMemo(
    () => new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    []
  );
  const occurrences = useEventOccurrences(
    event?.recurrence_rule,
    event?.recurrence_dtstart,
    occurrenceRangeStart,
    occurrenceRangeEnd
  );

  // Apply event time to occurrences (must be before early returns)
  const occurrencesWithTime = useMemo(() => {
    if (!event?.starts_at || occurrences.length === 0) {
      return [];
    }
    const eventStartDate = new Date(event.starts_at);
    const eventHours = eventStartDate.getUTCHours();
    const eventMinutes = eventStartDate.getUTCMinutes();

    return occurrences.map((date) => {
      const dateWithTime = new Date(date);
      dateWithTime.setUTCHours(eventHours, eventMinutes, 0, 0);
      return dateWithTime;
    });
  }, [occurrences, event?.starts_at]);

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-5xl">
        <div className="flex items-center justify-center h-96">
          <div className="text-lg text-muted-foreground">{t('common:common.loading')}</div>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="container mx-auto p-6 max-w-5xl">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <p className="text-lg text-destructive mb-4">
              {error ? t('common:common.error') : 'Evento non trovato'}
            </p>
            <Link to="/discover">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Torna agli eventi
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Check if current user is owner
  const isOwner = currentUserId === event.owner_id;

  // Check if current user is super admin (backend returns is_super_admin even if not in type)
  const isCurrentUserSuperAdmin = Boolean(currentUserProfile?.is_super_admin);

  // Check if current user is co-organizer
  const isCoOrganizer = Boolean(
    currentUserId &&
    coOrganizers?.some((org) => org.user_id === currentUserId)
  );

  // Check if user can edit occurrences (owner, co-organizer, or super admin)
  const canEditOccurrences = isOwner || isCoOrganizer || isCurrentUserSuperAdmin;

  // Check if organizer is super admin (for display purposes)
  const isSuperAdmin = Boolean(event.organizer?.is_super_admin);

  // Transform teachers data for TeachersList component
  const teachersForDisplay = teachers?.map(t => {
    const firstName = t.profiles?.first_name || '';
    const lastName = t.profiles?.last_name || '';
    const fullName = [firstName, lastName].filter(Boolean).join(' ') || 'Nome non disponibile';
    return {
      id: t.id,
      user_id: t.user_id,
      name: fullName,
      photo_url: t.profiles?.photo_url,
      role: t.role,
    };
  }) || [];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <EventHero event={event} />

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Back Navigation */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/discover')}
            className="rounded-xl"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Torna agli eventi
          </Button>
        </div>

        {/* Admin Actions Section - Only visible to authorized users */}
        {(isOwner || isCoOrganizer || isCurrentUserSuperAdmin) && (
          <div className="mb-6">
            <EventAdminActions
              event={event}
              teachers={teachers}
              isOwner={isOwner}
              isCoOrganizer={isCoOrganizer}
              isSuperAdmin={isCurrentUserSuperAdmin}
              canEditOccurrences={canEditOccurrences}
            />
          </div>
        )}

        {/* Two-column layout: Main content + Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content - Left Column (2/3) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Public Action Buttons */}
            <EventActions event={event} />

            {/* Description Section */}
            {event.description && (
              <Card className="border-primary/10 rounded-2xl">
                <CardHeader>
                  <CardTitle>Descrizione</CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className="text-muted-foreground prose prose-sm max-w-none leading-relaxed"
                    // biome-ignore lint/security/noDangerouslySetInnerHtml: HTML is sanitized before rendering
                    dangerouslySetInnerHTML={{
                      __html: sanitizeHtml(event.description),
                    }}
                  />
                </CardContent>
              </Card>
            )}

            {/* Schedule Section */}
            <Card className="border-primary/10 rounded-2xl">
              <CardHeader>
                <CardTitle>Programmazione</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Start/End Date */}
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <div className="font-medium">
                      {format(new Date(event.starts_at), 'EEEE, dd MMMM yyyy', { locale: it })}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(event.starts_at), 'HH:mm', { locale: it })} -{' '}
                      {format(new Date(event.ends_at), 'HH:mm', { locale: it })}
                    </div>
                  </div>
                </div>

                {/* Recurrence Display */}
                {event.recurrence_rule && (
                  <RecurrenceDisplay
                    recurrenceRule={event.recurrence_rule}
                    recurrenceDtstart={event.recurrence_dtstart}
                  />
                )}
              </CardContent>
            </Card>

            {/* Location Section */}
            <Card className="border-primary/10 rounded-2xl">
              <CardHeader>
                <CardTitle>Luogo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-primary mt-0.5" />
                  <div className="flex-1">
                    <a href={event.gmaps_link} target="_blank" rel="noopener noreferrer" className="font-medium mb-2 text-primary hover:underline">{event.location_text}</a>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Teachers Section */}
            {teachersForDisplay.length > 0 && (
              <TeachersList teachers={teachersForDisplay} eventType={event.type} />
            )}

            {/* Additional Details */}
            <Card className="border-primary/10 rounded-2xl">
              <CardHeader>
                <CardTitle>Dettagli</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Price */}
                {event.price && (
                  <div className="flex items-center gap-3">
                    <DollarSign className="h-5 w-5 text-primary" />
                    <div>
                      <div className="text-sm text-muted-foreground">Prezzo</div>
                      <div className="font-medium">{event.price}</div>
                    </div>
                  </div>
                )}

                {/* Tags */}
                {event.tags && event.tags.length > 0 && (
                  <div className="flex items-start gap-3">
                    <Tag className="h-5 w-5 text-primary mt-0.5" />
                    <div className="flex-1">
                      <div className="text-sm text-muted-foreground mb-2">Tag</div>
                      <div className="flex flex-wrap gap-2">
                        {event.tags.map((tag) => {
                          const label = EVENT_TAG_LABELS.get(tag as (typeof EVENT_TAG_OPTIONS)[number]['value']) ?? tag;
                          return (
                            <Badge key={tag} variant="secondary" className="rounded-lg">
                              {label}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Upcoming Occurrences (for recurring events) */}
            {event.recurrence_rule && occurrencesWithTime.length > 0 && (
              <Card id="event-occurrences" className="border-primary/10 rounded-2xl">
                <CardHeader>
                  <CardTitle>Prossime occorrenze</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {occurrencesWithTime.slice(0, 5).map((date) => (
                      <div
                        key={date.toISOString()}
                        className="flex items-center justify-between border rounded-lg p-3"
                      >
                        <div>
                          <div className="font-medium">
                            {format(date, 'EEEE, dd MMMM yyyy', { locale: it })}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {format(date, 'HH:mm', { locale: it })}
                          </div>
                        </div>
                        {canEditOccurrences && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingOccurrence(date.toISOString())}
                          >
                            Modifica
                          </Button>
                        )}
                      </div>
                    ))}
                    {occurrencesWithTime.length > 5 && (
                      <p className="text-sm text-muted-foreground text-center pt-2">
                        E altre {occurrencesWithTime.length - 5} occorrenze...
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar - Right Column (1/3) */}
          <div className="lg:col-span-1 space-y-6">
            {/* Organizer Info */}
            {event.organizer && (
              <EventOrganizerInfo
                organizer={{
                  id: event.organizer.id,
                  name: event.organizer.name,
                  email: event.organizer.email,
                  photo_url: event.organizer.photo_url,
                }}
                organizerContact={event.organizer_contact}
                isSuperAdmin={isSuperAdmin}
              />
            )}
          </div>
        </div>
      </div>

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
