
DROP POLICY "Anyone can view chat attachments" ON storage.objects;

CREATE POLICY "Authenticated users can view chat attachments"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'chat-attachments');
