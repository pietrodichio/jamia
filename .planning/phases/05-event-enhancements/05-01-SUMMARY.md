---
phase: 05-event-enhancements
plan: 01
subsystem: database
tags: [supabase, postgresql, recurring-events, rrule, rfc-5545, migrations]

# Dependency graph
requires:
  - phase: 03-event-foundation
    provides: Events table with basic fields (title, location, dates, description)
  - phase: 04-event-discovery
    provides: PostGIS geography column and search capabilities
provides:
  - Recurring event storage with iCalendar RRULE format (RFC 5545)
  - Exception tracking for modified/canceled individual occurrences
  - Series splitting support via parent_event_id for "edit future events" operation
  - Complete RLS policies for event_occurrences table
affects: [05-02-recurring-events-ui, event-calendar-view, event-api]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - RRULE storage pattern with separate dtstart column
    - Exception table pattern for recurring event deviations
    - Partial filtered indexes on nullable columns
    - Check constraints ensuring related fields set together

key-files:
  created:
    - apps/web/supabase/migrations/20260121120000_add_recurring_events.sql
  modified: []

key-decisions:
  - "Store RRULE string with separate recurrence_dtstart column (RRULE alone doesn't include base datetime)"
  - "Use event_occurrences table for exceptions instead of EXDATE format (better queryability)"
  - "Add parent_event_id for series splitting pattern (enables 'edit future events' functionality)"
  - "Partial filtered indexes on recurrence columns (only index non-NULL values for efficiency)"
  - "Check constraint ensures recurrence_rule and recurrence_dtstart are set together"

patterns-established:
  - "Recurring events pattern: recurrence_rule (RRULE string) + recurrence_dtstart (base datetime) + recurrence_until (optional end)"
  - "Exception pattern: event_occurrences table with override fields, UNIQUE(event_id, original_start)"
  - "Series splitting pattern: parent_event_id links new series to original when series is split"
  - "RLS policy reuse: event_occurrences policies mirror events table authorization logic"

# Metrics
duration: 7min
completed: 2026-01-21
---

# Phase 05 Plan 01: Recurring Events Database Schema Summary

**RRULE-based recurring events with exception tracking, series splitting support, and complete RLS policies**

## Performance

- **Duration:** 7 min
- **Started:** 2026-01-21T19:11:15Z
- **Completed:** 2026-01-21T19:18:24Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Added recurrence columns to events table following iCalendar RFC 5545 RRULE standard
- Created event_occurrences exception table for tracking modified/canceled individual occurrences
- Implemented series splitting support via parent_event_id for "edit future events" pattern
- Added filtered indexes on recurrence columns for efficient recurring event queries
- Created complete RLS policy suite (4 policies) for event_occurrences table
- Added comprehensive documentation comments explaining RRULE pattern usage

## Task Commits

Each task was committed atomically:

1. **Task 1: Create recurring events migration** - `16e6df9` (feat)

## Files Created/Modified

- `apps/web/supabase/migrations/20260121120000_add_recurring_events.sql` - Complete recurring events schema with RRULE storage, exception tracking, series splitting, indexes, constraints, RLS policies, and documentation comments

## Decisions Made

**1. Store recurrence_dtstart separately from RRULE string**
- RRULE format doesn't include the actual base start datetime, only the pattern
- Storing dtstart separately is required for rrule.js library to generate occurrences
- Pattern: `recurrence_rule` (TEXT) + `recurrence_dtstart` (TIMESTAMPTZ) always set together

**2. Use event_occurrences table instead of EXDATE format**
- EXDATE (exception dates) is deprecated in RFC 5545 and harder to query
- Separate table enables storing modified occurrence details (not just canceled dates)
- Override pattern: NULL fields inherit from parent, non-NULL fields override
- Better queryability: can filter/search modified occurrences, show history

**3. Add parent_event_id for series splitting**
- Enables Google Calendar-style "edit future events" pattern
- When user edits future occurrences: truncate original series, create new series with parent_event_id link
- Maintains relationship between original and split series for auditing

**4. Use partial filtered indexes on recurrence columns**
- Only index rows WHERE recurrence_rule IS NOT NULL (most events are non-recurring)
- Reduces index size and improves write performance
- Same pattern for parent_event_id index

**5. Add check constraint for recurrence field consistency**
- Ensures either all recurrence fields NULL or recurrence_rule + dtstart are set
- Prevents invalid states like RRULE without base datetime
- Database-level enforcement of data integrity

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

**Database confusion during verification:**
- Two Supabase database containers were running (different projects)
- Initially checked wrong database (port 54322 - project-acro-sicily with organizations/memberships schema)
- Correct database on port 54422 (supabase_db_fuddhnsjxumqhdquvchx) has our events schema
- Resolution: Identified correct container and verified all schema changes successfully applied

No impact on migration quality - all verification passed in correct database.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for recurring events UI implementation:**
- Database schema supports full RRULE pattern storage
- Exception tracking enables single occurrence edits/cancellations
- Series splitting support enables "edit future events" functionality
- RLS policies secure multi-user access to exceptions
- Indexes in place for efficient recurring event queries

**Key integration points for next phase:**
- Use rrule.js library to parse recurrence_rule and generate occurrences
- Query event_occurrences to merge exceptions with generated occurrences
- Check for canceled occurrences (is_cancelled = TRUE) to filter from display
- Use override fields when present, fall back to parent event fields when NULL
- Implement series splitting when user edits "this and future events"

**Schema patterns established:**
- Recurrence columns: `recurrence_rule`, `recurrence_dtstart`, `recurrence_until`, `parent_event_id`
- Exception table: `event_occurrences` with override fields and is_cancelled flag
- UNIQUE constraint: (event_id, original_start) ensures one exception per occurrence
- Indexes: Partial indexes on recurrence_rule and parent_event_id for performance

**No blockers identified.**

---
*Phase: 05-event-enhancements*
*Completed: 2026-01-21*
