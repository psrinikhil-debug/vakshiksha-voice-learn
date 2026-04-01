-- Make chat-uploads bucket private
UPDATE storage.buckets SET public = false WHERE id = 'chat-uploads';

-- Drop the public SELECT policy
DROP POLICY IF EXISTS "Anyone can view chat images" ON storage.objects;

-- Add authenticated-only read policy scoped to own files
CREATE POLICY "Users can view own chat images"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'chat-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);