
-- Fix 1: Drop the overly permissive INSERT policy that allows paywall bypass
DROP POLICY IF EXISTS "Users can insert own subscriptions" ON public.pro_subscriptions;

-- Fix 2: Create dubbing_jobs table for IDOR prevention
CREATE TABLE IF NOT EXISTS public.dubbing_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  dubbing_id text NOT NULL,
  target_lang text NOT NULL DEFAULT 'hi',
  source_lang text NOT NULL DEFAULT 'en',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.dubbing_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own dubbing jobs"
  ON public.dubbing_jobs
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
