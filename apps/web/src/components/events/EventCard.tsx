import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { it } from 'date-fns/locale/it';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getOptimizedImageUrl, getResponsiveSrcSet } from '@/lib/image-utils';
import type { Event } from '@jamia/types/event';

interface EventCardProps {
  event: Event;
}

/**
 * Airbnb-style event card component
 * Displays event with hero image, type badge, Italian date/time, and description preview
 */
export function EventCard({ event }: EventCardProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/events/${event.id}`);
  };

  const getEventTypeBadgeVariant = (
    type: string
  ): 'default' | 'secondary' | 'destructive' | 'outline' => {
    const variants: Record<
      string,
      'default' | 'secondary' | 'destructive' | 'outline'
    > = {
      jam: 'default',
      class: 'secondary',
      workshop: 'outline',
      convention: 'destructive',
    };
    return variants[type] || 'default';
  };

  const getEventTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      jam: 'Jam',
      class: 'Lezione',
      workshop: 'Workshop',
      convention: 'Convegno',
    };
    return labels[type] || type;
  };

  const truncateDescription = (text: string | undefined): string => {
    if (!text) return '';
    if (text.length <= 150) return text;
    return text.substring(0, 150) + '...';
  };

  // Format date in Italian: "22 gennaio 2026, 14:30"
  const formatItalianDate = (dateString: string): string => {
    try {
      return format(new Date(dateString), 'dd MMMM yyyy, HH:mm', {
        locale: it,
      });
    } catch {
      return dateString;
    }
  };

  // Placeholder image URL if no image provided
  const placeholderImage = '/placeholder-event.jpg';
  const imagePath = event.image_url || placeholderImage;

  // For now, we'll assume image_url contains just the filename
  // If it's a full URL from Supabase, we use it directly
  const isFullUrl = imagePath.startsWith('http');

  const thumbnailUrl = isFullUrl
    ? imagePath
    : getOptimizedImageUrl('event-images', imagePath, {
      width: 400,
      quality: 80,
      resize: 'cover',
    });

  const srcSet = isFullUrl
    ? undefined
    : getResponsiveSrcSet('event-images', imagePath, [400, 800], 80);

  console.log('event', event);

  return (
    <Card
      className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
      onClick={handleClick}
    >
      {/* Hero image container */}
      <div className="relative h-48 w-full overflow-hidden bg-muted">
        <img
          src={thumbnailUrl}
          srcSet={srcSet}
          sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
          alt={event.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {/* Event type badge - positioned in top-right corner */}
        <Badge
          variant={getEventTypeBadgeVariant(event.type)}
          className="absolute top-2 right-2 shadow-sm"
        >
          {getEventTypeLabel(event.type)}
        </Badge>
      </div>

      {/* Card content */}
      <CardContent className="p-4">
        {/* Title - max 2 lines with ellipsis */}
        <h3 className="font-semibold text-lg mb-2 line-clamp-2">
          {event.title}
        </h3>

        {/* Date and time - Italian format */}
        <p className="text-sm text-muted-foreground mb-2">
          {formatItalianDate(event.starts_at)}
        </p>

        {/* Description preview - max 2 lines */}
        {event.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {truncateDescription(event.description)}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
