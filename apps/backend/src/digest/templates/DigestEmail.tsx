import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import { Tailwind } from '@react-email/tailwind';
import * as React from 'react';
import { CuratedEvents } from '../dto/curated-events.dto.js';
import { EmailFooter } from './components/EmailFooter.js';
import { EmailHeader } from './components/EmailHeader.js';
import { EventCard } from './components/EventCard.js';

interface DigestEmailProps {
  curated: CuratedEvents;
  userName: string | null;
  unsubscribeToken: string;
  frequency: 'weekly' | 'monthly';
  frontendBaseUrl: string;
}

export const DigestEmail = ({
  curated,
  userName,
  unsubscribeToken,
  frequency,
  frontendBaseUrl,
}: DigestEmailProps) => {
  const previewText =
    frequency === 'weekly'
      ? 'I tuoi eventi questa settimana'
      : 'I tuoi eventi del mese';

  const introText =
    frequency === 'weekly'
      ? 'Ecco gli eventi della settimana per te.'
      : 'Ecco gli eventi del mese per te.';

  const greeting = userName ? `Ciao ${userName},` : 'Ciao,';

  // Check if sections have events
  const hasUpcoming =
    curated.upcoming.conventions.length > 0 ||
    curated.upcoming.workshops.length > 0 ||
    curated.upcoming.jams.length > 0;

  const hasNew =
    curated.new.conventions.length > 0 ||
    curated.new.workshops.length > 0 ||
    curated.new.jams.length > 0;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Tailwind>
        <Body style={body}>
          <Container style={container}>
            <EmailHeader />

            <Section style={content}>
              <Text style={greetingStyle}>{greeting}</Text>
              <Text style={intro}>{introText}</Text>

              {/* Prossimi eventi section */}
              {hasUpcoming && (
                <>
                  <Text style={sectionHeading}>Prossimi eventi</Text>

                  {curated.upcoming.conventions.length > 0 && (
                    <>
                      <Text style={typeHeading}>Convention</Text>
                      {curated.upcoming.conventions.map((event) => (
                        <EventCard
                          key={event.id}
                          event={event}
                          frontendBaseUrl={frontendBaseUrl}
                        />
                      ))}
                    </>
                  )}

                  {curated.upcoming.workshops.length > 0 && (
                    <>
                      <Text style={typeHeading}>Workshop</Text>
                      {curated.upcoming.workshops.map((event) => (
                        <EventCard
                          key={event.id}
                          event={event}
                          frontendBaseUrl={frontendBaseUrl}
                        />
                      ))}
                    </>
                  )}

                  {curated.upcoming.jams.length > 0 && (
                    <>
                      <Text style={typeHeading}>Jam</Text>
                      {curated.upcoming.jams.map((event) => (
                        <EventCard
                          key={event.id}
                          event={event}
                          frontendBaseUrl={frontendBaseUrl}
                        />
                      ))}
                    </>
                  )}
                </>
              )}

              {/* Nuovi eventi section */}
              {hasNew && (
                <>
                  <Text style={sectionHeading}>Nuovi eventi</Text>

                  {curated.new.conventions.length > 0 && (
                    <>
                      <Text style={typeHeading}>Convention</Text>
                      {curated.new.conventions.map((event) => (
                        <EventCard
                          key={event.id}
                          event={event}
                          frontendBaseUrl={frontendBaseUrl}
                        />
                      ))}
                    </>
                  )}

                  {curated.new.workshops.length > 0 && (
                    <>
                      <Text style={typeHeading}>Workshop</Text>
                      {curated.new.workshops.map((event) => (
                        <EventCard
                          key={event.id}
                          event={event}
                          frontendBaseUrl={frontendBaseUrl}
                        />
                      ))}
                    </>
                  )}

                  {curated.new.jams.length > 0 && (
                    <>
                      <Text style={typeHeading}>Jam</Text>
                      {curated.new.jams.map((event) => (
                        <EventCard
                          key={event.id}
                          event={event}
                          frontendBaseUrl={frontendBaseUrl}
                        />
                      ))}
                    </>
                  )}
                </>
              )}
            </Section>

            <EmailFooter
              unsubscribeToken={unsubscribeToken}
              frontendBaseUrl={frontendBaseUrl}
            />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

const body = {
  backgroundColor: '#f9fafb',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
};

const container = {
  margin: '0 auto',
  padding: '20px 0',
  maxWidth: '600px',
  backgroundColor: '#ffffff',
};

const content = {
  padding: '0 24px',
};

const greetingStyle = {
  fontSize: '16px',
  lineHeight: '24px',
  color: '#111827',
  marginBottom: '8px',
};

const intro = {
  fontSize: '14px',
  lineHeight: '20px',
  color: '#6b7280',
  marginTop: '0',
  marginBottom: '24px',
};

const sectionHeading = {
  fontSize: '20px',
  fontWeight: 'bold',
  lineHeight: '28px',
  color: '#6366f1',
  marginTop: '32px',
  marginBottom: '16px',
};

const typeHeading = {
  fontSize: '16px',
  fontWeight: '600',
  lineHeight: '24px',
  color: '#111827',
  marginTop: '20px',
  marginBottom: '12px',
};
