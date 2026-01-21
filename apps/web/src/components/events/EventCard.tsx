import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Calendar, DollarSign, ExternalLink } from 'lucide-react';
import type { Event } from '@jamia/types/event';

interface EventCardProps {
  event: Event & { distance_meters: number };
}

export function EventCard({ event }: EventCardProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/events/${event.id}`);
  };

  const formatDistance = (meters: number): string => {
    const km = meters / 1000;
    if (km < 1) {
      return '< 1 km away';
    }
    return `${km.toFixed(1)} km away`;
  };

  const formatDate = (dateString: string): string => {
    return format(new Date(dateString), 'PPP p'); // e.g., "Apr 29, 2023 at 7:00 PM"
  };

  const truncateDescription = (text: string | undefined): string => {
    if (!text) return '';
    if (text.length <= 150) return text;
    return text.substring(0, 150) + '...';
  };

  const getEventTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      jam: 'Jam',
      class: 'Class',
      workshop: 'Workshop',
      convention: 'Convention',
    };
    return labels[type] || type;
  };

  const getEventTypeBadgeVariant = (type: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      jam: 'default',
      class: 'secondary',
      workshop: 'outline',
      convention: 'destructive',
    };
    return variants[type] || 'default';
  };

  return (
    <Card
      className="border-primary/10 rounded-2xl hover:shadow-lg transition-shadow cursor-pointer"
      onClick={handleClick}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-xl">{event.title}</CardTitle>
            <CardDescription className="flex items-center gap-1 mt-1">
              <MapPin className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{event.location_text}</span>
            </CardDescription>
          </div>
          <Badge variant={getEventTypeBadgeVariant(event.type)}>
            {getEventTypeLabel(event.type)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Date and time */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4 flex-shrink-0" />
          <span>{formatDate(event.starts_at)}</span>
        </div>

        {/* Distance */}
        <div className="flex items-center gap-2 text-sm font-medium text-primary">
          <MapPin className="h-4 w-4 flex-shrink-0" />
          <span>{formatDistance(event.distance_meters)}</span>
        </div>

        {/* Description */}
        {event.description && (
          <p className="text-sm text-muted-foreground">
            {truncateDescription(event.description)}
          </p>
        )}

        {/* Price */}
        {event.price && (
          <div className="flex items-center gap-2 text-sm font-medium">
            <DollarSign className="h-4 w-4 flex-shrink-0" />
            <span>{event.price}</span>
          </div>
        )}

        {/* External link indicator */}
        {event.external_link && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ExternalLink className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">External link available</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
