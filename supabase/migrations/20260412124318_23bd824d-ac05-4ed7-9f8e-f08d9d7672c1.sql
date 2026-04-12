
DROP POLICY IF EXISTS "Members can add others to their conversations" ON conversation_members;

CREATE POLICY "Members can add others to their conversations"
ON conversation_members FOR INSERT TO authenticated
WITH CHECK (
  conversation_id IN (SELECT public.get_user_conversation_ids())
  OR user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM conversations
    WHERE conversations.id = conversation_id
    AND conversations.created_by = auth.uid()
  )
);
