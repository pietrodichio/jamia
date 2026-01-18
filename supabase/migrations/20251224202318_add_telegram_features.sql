-- Add Telegram notification features to Jamia
-- This migration adds support for Telegram notifications to jam managers

-- ============================================
-- ADD TELEGRAM COLUMNS TO PROFILES
-- ============================================

-- Add Telegram integration fields to profiles table
ALTER TABLE profiles 
  ADD COLUMN telegram_username TEXT,
  ADD COLUMN telegram_chat_id BIGINT,
  ADD COLUMN telegram_linked_at TIMESTAMP WITH TIME ZONE;

-- Create index for faster Telegram chat_id lookups
CREATE INDEX idx_profiles_telegram_chat_id 
  ON profiles(telegram_chat_id) 
  WHERE telegram_chat_id IS NOT NULL;

-- ============================================
-- TELEGRAM_LINK_TOKENS TABLE
-- ============================================

-- Stores temporary tokens for linking Telegram accounts
CREATE TABLE telegram_link_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  used BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for telegram_link_tokens
CREATE INDEX idx_telegram_link_tokens_token ON telegram_link_tokens(token);
CREATE INDEX idx_telegram_link_tokens_user_id ON telegram_link_tokens(user_id);
CREATE INDEX idx_telegram_link_tokens_expires_at ON telegram_link_tokens(expires_at);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on telegram_link_tokens
ALTER TABLE telegram_link_tokens ENABLE ROW LEVEL SECURITY;

-- Telegram link tokens policies
CREATE POLICY "Users can manage own link tokens"
  ON telegram_link_tokens FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- ADD TELEGRAM NOTIFICATION TOGGLE TO JAMS
-- ============================================

-- Add per-jam notification preference
ALTER TABLE jams 
  ADD COLUMN telegram_notifications_enabled BOOLEAN DEFAULT false;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON COLUMN profiles.telegram_username IS 'Telegram username for the user';
COMMENT ON COLUMN profiles.telegram_chat_id IS 'Telegram chat ID for sending direct messages';
COMMENT ON COLUMN profiles.telegram_linked_at IS 'When the Telegram account was linked';
COMMENT ON TABLE telegram_link_tokens IS 'Temporary one-time tokens for linking Telegram accounts';
COMMENT ON COLUMN jams.telegram_notifications_enabled IS 'Whether the jam owner wants to receive Telegram notifications for this jam';
