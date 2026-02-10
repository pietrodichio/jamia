import { Img, Link, Section, Text } from '@react-email/components';
import * as React from 'react';
import { DigestEvent } from '../../dto/curated-events.dto.js';

interface EventCardProps {
  event: DigestEvent;
  frontendBaseUrl: string;
}

export const EventCard = ({ event, frontendBaseUrl }: EventCardProps) => {
  // Format date in Italian
  const formattedDate = new Intl.DateTimeFormat('it-IT', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'Europe/Rome',
  }).format(new Date(event.starts_at));

  const eventUrl = `${frontendBaseUrl}/events/${event.id}`;

  return (
    <Section style={cardContainer}>
      {event.image_url && (
        <Link href={eventUrl}>
          <Img
            src={event.image_url}
            alt={event.title}
            width="600"
            style={cardImage}
          />
        </Link>
      )}
      <Section style={cardContent}>
        <Link href={eventUrl} style={titleLink}>
          <Text style={title}>{event.title}</Text>
        </Link>
        <Text style={metadata}>{formattedDate}</Text>
        {event.location_city && (
          <Text style={metadata}>{event.location_city}</Text>
        )}
      </Section>
    </Section>
  );
};

const cardContainer = {
  marginBottom: '20px',
  backgroundColor: '#ffffff',
  borderRadius: '8px',
  overflow: 'hidden',
  border: '1px solid #e5e7eb',
};

const cardImage = {
  width: '100%',
  maxHeight: '160px',
  objectFit: 'cover' as const,
  display: 'block',
};

const cardContent = {
  padding: '16px',
};

const titleLink = {
  textDecoration: 'none',
};

const title = {
  fontSize: '18px',
  fontWeight: 'bold',
  lineHeight: '24px',
  color: '#111827',
  marginTop: '0',
  marginBottom: '8px',
};

const metadata = {
  fontSize: '14px',
  lineHeight: '20px',
  color: '#6b7280',
  marginTop: '4px',
  marginBottom: '4px',
};
