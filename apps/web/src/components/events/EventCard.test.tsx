import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/render-utils';
import { EventCard } from './EventCard';
import type { Event, EventTeacher } from '@jamia/types/event';

// Mock utility modules that depend on Supabase or do complex transformations
vi.mock('@/lib/image-utils', () => ({
  getOptimizedImageUrl: (_bucket: string, path: string) => `https://cdn.example.com/${path}`,
  getResponsiveSrcSet: (_bucket: string, path: string, _sizes: number[], _quality: number) =>
    `https://cdn.example.com/${path} 400w, https://cdn.example.com/${path} 800w`,
}));

vi.mock('@/lib/event-gradient', () => ({
  generateEventGradient: () => 'linear-gradient(135deg, #4f46e5, #7c3aed)',
}));

vi.mock('@/lib/event-badges', () => ({
  getEventTypeBadgeColorClasses: () => '',
}));

// Mock useNavigate so we can spy on navigation calls
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

// Minimal event fixture (all required fields)
const mockEvent: Event = {
  id: 'test-event-1',
  title: 'AcroYoga Jam Domenicale',
  type: 'jam',
  starts_at: '2026-03-15T10:00:00Z',
  ends_at: '2026-03-15T12:00:00Z',
  location_text: 'Parco della Musica, Roma',
  location_city: 'Roma',
  status: 'published',
  owner_id: 'user-1',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

describe('EventCard', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('renders event title', () => {
    renderWithProviders(<EventCard event={mockEvent} />);
    expect(screen.getByText('AcroYoga Jam Domenicale')).toBeInTheDocument();
  });

  it('renders "Jam" type badge label for type jam', () => {
    renderWithProviders(<EventCard event={mockEvent} />);
    expect(screen.getByText('Jam')).toBeInTheDocument();
  });

  it('renders "Workshop" type badge label for type workshop', () => {
    const event: Event = { ...mockEvent, type: 'workshop' };
    renderWithProviders(<EventCard event={event} />);
    expect(screen.getByText('Workshop')).toBeInTheDocument();
  });

  it('renders "Lezione" type badge label for type class', () => {
    const event: Event = { ...mockEvent, type: 'class' };
    renderWithProviders(<EventCard event={event} />);
    expect(screen.getByText('Lezione')).toBeInTheDocument();
  });

  it('renders "Convention" type badge label for type convention', () => {
    const event: Event = { ...mockEvent, type: 'convention' };
    renderWithProviders(<EventCard event={event} />);
    expect(screen.getByText('Convention')).toBeInTheDocument();
  });

  it('renders location badge with location_city when provided', () => {
    renderWithProviders(<EventCard event={mockEvent} />);
    expect(screen.getByText('Roma')).toBeInTheDocument();
  });

  it('renders location from location_text when location_city is absent', () => {
    const event: Event = { ...mockEvent, location_city: undefined };
    renderWithProviders(<EventCard event={event} />);
    expect(screen.getByText('Parco della Musica, Roma')).toBeInTheDocument();
  });

  it('renders formatted Italian date', () => {
    renderWithProviders(<EventCard event={mockEvent} />);
    // date-fns formats 2026-03-15T10:00:00Z in Italian: "15 marzo 2026, ..."
    expect(screen.getByText(/15 marzo 2026/)).toBeInTheDocument();
  });

  it('navigates to /events/:id when card is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<EventCard event={mockEvent} />);

    const card = screen.getByText('AcroYoga Jam Domenicale').closest('[class*="cursor-pointer"]');
    if (card) {
      await user.click(card);
    } else {
      // Fallback: click on the title itself, which is inside the clickable card
      await user.click(screen.getByText('AcroYoga Jam Domenicale'));
    }

    expect(mockNavigate).toHaveBeenCalledWith('/events/test-event-1');
  });

  it('renders gradient background when no image_url is provided', () => {
    const event: Event = { ...mockEvent, image_url: undefined };
    renderWithProviders(<EventCard event={event} />);

    // The gradient div is rendered instead of img when no image_url
    const gradientDiv = document.querySelector('[style*="linear-gradient"]');
    expect(gradientDiv).toBeInTheDocument();
  });

  it('renders img element when image_url is provided', () => {
    const event: Event = { ...mockEvent, image_url: 'hero.jpg' };
    renderWithProviders(<EventCard event={event} />);

    const img = screen.getByAltText('AcroYoga Jam Domenicale');
    expect(img).toBeInTheDocument();
  });

  it('renders teacher avatars when teachers array is provided', () => {
    const teachers: EventTeacher[] = [
      {
        id: 'teacher-1',
        event_id: 'test-event-1',
        user_id: 'user-2',
        created_at: '2026-01-01T00:00:00Z',
        profiles: {
          id: 'user-2',
          first_name: 'Marco',
          last_name: 'Rossi',
          photo_url: undefined,
        },
      },
    ];
    const event: Event = { ...mockEvent, teachers };
    renderWithProviders(<EventCard event={event} />);

    // Avatar fallback should render initials
    expect(screen.getByText('MR')).toBeInTheDocument();
  });

  it('does not render avatar elements when no teachers provided', () => {
    const event: Event = { ...mockEvent, teachers: [] };
    renderWithProviders(<EventCard event={event} />);

    // "MR" initials or similar avatar content should not appear
    const avatarContainer = document.querySelector('.flex.-space-x-2');
    expect(avatarContainer).not.toBeInTheDocument();
  });

  it('handles event with undefined teachers gracefully', () => {
    const event: Event = { ...mockEvent, teachers: undefined };
    renderWithProviders(<EventCard event={event} />);

    // Card still renders without errors
    expect(screen.getByText('AcroYoga Jam Domenicale')).toBeInTheDocument();
  });

  it('does not render location badge when both location fields are absent', () => {
    const event: Event = { ...mockEvent, location_city: undefined, location_text: '' };
    renderWithProviders(<EventCard event={event} />);

    // MapPin icon should still not cause a crash; badge just not shown
    // We check that Roma text is not in document
    expect(screen.queryByText('Roma')).not.toBeInTheDocument();
  });
});
