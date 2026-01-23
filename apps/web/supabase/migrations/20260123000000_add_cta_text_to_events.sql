-- Add cta_text field for custom external registration button text
-- Allows event organizers to customize the call-to-action text
-- e.g., "Contattaci", "Registrati ora", "Sign up"

ALTER TABLE public.events
ADD COLUMN cta_text TEXT;

COMMENT ON COLUMN public.events.cta_text IS 'Custom call-to-action text for external registration button (e.g., "Contattaci", "Registrati")';
