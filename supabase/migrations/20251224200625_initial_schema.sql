-- Initial schema for Jamia database
-- This migration creates all tables needed for the Jamia AcroYoga jam management system

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- PROFILES TABLE
-- ============================================
-- Stores user profile information
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  bio TEXT,
  city TEXT,
  main_role TEXT CHECK (main_role IN ('base', 'flyer', 'both')),
  photo_url TEXT,
  is_super_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for profiles
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_is_super_admin ON profiles(is_super_admin) WHERE is_super_admin = TRUE;

-- ============================================
-- JAMS TABLE
-- ============================================
-- Stores jam session information
CREATE TABLE jams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  
  -- Location fields (both JSONB and individual columns for flexibility)
  location JSONB,  -- Full location object
  location_text TEXT,  -- Plain text location description
  gmaps_link TEXT,  -- Google Maps URL
  location_lat NUMERIC,  -- Latitude
  location_lng NUMERIC,  -- Longitude
  
  -- Time fields
  starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Capacity and participant preferences
  capacity INTEGER,
  desired_bases_min INTEGER DEFAULT 0,
  desired_bases_max INTEGER,
  desired_flyers_min INTEGER DEFAULT 0,
  desired_flyers_max INTEGER,
  
  -- Settings
  auto_promote BOOLEAN DEFAULT TRUE,
  public_participants BOOLEAN DEFAULT TRUE,
  
  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'cancelled', 'completed')),
  published_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for jams
CREATE INDEX idx_jams_owner_id ON jams(owner_id);
CREATE INDEX idx_jams_status ON jams(status);
CREATE INDEX idx_jams_starts_at ON jams(starts_at);
CREATE INDEX idx_jams_published_at ON jams(published_at);

-- ============================================
-- JAM_PARTICIPANTS TABLE
-- ============================================
-- Stores participation records for jams
CREATE TABLE jam_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jam_id UUID NOT NULL REFERENCES jams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- State: 'participant' (confirmed), 'waiting' (waitlist), 'cancelled'
  state TEXT NOT NULL DEFAULT 'participant' CHECK (state IN ('participant', 'waiting', 'cancelled')),
  
  -- Optional role field for participant role preference
  role TEXT CHECK (role IN ('base', 'flyer', 'both')),
  
  -- When the participant joined
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint: one participation record per user per jam
  UNIQUE(jam_id, user_id)
);

-- Indexes for jam_participants
CREATE INDEX idx_jam_participants_jam_id ON jam_participants(jam_id);
CREATE INDEX idx_jam_participants_user_id ON jam_participants(user_id);
CREATE INDEX idx_jam_participants_state ON jam_participants(state);
CREATE INDEX idx_jam_participants_joined_at ON jam_participants(joined_at);

-- ============================================
-- JAM_MANAGERS TABLE
-- ============================================
-- Stores co-managers for jams (in addition to owner)
CREATE TABLE jam_managers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jam_id UUID NOT NULL REFERENCES jams(id) ON DELETE CASCADE,
  manager_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint: one manager record per user per jam
  UNIQUE(jam_id, manager_id)
);

-- Indexes for jam_managers
CREATE INDEX idx_jam_managers_jam_id ON jam_managers(jam_id);
CREATE INDEX idx_jam_managers_manager_id ON jam_managers(manager_id);

-- ============================================
-- AUDIT_LOG TABLE
-- ============================================
-- Stores audit trail for all actions
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jam_id UUID REFERENCES jams(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for audit_log
CREATE INDEX idx_audit_log_jam_id ON audit_log(jam_id);
CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at DESC);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE jams ENABLE ROW LEVEL SECURITY;
ALTER TABLE jam_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE jam_managers ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Jams policies
CREATE POLICY "Published jams are viewable by everyone"
  ON jams FOR SELECT
  USING (status = 'published' OR owner_id = auth.uid());

CREATE POLICY "Users can create jams"
  ON jams FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their jams"
  ON jams FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "Owners can delete their jams"
  ON jams FOR DELETE
  USING (owner_id = auth.uid());

-- Jam participants policies
CREATE POLICY "Participants viewable by jam owner or if public"
  ON jam_participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM jams 
      WHERE jams.id = jam_participants.jam_id 
      AND (jams.owner_id = auth.uid() OR jams.public_participants = true)
    )
    OR user_id = auth.uid()
  );

CREATE POLICY "Users can join jams"
  ON jam_participants FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own participation"
  ON jam_participants FOR UPDATE
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM jams WHERE jams.id = jam_participants.jam_id AND jams.owner_id = auth.uid()
  ));

CREATE POLICY "Users and owners can delete participation"
  ON jam_participants FOR DELETE
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM jams WHERE jams.id = jam_participants.jam_id AND jams.owner_id = auth.uid()
  ));

-- Jam managers policies
CREATE POLICY "Managers viewable by jam owner"
  ON jam_managers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM jams 
      WHERE jams.id = jam_managers.jam_id 
      AND jams.owner_id = auth.uid()
    )
    OR manager_id = auth.uid()
  );

CREATE POLICY "Jam owner can add managers"
  ON jam_managers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM jams 
      WHERE jams.id = jam_managers.jam_id 
      AND jams.owner_id = auth.uid()
    )
  );

CREATE POLICY "Jam owner can remove managers"
  ON jam_managers FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM jams 
      WHERE jams.id = jam_managers.jam_id 
      AND jams.owner_id = auth.uid()
    )
  );

-- Audit log policies
CREATE POLICY "Users can view audit logs for their jams or actions"
  ON audit_log FOR SELECT
  USING (
    user_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM jams 
      WHERE jams.id = audit_log.jam_id 
      AND jams.owner_id = auth.uid()
    )
  );

CREATE POLICY "Service role can insert audit logs"
  ON audit_log FOR INSERT
  WITH CHECK (true);

-- ============================================
-- FUNCTIONS AND TRIGGERS
-- ============================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_jams_updated_at BEFORE UPDATE ON jams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_jam_participants_updated_at BEFORE UPDATE ON jam_participants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- DATABASE FUNCTIONS (RPCs)
-- ============================================

-- Function to check if a user is the owner or a manager of a jam
CREATE OR REPLACE FUNCTION is_owner_or_manager(jam_id UUID, user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  is_owner BOOLEAN;
  is_manager BOOLEAN;
BEGIN
  -- Check if user is the owner
  SELECT EXISTS (
    SELECT 1 FROM jams WHERE id = jam_id AND owner_id = user_id
  ) INTO is_owner;
  
  IF is_owner THEN
    RETURN true;
  END IF;
  
  -- Check if user is a manager
  SELECT EXISTS (
    SELECT 1 FROM jam_managers WHERE jam_managers.jam_id = $1 AND manager_id = user_id
  ) INTO is_manager;
  
  RETURN is_manager;
END;
$$;

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE profiles IS 'User profiles with personal information';
COMMENT ON TABLE jams IS 'AcroYoga jam sessions';
COMMENT ON TABLE jam_participants IS 'Participation records for jams (confirmed and waitlist)';
COMMENT ON TABLE jam_managers IS 'Co-managers for jams';
COMMENT ON TABLE audit_log IS 'Audit trail for all actions';
