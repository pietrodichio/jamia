/**
 * Calendar export utilities for generating iCal (.ics) files
 * Follows RFC 5545 iCalendar specification
 */

import { format } from 'date-fns';
import type { Event } from '@jamia/types';

/**
 * Converts a Date to iCal format (YYYYMMDDTHHMMSSZ)
 * @param date - Date to convert
 * @returns iCal-formatted date string
 */
function toICalDate(date: Date): string {
  return format(date, "yyyyMMdd'T'HHmmss'Z'");
}

/**
 * Escapes special characters in iCal text fields
 * @param text - Text to escape
 * @returns Escaped text safe for iCal format
 */
function escapeICalText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')   // Escape backslashes
    .replace(/;/g, '\\;')     // Escape semicolons
    .replace(/,/g, '\\,')     // Escape commas
    .replace(/\n/g, '\\n');   // Escape newlines
}

/**
 * Generates iCalendar (.ics) format data for an event
 * @param event - Event object to convert to iCal format
 * @returns iCalendar format string
 *
 * @example
 * const icalData = generateICalData(event);
 * // Can be used with downloadICalFile or for Google Calendar URL
 */
export function generateICalData(event: Event): string {
  const now = new Date();
  const startDate = new Date(event.starts_at);
  const endDate = new Date(event.ends_at);

  // Build iCal components
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Jamia//Event//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${event.id}@jamia.app`,
    `DTSTAMP:${toICalDate(now)}`,
    `DTSTART:${toICalDate(startDate)}`,
    `DTEND:${toICalDate(endDate)}`,
    `SUMMARY:${escapeICalText(event.title)}`,
  ];

  // Add description if present
  if (event.description) {
    lines.push(`DESCRIPTION:${escapeICalText(event.description)}`);
  }

  // Add location if present
  if (event.location_text) {
    lines.push(`LOCATION:${escapeICalText(event.location_text)}`);
  }

  // Add geo coordinates if present
  if (event.location_lat && event.location_lng) {
    lines.push(`GEO:${event.location_lat};${event.location_lng}`);
  }

  // Add event URL (link back to Jamia event page)
  const eventUrl = `${window.location.origin}/events/${event.id}`;
  lines.push(`URL:${eventUrl}`);

  // Add organizer contact if present
  if (event.organizer_contact) {
    lines.push(`ORGANIZER:${escapeICalText(event.organizer_contact)}`);
  }

  // Close VEVENT and VCALENDAR
  lines.push('END:VEVENT');
  lines.push('END:VCALENDAR');

  return lines.join('\r\n');
}

/**
 * Triggers download of an iCal (.ics) file for the given event
 * @param event - Event to download as .ics file
 *
 * @example
 * <Button onClick={() => downloadICalFile(event)}>
 *   Download iCal
 * </Button>
 */
export function downloadICalFile(event: Event): void {
  const icalData = generateICalData(event);

  // Create blob with correct MIME type
  const blob = new Blob([icalData], { type: 'text/calendar;charset=utf-8' });

  // Generate safe filename from event title
  const safeTitle = event.title
    .replace(/[^a-z0-9]/gi, '-')  // Replace non-alphanumeric with dash
    .replace(/-+/g, '-')           // Replace multiple dashes with single
    .replace(/^-|-$/g, '')         // Remove leading/trailing dashes
    .toLowerCase();

  const filename = `${safeTitle}.ics`;

  // Create download link and trigger click
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();

  // Cleanup
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generates Google Calendar URL with event details pre-filled
 * @param event - Event to add to Google Calendar
 * @returns Google Calendar URL
 *
 * @example
 * const gcalUrl = generateGoogleCalendarUrl(event);
 * window.open(gcalUrl, '_blank');
 */
export function generateGoogleCalendarUrl(event: Event): string {
  const startDate = format(new Date(event.starts_at), "yyyyMMdd'T'HHmmss");
  const endDate = format(new Date(event.ends_at), "yyyyMMdd'T'HHmmss");

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${startDate}/${endDate}`,
    details: event.description || '',
    location: event.location_text || '',
  });

  // Add Google Maps link if available
  if (event.gmaps_link) {
    params.set('location', `${event.location_text || ''} (${event.gmaps_link})`);
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
