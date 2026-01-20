-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE public.user_role AS ENUM ('user', 'admin');
CREATE TYPE public.acro_role AS ENUM ('base', 'flyer', 'both');
CREATE TYPE public.jam_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE public.participant_state AS ENUM ('participant', 'waiting', 'cancelled');
CREATE TYPE public.audit_action AS ENUM ('created', 'updated', 'published', 'unpublished', 'deleted', 'joined', 'cancelled', 'promoted', 'removed');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  bio TEXT,
  city TEXT,
  main_role public.acro_role NOT NULL DEFAULT 'both',
  photo_url TEXT,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User roles table (separate for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.user_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Jams table
CREATE TABLE public.jams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  location_text TEXT NOT NULL,
  gmaps_link TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  description TEXT,
  capacity INTEGER,
  desired_bases_min INTEGER,
  desired_bases_max INTEGER,
  desired_flyers_min INTEGER,
  desired_flyers_max INTEGER,
  status public.jam_status DEFAULT 'draft',
  auto_promote BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Jam participants table
CREATE TABLE public.jam_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  jam_id UUID NOT NULL REFERENCES public.jams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.acro_role NOT NULL,
  state public.participant_state DEFAULT 'participant',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  promoted_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  source TEXT DEFAULT 'direct',
  UNIQUE(jam_id, user_id)
);

-- Audit log table
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  jam_id UUID REFERENCES public.jams(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action public.audit_action NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_jams_owner_status_starts ON public.jams(owner_id, status, starts_at);
CREATE INDEX idx_jams_status ON public.jams(status);
CREATE INDEX idx_jam_participants_jam_state_role_joined ON public.jam_participants(jam_id, state, role, joined_at);
CREATE INDEX idx_jam_participants_user ON public.jam_participants(user_id);
CREATE INDEX idx_audit_log_jam ON public.audit_log(jam_id);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jam_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Security definer function to check admin role
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_roles.user_id = is_admin.user_id
      AND role = 'admin'
  );
$$;

-- Profiles RLS policies
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- User roles RLS policies
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Jams RLS policies
CREATE POLICY "Anyone can view published jams"
  ON public.jams FOR SELECT
  TO authenticated
  USING (status = 'published' OR owner_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Users can create jams"
  ON public.jams FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners and admins can update jams"
  ON public.jams FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id OR public.is_admin(auth.uid()));

CREATE POLICY "Owners and admins can delete jams"
  ON public.jams FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id OR public.is_admin(auth.uid()));

-- Jam participants RLS policies
CREATE POLICY "Participants can view jam participants"
  ON public.jam_participants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.jams
      WHERE jams.id = jam_participants.jam_id
        AND (jams.status = 'published' OR jams.owner_id = auth.uid())
    ) OR public.is_admin(auth.uid())
  );

CREATE POLICY "Users can join jams"
  ON public.jam_participants FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own participation"
  ON public.jam_participants FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.jams
      WHERE jams.id = jam_participants.jam_id AND jams.owner_id = auth.uid()
    ) OR
    public.is_admin(auth.uid())
  );

CREATE POLICY "Owners and admins can delete participants"
  ON public.jam_participants FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.jams
      WHERE jams.id = jam_participants.jam_id AND jams.owner_id = auth.uid()
    ) OR
    public.is_admin(auth.uid())
  );

-- Audit log RLS policies
CREATE POLICY "Anyone can view audit logs for their jams"
  ON public.audit_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.jams
      WHERE jams.id = audit_log.jam_id
        AND (jams.owner_id = auth.uid() OR public.is_admin(auth.uid()))
    )
  );

CREATE POLICY "Authenticated users can create audit logs"
  ON public.audit_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Trigger for profile creation on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, verified)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.email_confirmed_at IS NOT NULL
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger for updated_at on jams
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_jams_updated_at
  BEFORE UPDATE ON public.jams
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();