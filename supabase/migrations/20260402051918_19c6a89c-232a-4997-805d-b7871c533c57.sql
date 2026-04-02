-- Block INSERT on pro_subscriptions from authenticated users
CREATE POLICY "No direct inserts on pro_subscriptions"
ON public.pro_subscriptions
FOR INSERT TO authenticated
WITH CHECK (false);

-- Block UPDATE on pro_subscriptions from authenticated users
CREATE POLICY "No direct updates on pro_subscriptions"
ON public.pro_subscriptions
FOR UPDATE TO authenticated
USING (false)
WITH CHECK (false);

-- Block DELETE on pro_subscriptions from authenticated users
CREATE POLICY "No direct deletes on pro_subscriptions"
ON public.pro_subscriptions
FOR DELETE TO authenticated
USING (false);

-- Add CHECK constraint on pro_chat_messages role column
ALTER TABLE public.pro_chat_messages
ADD CONSTRAINT chk_chat_role CHECK (role IN ('user', 'assistant', 'system'));