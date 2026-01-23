-- Add image_url field for event hero images
-- Stores the path to the image in Supabase Storage (event-images bucket)

ALTER TABLE public.events
ADD COLUMN image_url TEXT;

COMMENT ON COLUMN public.events.image_url IS 'Path to event image in Supabase Storage event-images bucket';

-- Create event-images storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-images', 'event-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload event images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'event-images');

-- Allow anyone to read event images (public bucket)
CREATE POLICY "Anyone can view event images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'event-images');

-- Allow event owners to delete their images
CREATE POLICY "Event owners can delete their images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'event-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
