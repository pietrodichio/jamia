import { format } from 'date-fns';
import { it } from 'date-fns/locale/it';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { getOptimizedImageUrl } from '@/lib/image-utils';
import type { EventWithOrganizer } from '@jamia/types';

interface EventHeroProps {
  event: EventWithOrganizer;
}

export function EventHero({ event }: EventHeroProps) {
  const { t } = useTranslation('events');

  const eventTypeBadgeVariant: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
    jam: 'default',
    class: 'secondary',
    workshop: 'outline',
    convention: 'destructive',
  };

  // Generate optimized hero image URL if image exists
  const heroImageUrl = event.image_url
    ? getOptimizedImageUrl('event-images', event.image_url, { width: 1200, quality: 90 })
    : null;

  return (
    <div className="relative h-96 w-full overflow-hidden rounded-2xl">
      {/* Hero Image */}
      {heroImageUrl ? (
        <img
          src={heroImageUrl}
          alt={event.title}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        // Gradient placeholder if no image
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5" />
      )}

      {/* Dark overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

      {/* Event type badge - top right */}
      <div className="absolute top-4 right-4">
        <Badge
          variant={eventTypeBadgeVariant[event.type] || 'default'}
          className="text-sm font-medium capitalize"
        >
          {t(`types.${event.type}`)}
        </Badge>
      </div>

      {/* Overlay content - event info */}
      <div className="absolute bottom-0 left-0 right-0 p-8">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 drop-shadow-lg">
          {event.title}
        </h1>
        <p className="text-xl md:text-2xl text-white/90 drop-shadow-md">
          {format(new Date(event.starts_at), 'dd MMMM yyyy, HH:mm', { locale: it })}
        </p>
      </div>
    </div>
  );
}
