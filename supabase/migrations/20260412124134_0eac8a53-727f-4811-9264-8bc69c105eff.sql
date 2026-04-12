
DROP POLICY IF EXISTS "Members can view their conversations" ON conversations;

CREATE POLICY "Members can view their conversations"
ON conversations FOR SELECT TO authenticated
USING (
  id IN (SELECT public.get_user_conversation_ids())
  OR created_by = auth.uid()
);
