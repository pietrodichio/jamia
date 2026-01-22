# Phase 6: UI/UX Refactor for Events Management - Context

**Gathered:** 2026-01-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Improve user experience and interface for event management features built in Phases 3-5. Make event discovery, creation, and management more intuitive and accessible. Focus on: Italian localization, unified discovery experience, smart creation wizard, information-rich dashboard, and comprehensive event detail pages.

</domain>

<decisions>
## Implementation Decisions

### Language & Localization
- All UI text, labels, buttons, and messages in Italian
- User-generated content (event titles, descriptions) can be in any language
- Italian date/time formats: dd/MM/yyyy and 24-hour time (14:30)
- Translate all existing English UI elements to Italian (not just new event features)

### Event Discovery Flow
- Home page (`/`) shows events + marketing content for logged-out users (Airbnb-style approach)
- Filter bar prominent and sticky at top, results display below
- Results displayed as card grid (responsive, Airbnb-like layout)
- Merge `/calendar` and `/discover` into single unified view:
  - Default: card grid view
  - Toggle button: switch to calendar view
  - Same filter bar applies in both views
- Replace all native HTML date inputs with shadcn date picker components throughout the app

### Event Creation Experience
- Three-step wizard: **Step 1: Type + Basic Info** → **Step 2: Schedule + Details** → **Step 3: Preview**
- Event type selected first, wizard adapts based on type
- Smart field visibility: show only relevant fields per event type
  - Jams: capacity, roles, participant management
  - Classes: teachers
  - Conventions: accommodation, food options
- Backward navigation allowed, but must proceed forward sequentially
- Auto-save to draft status as user fills form
- Preview as final step before publishing

### Unified Jam/Event Creation
- Single creation flow merges managed jams and event listings
- After selecting "Jam" type, ask: "Do you want to manage participants?" (Yes/No)
- If Yes: enable full participant management (capacity, roles, invites)
- If No: simple listing only
- Managed jams have two visibility modes:
  - **Public (discoverable)**: appears in event directory
  - **Private (share-by-link)**: participant management enabled, but NOT listed publicly
- Visibility control: Radio buttons with clear labels
- Dashboard displays separate sections: "Your Managed Jams" and "Your Event Listings"

### External Registration & CTAs
- If managed participants: use built-in registration system
- Otherwise: allow external registration link with customizable CTA
- Creator can set custom button text: "Contact us", "Register now", "Sign up", etc.
- External link can point to Google Forms, Instagram, email, etc.

### Image Upload
- Show suggested image size and file weight guidance
- Claude's discretion: how to display recommendations (inline, tooltip, or placeholder)

### Dashboard Integration
- Information-oriented focus: show what's happening, not just quick actions
- Display sections:
  1. **Your upcoming events**: next 3-5 events with "View all" link
  2. **Recommended events nearby**: personalized suggestions
  3. **Statistics**: total events created, participants managed, events attended
- Action buttons (Create Event, Discover, etc.) positioned in top navigation bar (compact)

### Calendar & List Views
- Card grid default view:
  - Each card shows: event image/photo, event type badge, date/time
  - Distance from user NOT shown on cards
- Calendar view: month view with event names displayed in date cells (like Google Calendar)
- Mobile: same card grid layout, responsive (cards stack in single column)
- View toggle easily accessible for switching between grid and calendar

### Event Detail Page
- Layout: Hero image at top, then details below
- Organizer information:
  - If organizer is super admin: hide organizer details
  - Otherwise: show organizer information
- Teachers (for classes/workshops/conventions):
  - Display: photo and full name
  - Multiple teachers: grid of avatars with names below
  - Social profiles and teacher invitations: deferred to future phase
- Available actions:
  - Register/RSVP button (for managed jams with participant management)
  - Add to calendar (export to Google Calendar, iCal, etc.)
  - Share event (share link, social media)
  - Edit event button (if owner)
- External registration display:
  - Show custom CTA button with creator's chosen text
  - Links to external registration (Google Forms, Instagram, etc.)

### Claude's Discretion
- Exact spacing, typography, and visual hierarchy
- Loading skeleton designs
- Error state handling and messaging
- Image upload guidance presentation (inline text, tooltip, or placeholder)
- Specific card shadow and border radius values
- Transition animations between wizard steps
- Mobile breakpoint adjustments

</decisions>

<specifics>
## Specific Ideas

- "Think like Airbnb" — home page immediately shows events with filters
- Card grid layout should feel like Airbnb's listing cards: clean, image-prominent, essential info
- Calendar view should work like Google Calendar: month view with event names visible in date cells
- Dashboard should be information-first: "what's happening" rather than "what can I do"

</specifics>

<deferred>
## Deferred Ideas

- Teacher social profiles display on event detail page — future phase
- Ability to invite teachers not yet on Jamia — future phase
- Multi-language support (English as second language) — future phase
- Recent activity feed on dashboard — not selected for Phase 6
- Advanced event search (full-text search beyond keyword) — future phase

</deferred>

---

*Phase: 06-ui-ux-refactor-for-events-management*
*Context gathered: 2026-01-22*
