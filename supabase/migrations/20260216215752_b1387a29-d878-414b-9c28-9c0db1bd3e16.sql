
-- Add result_count and source columns to translation_logs
ALTER TABLE public.translation_logs
  ADD COLUMN IF NOT EXISTS result_count integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'ai';

-- Create role enum and user_roles table
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (avoids recursive RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Admins can read their own role
CREATE POLICY "Users can view own roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow admins to read all translation_logs
CREATE POLICY "Admins can read translation logs"
  ON public.translation_logs
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to read all analytics_events
CREATE POLICY "Admins can read analytics events"
  ON public.analytics_events
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
