import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { it } from 'date-fns/locale/it';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getOptimizedImageUrl, getResponsiveSrcSet } from '@/lib/image-utils';
import { generateEventGradient } from '@/lib/event-gradient';
import { getEventTypeBadgeColorClasses } from '@/lib/event-badges';
import type { Event } from '@jamia/types/event';
import { MapPin, CalendarDays } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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

  // Use outline variant as base for all custom badge styles
  const badgeVariant: 'outline' = 'outline';

  const getEventTypeBadgeClassName = (type: string): string => {
    const baseClasses = 'absolute top-2 right-2 shadow-sm font-semibold';
    return `${baseClasses} ${getEventTypeBadgeColorClasses(type)}`;
  };

  const getEventTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      jam: 'Jam',
      class: 'Lezione',
      workshop: 'Workshop',
      convention: 'Convention',
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

  const hasImage = !!event.image_url;
  const gradientStyle = generateEventGradient(event.id, event.title);

  // Image URL handling (only if image exists)
  const thumbnailUrl = hasImage
    ? (event.image_url.startsWith('http')
      ? event.image_url
      : getOptimizedImageUrl('event-images', event.image_url, {
        width: 400,
        quality: 80,
        resize: 'cover',
      }))
    : undefined;

  const srcSet = hasImage && !event.image_url.startsWith('http')
    ? getResponsiveSrcSet('event-images', event.image_url, [400, 800], 80)
    : undefined;


  return (
    <Card
      className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
      onClick={handleClick}
    >
      {/* Hero image container */}
      <div className="relative h-48 w-full overflow-hidden bg-muted">
        {hasImage ? (
          <img
            src={thumbnailUrl}
            srcSet={srcSet}
            sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
            alt={event.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div
            className="w-full h-full group-hover:scale-105 transition-transform duration-300"
            style={{ background: gradientStyle }}
          />
        )}
        {/* Event type badge - positioned in top-right corner */}
        <Badge
          variant={badgeVariant}
          className={getEventTypeBadgeClassName(event.type)}
        >
          {getEventTypeLabel(event.type)}
        </Badge>

        {/* Location badge - positioned in bottom-left corner */}
        {(event.location_city || event.location_text) && (
          <Badge
            variant="secondary"
            className="absolute bottom-2 left-2 shadow-sm flex items-center gap-1 backdrop-blur-md bg-background/90 hover:bg-background/100 border-0"
          >
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="line-clamp-1 max-w-[150px]">
              {event.location_city || event.location_text}
            </span>
          </Badge>
        )}

        {/* Teachers Avatars - positioned in bottom-right corner */}
        {event.teachers && event.teachers.length > 0 && (
          <div className="absolute bottom-2 right-2 flex -space-x-2 overflow-visible pl-1 z-10">
            {event.teachers.slice(0, 4).map((teacher) => (
              <TooltipProvider key={teacher.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Avatar className="inline-block h-8 w-8 rounded-full ring-2 ring-background cursor-pointer hover:z-20 transition-all hover:scale-110">
                      <AvatarImage src={teacher.profiles?.photo_url || undefined} />
                      <AvatarFallback className="bg-primary/80 text-[10px]">
                        {teacher.profiles?.first_name?.[0]}
                        {teacher.profiles?.last_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      {teacher.profiles?.first_name} {teacher.profiles?.last_name}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
            {event.teachers.length > 4 && (
              <div className="flex h-8 w-8 items-center justify-center rounded-full ring-2 ring-background bg-muted text-xs font-medium text-muted-foreground z-10">
                +{event.teachers.length - 4}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Card content */}
      <CardContent className="p-4 flex flex-col gap-3">
        {/* Title - max 2 lines with ellipsis */}
        <h3 className="font-semibold text-lg line-clamp-2 leading-tight">
          {event.title}
        </h3>

        {/* Date */}
        <div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 shrink-0" />
            <span>{formatItalianDate(event.starts_at)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
