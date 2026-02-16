import { useState } from 'react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale/it';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { getOptimizedImageUrl, extractPathFromUrl } from '@/lib/image-utils';
import { generateEventGradient } from '@/lib/event-gradient';
import { getEventTypeBadgeColorClasses } from '@/lib/event-badges';
import type { EventWithOrganizer } from '@jamia/types';

interface EventHeroProps {
  event: EventWithOrganizer;
}

export function EventHero({ event }: EventHeroProps) {
  const { t } = useTranslation('events');
  const [imageError, setImageError] = useState(false);

  // Generate optimized hero image URL if image exists
  // Handle both full URLs and paths
  const heroImageUrl = event.image_url
    ? (() => {
      // Check if it's a full URL
      if (event.image_url.startsWith('http')) {
        // Extract path from full URL
        const path = extractPathFromUrl(event.image_url, 'event-images');
        if (path) {
          // Use extracted path to generate optimized URL
          return getOptimizedImageUrl('event-images', path, { width: 1200, quality: 90 });
        }
        // If we can't extract path, use the URL directly (fallback)
        return event.image_url;
      }
      // It's already a path, use it directly
      return getOptimizedImageUrl('event-images', event.image_url, { width: 1200, quality: 90 });
    })()
    : null;

  // Fallback to direct public URL if optimized URL fails to load
  const displayImageUrl = imageError && event.image_url ? event.image_url : heroImageUrl;
  const gradientStyle = generateEventGradient(event.id, event.title);

  return (
    <div className="relative h-96 w-full overflow-hidden rounded-b-2xl">
      {/* Hero Image */}
      {displayImageUrl ? (
        <img
          src={displayImageUrl}
          alt={event.title}
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => {
            // If optimized URL fails, fall back to direct public URL
            if (!imageError && heroImageUrl !== event.image_url) {
              setImageError(true);
            }
          }}
        />
      ) : (
        // Gradient placeholder if no image
        <div
          className="absolute inset-0"
          style={{ background: gradientStyle }}
        />
      )}

      {/* Dark overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

      {/* Event type badge - top right */}
      <div className="absolute top-4 right-4">
        <Badge
          variant="outline"
          className={`text-sm font-semibold capitalize shadow-sm ${getEventTypeBadgeColorClasses(event.type)}`}
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
