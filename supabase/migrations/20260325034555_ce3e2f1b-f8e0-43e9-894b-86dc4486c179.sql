-- Chat messages table for Pro real-time conversations
CREATE TABLE public.pro_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'user',
  content text NOT NULL,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pro_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own chat messages"
  ON public.pro_chat_messages
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.pro_chat_messages;

-- Storage bucket for chat image uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-uploads', 'chat-uploads', true);

CREATE POLICY "Authenticated users can upload chat images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'chat-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Anyone can view chat images"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'chat-uploads');

CREATE POLICY "Users can delete own chat images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'chat-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);