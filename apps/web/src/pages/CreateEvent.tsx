import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { eventsApi } from '@/api/events.api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RecurrenceEditor } from '@/components/events/RecurrenceEditor';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { EventType, CreateEventDto } from '@jamia/types/event';

export default function CreateEvent() {
  const navigate = useNavigate();
  const { toast } = useToast();

  // Form state
  const [type, setType] = useState<EventType>('jam');
  const [title, setTitle] = useState('');
  const [locationText, setLocationText] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [externalLink, setExternalLink] = useState('');
  const [organizerContact, setOrganizerContact] = useState('');
  const [recurrence, setRecurrence] = useState<{
    rule: string | null;
    dtstart: string | null;
    until: string | null;
  }>({ rule: null, dtstart: null, until: null });

  const createMutation = useMutation({
    mutationFn: (data: CreateEventDto) => eventsApi.createEvent(data),
    onSuccess: (event) => {
      toast({ title: 'Event created successfully!' });
      navigate(`/events/${event.id}`);
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to create event',
        description: error.response?.data?.message || 'Please try again',
        variant: 'destructive'
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const eventData: CreateEventDto = {
      type,
      title,
      location_text: locationText,
      starts_at: startsAt,
      ends_at: endsAt,
      description: description || undefined,
      price: price || undefined,
      external_link: externalLink || undefined,
      organizer_contact: organizerContact || undefined,
      recurrence_rule: recurrence.rule || undefined,
      recurrence_dtstart: recurrence.dtstart || undefined,
      recurrence_until: recurrence.until || undefined,
    };

    createMutation.mutate(eventData);
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <div className="mb-6">
        <Link to="/calendar">
          <Button variant="ghost" className="rounded-xl">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Calendar
          </Button>
        </Link>
      </div>

      <Card className="border-primary/10 rounded-2xl">
        <CardHeader>
          <CardTitle className="text-2xl">Create Event</CardTitle>
          <CardDescription>Share a new acroyoga event with the community</CardDescription>
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
                placeholder="Event title"
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
                placeholder="Event location"
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
                placeholder="Event description"
              />
            </div>

            {/* Price */}
            <div className="space-y-2">
              <Label htmlFor="price">Price</Label>
              <Input
                id="price"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="e.g., Free, $10, €5-15"
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
                placeholder="https://..."
              />
            </div>

            {/* Organizer Contact */}
            <div className="space-y-2">
              <Label htmlFor="organizer-contact">Contact Info</Label>
              <Input
                id="organizer-contact"
                value={organizerContact}
                onChange={(e) => setOrganizerContact(e.target.value)}
                placeholder="Email or phone"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/calendar')}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="flex-1"
              >
                {createMutation.isPending ? 'Creating...' : 'Create Event'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
