-- Migration: Create email_preferences table
-- Purpose: Store user preferences for email digest subscriptions (weekly/monthly)
-- This provides the data layer for the email recap feature in Phase 7-8

-- Step 1: Create the email_preferences table
CREATE TABLE IF NOT EXISTS public.email_preferences (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  digest_enabled BOOLEAN NOT NULL DEFAULT false,
  digest_frequency TEXT NOT NULL DEFAULT 'monthly'
    CHECK (digest_frequency IN ('weekly', 'monthly')),
  unsubscribe_token UUID NOT NULL DEFAULT gen_random_uuid(),
  last_digest_sent_at TIMESTAMPTZ,
  has_seen_digest_prompt BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add table and column comments
COMMENT ON TABLE public.email_preferences IS 'User preferences for email digest subscriptions';
COMMENT ON COLUMN public.email_preferences.user_id IS 'Foreign key to profiles table';
COMMENT ON COLUMN public.email_preferences.digest_enabled IS 'Whether user has opted into email digests';
COMMENT ON COLUMN public.email_preferences.digest_frequency IS 'Frequency of digest emails: weekly or monthly';
COMMENT ON COLUMN public.email_preferences.unsubscribe_token IS 'Unique token for one-click unsubscribe links';
COMMENT ON COLUMN public.email_preferences.last_digest_sent_at IS 'Timestamp of most recent digest email sent to this user';
COMMENT ON COLUMN public.email_preferences.has_seen_digest_prompt IS 'Whether user has seen the digest subscription prompt in UI';
COMMENT ON COLUMN public.email_preferences.created_at IS 'Timestamp when preferences were created';
COMMENT ON COLUMN public.email_preferences.updated_at IS 'Timestamp when preferences were last updated';

-- Step 2: Create indexes

-- Partial index for digest scheduling queries (Phase 8)
-- Only indexes rows where digest_enabled = true to optimize scheduler queries
CREATE INDEX idx_email_preferences_digest_enabled_frequency
  ON public.email_preferences (digest_enabled, digest_frequency)
  WHERE digest_enabled = true;

-- Unique index for fast unsubscribe token lookups
CREATE UNIQUE INDEX idx_email_preferences_unsubscribe_token
  ON public.email_preferences (unsubscribe_token);

-- Step 3: Enable RLS and create policies

ALTER TABLE public.email_preferences ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own email preferences
CREATE POLICY "Users can view own email preferences"
  ON public.email_preferences
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Users can update their own email preferences
CREATE POLICY "Users can update own email preferences"
  ON public.email_preferences
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own email preferences
CREATE POLICY "Users can insert own email preferences"
  ON public.email_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Note: Service role bypasses RLS by default, needed for Phase 8 scheduler

-- Step 4: Add updated_at trigger

CREATE TRIGGER update_email_preferences_updated_at
  BEFORE UPDATE ON public.email_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Step 5: Update handle_new_user() trigger to insert email_preferences

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (id, email, first_name, verified)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.email_confirmed_at IS NOT NULL
  );

  -- Insert user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');

  -- Insert email preferences with defaults
  INSERT INTO public.email_preferences (user_id, digest_enabled, digest_frequency)
  VALUES (NEW.id, false, 'monthly');

  RETURN NEW;
END;
$$;

-- Step 6: Backfill existing users

INSERT INTO public.email_preferences (user_id, digest_enabled, digest_frequency)
SELECT p.id, false, 'monthly'
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.email_preferences ep WHERE ep.user_id = p.id
);
