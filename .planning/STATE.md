# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-20)

**Core value:** Dual-purpose platform - manage jam participants + discover acroyoga events
**Current focus:** Milestone v1 - In Progress

## Current Position

Phase: 8 (Event Recap Email Engine) - IN PROGRESS
Plan: 1 of 3 complete
Status: Digest module foundation complete, ready for email templates
Last activity: 2026-02-10 — Completed 08-01-PLAN.md (Digest Module Foundation)

Progress: [███████████░] 98% (53/54 plans complete)

## Performance Metrics

**Velocity:**
- Total plans completed: 53
- Average duration: 4 min
- Total execution time: 4.04 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1. Monorepo Migration | 4/4 | 17 min | 4 min |
| 2. Open Source Preparation | 3/3 | 3 min | 1 min |
| 3. Event Foundation | 4/4 | 8 min | 2 min |
| 4. Event Discovery | 7/7 | 15 min | 2 min |
| 5. Event Enhancements | 10/10 | 65 min | 7 min |
| 6. UI/UX Refactor | 7/7 | 29 min | 4 min |
| 6.1. Event Creation Flow Fixes | 6/6 | 24 min | 4 min |
| 6.2. Dashboard Refactor | 3/3 | 7 min | 2 min |
| 6.3. Location UX Improvements | 3/3 | 6 min | 2 min |
| 6.4. Unified Search Bar | 2/2 | 6 min | 3 min |
| 7. Email Preferences | 3/3 | 10 min | 3 min |
| 8. Event Recap Email Engine | 1/3 | 2 min | 2 min |

