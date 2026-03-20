-- Table to track pro subscriptions
CREATE TABLE public.pro_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  razorpay_payment_id text,
  razorpay_order_id text,
  razorpay_signature text,
  amount integer NOT NULL DEFAULT 20000,
  status text NOT NULL DEFAULT 'active',
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pro_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own subscriptions"
  ON public.pro_subscriptions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscriptions"
  ON public.pro_subscriptions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Voice clones table
CREATE TABLE public.voice_clones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  elevenlabs_voice_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.voice_clones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own voice clones"
  ON public.voice_clones FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);