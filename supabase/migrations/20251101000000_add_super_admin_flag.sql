-- Migration: add `is_super_admin` flag to profiles

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.is_super_admin IS
  'Grants platform-wide administrative capabilities when true.';