**Recent Trend:**
- Last 5 plans: 07-01 (4 min), 07-02 (4 min), 07-03 (2 min), 08-01 (2 min)
- Trend: Phase 8 started - digest module foundation complete, building email templates next

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Turborepo for monorepo (industry standard, supports selective deployment)
- Geolocation + manual search for location (covers local users and travelers)
- Crowdsourced events without approval (lower barrier, trust community)
- Only jams are managed, other events are listings only (keeps scope focused)
- Use @jamia/ namespace prefix for all workspace packages (prevents conflicts)
- Placeholder types in packages/types (real types extracted in Plan 03)
- Git subtree for repository migration (preserves full history and author attribution)
- Interfaces not classes in shared types (types-only, no runtime code)
- Backend DTOs implement shared interfaces (maintains class-validator decorators)
- Jest moduleNameMapper for workspace imports (resolves @jamia/types in tests)
- Railway watchPaths for selective deployment (native monorepo support)
- Netlify ignore command with git diff (workaround for selective deployment)
- Turborepo filter in deployment builds (build only target app)
- Single root README instead of app-level READMEs (monorepo best practice)
- Explicit .env.example references in setup instructions (addresses OSS-02)
- Document monorepo commands at root level (pnpm install, pnpm --filter)
- Disable blank issues to force template use (improves issue quality)
- Link to GitHub Discussions for questions (keeps issues for actionable items)
- Use markdown templates over YAML forms (simpler, more flexible)
- Document repository settings in version control (maintainer continuity)
- Single events table with type discriminator instead of separate tables per type
- Mirror jam_managers pattern for event_organizers (proven authorization model)
- Regular columns instead of JSONB for type-specific data (better queryability)
- Event status enum (draft/published/archived) matching jams pattern
- Single CreateEventDto with @IsIn type validation for all 4 event types
- UpdateEventDto uses PartialType for consistency with NestJS patterns
- Delete restricted to owner only (not co-organizers) for safety
- Super admin bypass implemented at service level for all authorization checks
- Owner-only permissions for co-organizer management (co-organizers can edit events but not manage co-organizers)
- Nested routes under /events/:eventId/organizers for RESTful sub-resource pattern
- Mirror backend DTOs exactly in frontend types (type consistency across boundary)
- Separate API client files per resource for focused imports (events.api.ts, event-organizers.api.ts)
- Use replace: true in setSearchParams to avoid polluting browser history
- Convert radius from km (UI-friendly) to meters (API expectation) in API client
- Store all filter state in URL params for bookmarkability and shareability
- Use geography(POINT, 4326) instead of geometry for accurate spherical distance calculations
- Use GENERATED ALWAYS AS for search_vector instead of trigger-based approach
- Add trigger to automatically maintain location_geo from lat/lng changes
- Use ST_DWithin for radius filtering before ST_Distance for sorting (leverages spatial index)
- Default radius of 50km for location searches
- @Public() decorator pattern for selective route authentication bypass
- Reflector-based metadata check in guard for public routes
- Search endpoint positioned before :id route to prevent conflicts
- @Query() decorator for GET query parameter validation
- Native HTML date inputs instead of Calendar component (simpler, universal browser support)
- 300ms debounce delay for keyword search (industry standard)
- Manual coordinate entry alongside geolocation (supports users who deny permission)
- Radius selector with predefined options (better UX than free-form input)
- City search deferred to Phase 5 (requires geocoding service)
- Use date-fns localizer for react-big-calendar (date-fns already in project)
- Store full event data in calendar event resource property (enables easy detail navigation)
- Set explicit height on calendar container (required for react-big-calendar rendering)
- Defer DiscoverEvents view toggle integration until plan 04-04 executes
- Distance formatting threshold: < 1 km instead of 0.X km for readability
- React Query enabled only when lat/lng filters present (prevents unnecessary API calls)
- Empty state guidance: "Set your location" when filters missing
- Event type badge variants: differentiate types visually (jam=default, class=secondary, workshop=outline, convention=destructive)
- Description truncation: 150 characters with ellipsis for list preview
- Loading skeleton count: 3 placeholder cards to indicate content loading
- Client-side distance calculation is for display only (authoritative distance from backend search results)
- Back navigation goes to /calendar (not /discover) as primary event view
- EventWithOrganizer type provides organizer details without additional API call
- Junction table pattern for teachers over ARRAY column (better bidirectional query performance)
- Teachers are display-only metadata with no special permissions beyond event authorization
- RLS policy allows anyone to view teachers but only owners/co-organizers can manage
- Store RRULE string with separate recurrence_dtstart column (RRULE alone doesn't include base datetime)
- Use event_occurrences table for exceptions instead of EXDATE format (better queryability)
- Add parent_event_id for series splitting pattern (enables 'edit future events' functionality)
- Partial filtered indexes on recurrence columns (only index non-NULL values for efficiency)
- Check constraint ensures recurrence_rule and recurrence_dtstart are set together
- PostgreSQL ARRAY columns instead of many-to-many junction tables for tag filtering (3-5x faster)
- GIN indexes enable fast @> (contains) and && (overlaps) operators on ARRAY columns
- Empty array defaults ('{}') eliminate need for NULL checks in WHERE clauses
- Document suggested tag values in column comments for consistency
- rrule.js library for RFC 5545 RRULE parsing and validation
- 1000 occurrence limit prevents infinite series performance issues
- Upsert pattern for event_occurrences ensures idempotent exception updates
- Series splitting creates new event with parent_event_id link for audit trail
- Application-level sync for managed jams instead of database triggers (maintainability)
- Sync only managed+published jams to events (share-by-link jams excluded)
- Non-throwing sync methods ensure jam CRUD operations always succeed
- Extended RPC function for tag filtering instead of direct queries (preserves PostGIS optimization)
- Transform decorator handles both array and comma-separated query param formats
- NULL-safe filter parameters where NULL means no filtering (not 'match NULL values')
- DROP old function signature before CREATE OR REPLACE to avoid PostgreSQL overloading
- Visibility changes (managed→share-by-link) automatically delete event listing
- source_jam_id foreign key with ON DELETE CASCADE ensures automatic cleanup
- Teacher profile navigation via /teachers/:teacherId route pattern
- Teacher selection UI uses Supabase profile search with name filter
- Teacher filter in main search UI deferred as optional enhancement
- EditEvent integration deferred until EditEvent page is created
- TagFilter provides 10 predefined options matching backend schema (ensures data integrity)
- AmenityFilters separates accommodation and food into distinct sections (independent filtering)
- URLSearchParams.append pattern for multi-select filters (bookmarkable URLs)
- Empty arrays omitted from API calls to avoid filtering on empty criteria
- rrule.js library for RRULE generation and parsing (RFC 5545 compliant, toText() for human-readable descriptions)
- Auto-update RRULE via useEffect in RecurrenceEditor (cleaner than setTimeout callbacks)
- Show first 5 occurrences in EventDetail with 90-day range (balances UX and performance)
- Dialog pattern for OccurrenceEditor with radio selection for edit scope
- CreateEvent and EditEvent pages with RecurrenceEditor integration (missing critical functionality auto-added)
- Supabase Storage transformations for image optimization over Cloudinary/imgix (no third-party cost)
- Italian date formatting with date-fns locale (dd MMMM yyyy, HH:mm format)
- Remove distance display from event cards per Phase 6 CONTEXT.md
- CSS Grid with auto-rows-fr for equal height cards in grid layout
- Responsive srcSet with 400w/800w variants for mobile/desktop optimization
- Default image quality 80 for optimal balance between size and quality
- react-i18next for Italian localization (industry standard, namespace organization)
- date-fns Italian locale (it) for all date/time formatting throughout app
- Shadcn DatePicker with Italian locale replaces native HTML date inputs
- Namespace-organized translations: common, events, forms, dashboard (lazy loading support)
- shouldUnregister: true in useEventWizard for conditional field cleanup (prevents hidden fields in submission)
- trigger() validation before step navigation (validates only current step fields)
- Backward navigation allowed without validation (better UX for multi-step forms)
- Step field mapping in stepFields object for maintainable wizard validation
- Airbnb-style home page with marketing hero + event preview grid (improves discovery UX)
- Unified /discover view with grid/calendar toggle via URL parameter (seamless view switching, bookmarkable)
- /calendar route redirects to /discover?view=calendar (backward compatibility)
- Marketing namespace for translations (logical separation, lazy loading)
- useAutoSave with 1000ms debounce and upsert pattern to avoid duplicate draft records
- Conditional field components using watch() for self-contained rendering logic
- /create-jam redirects to /create-event for backward compatibility
- Draft auto-save creates status='draft' records; submission publishes to status='published'
- Jam capacity/visibility fields NOT sent to events table (jam management features separate from event listings)
- Information-first dashboard layout: show data (events, stats) before actions
- Compact action buttons in page header instead of content area (better visual hierarchy)
- Location-based recommendations in dashboard (personalized event discovery)
- Legacy jam management section preserved (backward compatibility during event feature adoption)
- Statistics aggregate owned + co-organized events (accurate user activity representation)
- Hero gradient overlay (from-black/80 to-transparent) ensures text readability over diverse images
- Hide organizer details when organizer is super admin (privacy for platform admins)
- Calendar export dropdown with Google Calendar and iCal options (cleaner UI than separate buttons)
- Web Share API with clipboard fallback for cross-platform sharing
- Custom cta_text field for external registration button personalization
- image_url field with event-images storage bucket for hero images
- LocationInput uses presentational pattern (receives predictions from parent for superior separation of concerns)
- DOMPurify with explicit ALLOWED_TAGS whitelist for rich text sanitization (security control over default sanitization)
- Italian placeholder messages for missing form data instead of empty/null values (better UX in preview)
- formatDateTime helper returns string fallbacks instead of null for consistent null-safe rendering
- Client-side image compression (max 1MB, 1920px) before upload reduces storage costs and bandwidth usage
- File upload with validation, compression, preview pattern for better UX and security
- Image upload optional in event creation wizard (can be skipped or added later)
- Conditional wizard steps based on event type (teachers step only for class/workshop/convention)
- Batch teacher insertion using Promise.all on individual API calls (client-side batch wrapper when backend lacks batch endpoint)
- Load selected teachers on mount to preserve wizard state when navigating back
- Profile search dropdown with debounced query, avatars, and selection state
- Auto-fill end time defaults to +4 hours from start time (typical event duration)
- End time auto-fill capped at 23:59 to prevent crossing day boundary
- 500ms debounce on auto-fill prevents excessive form updates during typing
- RecurrenceEditor conditional rendering for class type only (primary use case for recurring events)
- shouldDirty: false on auto-fill prevents marking form dirty for suggested values
- Event location field structured as object (description, lat, lng, googleMapsUrl) instead of plain string for coordinate support
- Event description field unconstrained to support rich HTML content from ReactQuill editor
- Google Maps autocomplete with 350ms debounce for location predictions in event wizard
- DescriptionEditor used as self-contained component with own label in event creation
- LocationInput presentational component receives predictions and handlers from parent
- URL param cleanup: remove section param when default value for cleaner URLs
- Children prop pattern with named slots for explicit content placement in DashboardTabs
- StatisticsSection positioned above tabs as shared overview (visible regardless of active tab)
- Tab content container pattern (ParticipationsTab/EventManagementTab wrap multiple sections)
- Deduplicate events by ID when merging owned and co-organized events
- Visual separator between Events section and Legacy Jam section in EventManagementTab
- IP location fetched via ipapi.co with 5min staleTime (avoids rate limiting)
- useRef pattern prevents re-auto-apply after user clears location
- enableHighAccuracy: true for GPS requests (precise location is user-initiated)
- City-only autocomplete via types: ['(cities)'] in Google Places API request
- Location type tracking (ip/gps/city) enables appropriate display indicator
- City search is temporary (URL params only, does not modify user profile)
- 350ms debounce on city search matches EventTypeStep pattern for consistency
- Three distinct empty states for no location, no results, and filters applied (context-aware guidance)
- Progressive radius expansion 50->100->200->500 km (gradual search expansion)
- EmptyStateContext pattern for passing state and callbacks to grid component
- UnifiedSearchBar: Eventbrite-style pill layout with keyword | divider | location | search button
- IP location auto-applies to URL on mount for immediate search results
- Pending location uses ring + dot visual indicator to show unsaved changes
- City selection stages but doesn't auto-search (explicit search button required)
- Desktop-only render with null return for mobile (Plan 02 adds mobile version)
- Vaul drawer for mobile search modal (consistent with shadcn/ui patterns)
- Compact trigger button shows search summary text (keyword + location combination)
- autoFocus on keyword input when drawer opens (better UX)
- Inline location dropdown inside drawer (not overlay)
- Two-tier filter bar: search row above, filters row below
- Glass-morphism sticky header: bg-background/95 backdrop-blur
- Default email preferences to disabled (opt-in approach respects user privacy and complies with email marketing best practices)
- Unsubscribe token UUID (provides strong uniqueness guarantee and prevents token guessing)
- Partial index on digest_enabled=true (Phase 8 scheduler only queries enabled users)
- Separate GET and POST unsubscribe endpoints for RFC 8058 compliance (both required for email client compatibility)
- Public decorator pattern for selective auth bypass on unsubscribe endpoints (token-based validation, no user authentication required)
- DTO implements shared interface from @jamia/types for type consistency across monorepo boundary
- Self-contained EmailPreferencesCard manages own React Query data fetching independently of profile form
- New user detection based on phone field presence (phone required, null = incomplete profile)
- Opt-out email preference pattern (pre-checked toggle for new users, auto-save on mount)
- Always send both digest_enabled and digest_frequency together in mutations to prevent race conditions
- Independent settings cards pattern: separate React Query flows, not part of form submission
- Group events by type with priority ordering (convention > workshop > jam for digest emails)
- Deduplicate events across sections (new section excludes upcoming IDs to prevent showing same event twice)
- Max 3 events per type per section (prevents email from being overwhelming, max 18 events total)
- Service role client for digest queries (scheduled jobs run server-side, bypass RLS to query all published events)
- JSX support in backend tsconfig (enables React Email template compilation)


### Roadmap Evolution

- Phase 6 added: UI/UX refactor for events management
- Phase 6.1 inserted after Phase 6: Event Creation Flow Fixes (URGENT) - Critical gaps discovered in wizard (layout, rich text, location picker, tags, recurring events, preview, validation, images, teachers)
- Phase 6.2 inserted after Phase 6.1: Dashboard Refactor - Separate dashboard into participations/discovery section and event management section
- Phase 6.3 inserted after Phase 6.2: Location UX Improvements - Auto-detect location, IP fallback, city search for trip planning (discovered during Phase 6.2 UAT)
- Phase 6.4 inserted after Phase 6.3: Unified Search Bar - Eventbrite-style combined keyword and location search with mobile modal pattern
- Phase 7 added: Email Preferences - DB migration, API, and settings UI for email digest preferences (weekly/monthly)
- Phase 8 added: Event Recap Email Engine - Scheduled sending, email templates, content curation, Resend integration
- Phase 9 added: Email Adoption & Growth UX - Onboarding flows, nudges, smart defaults to maximize subscriptions

### Pending Todos

None yet.

### Blockers/Concerns

None yet.

## Session Continuity

Last session: 2026-02-10
Stopped at: Completed 08-01-PLAN.md (Digest Module Foundation)
Resume file: None
Next: Phase 8 Plan 02 (Email Templates with React Email)
