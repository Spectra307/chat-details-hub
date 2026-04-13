
CREATE TABLE public.message_read_receipts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  read_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id)
);

ALTER TABLE public.message_read_receipts ENABLE ROW LEVEL SECURITY;

-- Users can view read receipts for messages in their conversations
CREATE POLICY "Members can view read receipts"
ON public.message_read_receipts FOR SELECT TO authenticated
USING (
  message_id IN (
    SELECT m.id FROM messages m
    WHERE m.conversation_id IN (SELECT public.get_user_conversation_ids())
  )
);

-- Users can insert their own read receipts
CREATE POLICY "Users can mark messages as read"
ON public.message_read_receipts FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE public.message_read_receipts;
