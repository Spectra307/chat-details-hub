DROP POLICY "Authenticated users can add members" ON public.conversation_members;
CREATE POLICY "Members can add others to their conversations" ON public.conversation_members FOR INSERT TO authenticated
WITH CHECK (
  conversation_id IN (SELECT conversation_id FROM public.conversation_members WHERE user_id = auth.uid())
  OR user_id = auth.uid()
);