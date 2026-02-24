-- Add source_event_id column to jams table for bidirectional sync (event -> jam)
-- This mirrors the existing source_jam_id on events table (jam -> event)
ALTER TABLE jams
  ADD COLUMN source_event_id UUID REFERENCES events(id) ON DELETE CASCADE;

-- Create index for reverse lookup (find jam by event)
CREATE INDEX idx_jams_source_event_id ON jams(source_event_id) WHERE source_event_id IS NOT NULL;

-- Add unique constraint: one jam per event
CREATE UNIQUE INDEX idx_jams_source_event_unique ON jams(source_event_id) WHERE source_event_id IS NOT NULL;

-- Add comment
COMMENT ON COLUMN jams.source_event_id IS 'Links jam to source event created via /create-event wizard. NULL for legacy jams. One-to-one relationship enforced by unique index.';

-- Add jam management columns to events table
-- These store jam-specific settings when type=''jam'' and manage_participants=true
-- Enables reverse sync from events -> jams without losing jam configuration

ALTER TABLE events
  ADD COLUMN manage_participants BOOLEAN DEFAULT FALSE,
  ADD COLUMN capacity INTEGER,
  ADD COLUMN desired_bases_min INTEGER,
  ADD COLUMN desired_bases_max INTEGER,
  ADD COLUMN desired_flyers_min INTEGER,
  ADD COLUMN desired_flyers_max INTEGER,
  ADD COLUMN auto_promote BOOLEAN DEFAULT TRUE,
  ADD COLUMN public_participants BOOLEAN DEFAULT TRUE;

-- Add comments for clarity
COMMENT ON COLUMN events.manage_participants IS 'When true for type=''jam'', enables participant management features via linked jams record';
COMMENT ON COLUMN events.capacity IS 'Total participant capacity for managed jams (type=''jam'' with manage_participants=true)';
COMMENT ON COLUMN events.desired_bases_min IS 'Minimum desired bases for managed jams';
COMMENT ON COLUMN events.desired_bases_max IS 'Maximum desired bases for managed jams';
COMMENT ON COLUMN events.desired_flyers_min IS 'Minimum desired flyers for managed jams';
COMMENT ON COLUMN events.desired_flyers_max IS 'Maximum desired flyers for managed jams';
COMMENT ON COLUMN events.auto_promote IS 'Auto-promote from waitlist when spots open (managed jams)';
COMMENT ON COLUMN events.public_participants IS 'Show participant list publicly (managed jams)';
