-- Add source_jam_id column to events table
ALTER TABLE events
  ADD COLUMN source_jam_id UUID REFERENCES jams(id) ON DELETE CASCADE;

-- Create index for reverse lookup (find event by jam)
CREATE INDEX idx_events_source_jam_id ON events(source_jam_id) WHERE source_jam_id IS NOT NULL;

-- Add unique constraint: one event per jam
CREATE UNIQUE INDEX idx_events_source_jam_unique ON events(source_jam_id) WHERE source_jam_id IS NOT NULL;

-- Add comment
COMMENT ON COLUMN events.source_jam_id IS 'Links event to source managed jam. NULL for user-created events. One-to-one relationship enforced by unique index.';
