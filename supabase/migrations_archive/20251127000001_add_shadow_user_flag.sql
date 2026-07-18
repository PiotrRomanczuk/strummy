-- Add is_shadow column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN is_shadow boolean DEFAULT false;

-- Comment on column
COMMENT ON COLUMN public.profiles.is_shadow IS 'Flag to identify students created by teachers without real email addresses';
