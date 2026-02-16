-- Migration: Add product_updates_enabled column to email_preferences
-- Purpose: Allow users to opt in/out of manual product update emails

ALTER TABLE public.email_preferences
  ADD COLUMN product_updates_enabled BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.email_preferences.product_updates_enabled
  IS 'Whether user wants to receive product update emails (sent manually by project owners)';
