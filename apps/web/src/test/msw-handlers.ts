import { http, HttpResponse } from 'msw';

// Base URL matches the backend API
const API_BASE = 'http://localhost:3000';

export const handlers = [
  // Events search
  http.get(`${API_BASE}/events/search`, () => {
    return HttpResponse.json([]);
  }),

  // Get single event
  http.get(`${API_BASE}/events/:id`, ({ params }) => {
    return HttpResponse.json({
      id: params.id,
      title: 'Test Event',
      type: 'jam',
      starts_at: '2026-03-01T10:00:00Z',
      ends_at: '2026-03-01T12:00:00Z',
      location_text: 'Roma',
      status: 'published',
      owner_id: 'user-1',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    });
  }),

  // Create event
  http.post(`${API_BASE}/events`, () => {
    return HttpResponse.json(
      { id: 'new-event-id', title: 'New Event' },
      { status: 201 }
    );
  }),

  // IP location (external API used by useIpLocation)
  http.get('https://ipapi.co/json/', () => {
    return HttpResponse.json({
      latitude: 41.9028,
      longitude: 12.4964,
      city: 'Roma',
    });
  }),
];
