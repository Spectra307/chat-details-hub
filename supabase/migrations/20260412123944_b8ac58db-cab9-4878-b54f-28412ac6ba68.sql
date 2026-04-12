
-- Create a SECURITY DEFINER function to get conversation IDs for a user
CREATE OR REPLACE FUNCTION public.get_user_conversation_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT conversation_id FROM conversation_members WHERE user_id = auth.uid();
$$;

REVOKE EXECUTE ON FUNCTION public.get_user_conversation_ids FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_conversation_ids TO authenticated;

-- Drop old recursive policies on conversation_members
DROP POLICY IF EXISTS "Members can view conversation members" ON conversation_members;
DROP POLICY IF EXISTS "Members can add others to their conversations" ON conversation_members;

-- Recreate using the security definer function
CREATE POLICY "Members can view conversation members"
ON conversation_members FOR SELECT TO authenticated
USING (conversation_id IN (SELECT public.get_user_conversation_ids()));

CREATE POLICY "Members can add others to their conversations"
ON conversation_members FOR INSERT TO authenticated
WITH CHECK (conversation_id IN (SELECT public.get_user_conversation_ids()) OR user_id = auth.uid());

-- Also fix policies on conversations and messages that reference conversation_members
DROP POLICY IF EXISTS "Members can view their conversations" ON conversations;
DROP POLICY IF EXISTS "Members can update group conversations" ON conversations;

CREATE POLICY "Members can view their conversations"
ON conversations FOR SELECT TO authenticated
USING (id IN (SELECT public.get_user_conversation_ids()));

CREATE POLICY "Members can update group conversations"
ON conversations FOR UPDATE TO authenticated
USING (id IN (SELECT public.get_user_conversation_ids()));

DROP POLICY IF EXISTS "Members can view messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Members can send messages to their conversations" ON messages;

CREATE POLICY "Members can view messages in their conversations"
ON messages FOR SELECT TO authenticated
USING (conversation_id IN (SELECT public.get_user_conversation_ids()));

CREATE POLICY "Members can send messages to their conversations"
ON messages FOR INSERT TO authenticated
WITH CHECK (auth.uid() = sender_id AND conversation_id IN (SELECT public.get_user_conversation_ids()));
