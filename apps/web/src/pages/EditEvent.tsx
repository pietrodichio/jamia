import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { eventsApi } from '@/api/events.api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RecurrenceEditor } from '@/components/events/RecurrenceEditor';
import { MultiSelect } from '@/components/ui/multi-select';
import { useToast } from '@/hooks/use-toast';
import { EVENT_TAG_OPTIONS } from '@/lib/event-tags';
import { ArrowLeft } from 'lucide-react';
import type { EventType, UpdateEventDto } from '@jamia/types/event';

export default function EditEvent() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: event, isLoading } = useQuery({
    queryKey: ['events', eventId],
    queryFn: () => eventsApi.getEventById(eventId!),
    enabled: !!eventId,
  });

  // Form state
  const [type, setType] = useState<EventType>('jam');
  const [title, setTitle] = useState('');
  const [locationText, setLocationText] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [price, setPrice] = useState('');
  const [externalLink, setExternalLink] = useState('');
  const [organizerContact, setOrganizerContact] = useState('');
  const [recurrence, setRecurrence] = useState<{
    rule: string | null;
    dtstart: string | null;
    until: string | null;
  }>({ rule: null, dtstart: null, until: null });

  // Load event data into form
  useEffect(() => {
    if (event) {
      setType(event.type);
      setTitle(event.title);
      setLocationText(event.location_text);
      setStartsAt(event.starts_at.slice(0, 16)); // Format for datetime-local input
      setEndsAt(event.ends_at.slice(0, 16));
      setDescription(event.description || '');
      setTags(event.tags || []);
      setPrice(event.price || '');
      setExternalLink(event.external_link || '');
      setOrganizerContact(event.organizer_contact || '');
      setRecurrence({
        rule: event.recurrence_rule || null,
        dtstart: event.recurrence_dtstart || null,
        until: event.recurrence_until || null,
      });
    }
  }, [event]);

  const updateMutation = useMutation({
    mutationFn: (data: UpdateEventDto) => eventsApi.updateEvent(eventId!, data),
    onSuccess: () => {
      toast({ title: 'Event updated successfully!' });
      navigate(`/events/${eventId}`);
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to update event',
        description: error.response?.data?.message || 'Please try again',
        variant: 'destructive'
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const eventData: UpdateEventDto = {
      type,
      title,
      location_text: locationText,
      starts_at: startsAt,
      ends_at: endsAt,
      description: description || undefined,
      tags,
      price: price || undefined,
      external_link: externalLink || undefined,
      organizer_contact: organizerContact || undefined,
      recurrence_rule: recurrence.rule || undefined,
      recurrence_dtstart: recurrence.dtstart || undefined,
      recurrence_until: recurrence.until || undefined,
    };

    updateMutation.mutate(eventData);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <div className="flex items-center justify-center h-96">
          <div className="text-lg text-muted-foreground">Loading event...</div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <p className="text-lg text-muted-foreground mb-4">Event not found</p>
            <Link to="/calendar">
              <Button variant="outline">Back to Calendar</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <div className="mb-6">
        <Link to={`/events/${eventId}`}>
          <Button variant="ghost" className="rounded-xl">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Event
          </Button>
        </Link>
      </div>

      <Card className="border-primary/10 rounded-2xl">
        <CardHeader>
          <CardTitle className="text-2xl">Edit Event</CardTitle>
          <CardDescription>Update event details</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Event Type */}
            <div className="space-y-2">
              <Label htmlFor="type">Event Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as EventType)}>
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="jam">Jam</SelectItem>
                  <SelectItem value="class">Class</SelectItem>
                  <SelectItem value="workshop">Workshop</SelectItem>
                  <SelectItem value="convention">Convention</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="location">Location *</Label>
              <Input
                id="location"
                value={locationText}
                onChange={(e) => setLocationText(e.target.value)}
                required
              />
            </div>

            {/* Start Date/Time */}
            <div className="space-y-2">
              <Label htmlFor="starts-at">Starts At *</Label>
              <Input
                id="starts-at"
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                required
              />
            </div>

            {/* End Date/Time */}
            <div className="space-y-2">
              <Label htmlFor="ends-at">Ends At *</Label>
              <Input
                id="ends-at"
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                required
              />
            </div>

            {/* Recurrence Editor */}
            {startsAt && (
              <RecurrenceEditor
                value={recurrence}
                onChange={setRecurrence}
                startsAt={startsAt}
              />
            )}

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label>Tag</Label>
              <MultiSelect
                options={EVENT_TAG_OPTIONS}
                selected={tags}
                onChange={setTags}
                placeholder="Tag"
                className="min-w-[200px] w-fit"
              />
            </div>

            {/* Price */}
            <div className="space-y-2">
              <Label htmlFor="price">Price</Label>
              <Input
                id="price"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>

            {/* External Link */}
            <div className="space-y-2">
              <Label htmlFor="external-link">External Link</Label>
              <Input
                id="external-link"
                type="url"
                value={externalLink}
                onChange={(e) => setExternalLink(e.target.value)}
              />
            </div>

            {/* Organizer Contact */}
            <div className="space-y-2">
              <Label htmlFor="organizer-contact">Contact Info</Label>
              <Input
                id="organizer-contact"
                value={organizerContact}
                onChange={(e) => setOrganizerContact(e.target.value)}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(`/events/${eventId}`)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateMutation.isPending}
                className="flex-1"
              >
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
