import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Profile {
  id: string;
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  status: string | null;
  last_seen: string | null;
  email: string | null;
}

export interface Conversation {
  id: string;
  name: string | null;
  is_group: boolean;
  created_by: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  last_message?: Message | null;
  members?: Profile[];
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: string;
  created_at: string;
  file_url?: string | null;
  file_name?: string | null;
  file_type?: string | null;
  sender?: Profile;
}

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => setProfile(data as Profile | null));
  }, [user]);

  return profile;
}

export function useProfiles() {
  const [profiles, setProfiles] = useState<Profile[]>([]);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("*")
      .then(({ data }) => setProfiles((data as Profile[]) || []));
  }, []);

  return profiles;
}

export function useConversations() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    if (!user) return;

    const { data: memberData } = await supabase
      .from("conversation_members")
      .select("conversation_id")
      .eq("user_id", user.id);

    if (!memberData?.length) {
      setConversations([]);
      setLoading(false);
      return;
    }

    const conversationIds = memberData.map((m: any) => m.conversation_id);

    const { data: convos } = await supabase
      .from("conversations")
      .select("*")
      .in("id", conversationIds)
      .order("updated_at", { ascending: false });

    if (!convos) {
      setConversations([]);
      setLoading(false);
      return;
    }

    // Fetch members for each conversation
    const { data: allMembers } = await supabase
      .from("conversation_members")
      .select("conversation_id, user_id")
      .in("conversation_id", conversationIds);

    const memberUserIds = [...new Set((allMembers || []).map((m: any) => m.user_id))];
    const { data: memberProfiles } = await supabase
      .from("profiles")
      .select("*")
      .in("user_id", memberUserIds);

    // Fetch last message for each conversation
    const enriched: Conversation[] = await Promise.all(
      convos.map(async (conv: any) => {
        const { data: lastMsg } = await supabase
          .from("messages")
          .select("*")
          .eq("conversation_id", conv.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const convMembers = (allMembers || [])
          .filter((m: any) => m.conversation_id === conv.id)
          .map((m: any) => (memberProfiles || []).find((p: any) => p.user_id === m.user_id))
          .filter(Boolean) as Profile[];

        return { ...conv, last_message: lastMsg as Message | null, members: convMembers };
      })
    );

    setConversations(enriched);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  return { conversations, loading, refetch: fetchConversations };
}

export function useMessages(conversationId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMessages = useCallback(async () => {
    if (!conversationId) return;
    setLoading(true);

    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    // Fetch sender profiles
    const senderIds = [...new Set((data || []).map((m: any) => m.sender_id))];
    const { data: senderProfiles } = await supabase
      .from("profiles")
      .select("*")
      .in("user_id", senderIds);

    const enriched = (data || []).map((msg: any) => ({
      ...msg,
      sender: (senderProfiles || []).find((p: any) => p.user_id === msg.sender_id) || null,
    }));

    setMessages(enriched as Message[]);
    setLoading(false);
  }, [conversationId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Real-time subscription
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        async (payload) => {
          const newMsg = payload.new as any;
          const { data: senderProfile } = await supabase
            .from("profiles")
            .select("*")
            .eq("user_id", newMsg.sender_id)
            .single();

          setMessages((prev) => [...prev, { ...newMsg, sender: senderProfile } as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  return { messages, loading, refetch: fetchMessages };
}

export async function sendMessage(
  conversationId: string,
  senderId: string,
  content: string,
  file?: { url: string; name: string; type: string }
) {
  const { error } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: senderId,
    content: content.trim() || (file ? file.name : ""),
    message_type: file ? "file" : "text",
    file_url: file?.url || null,
    file_name: file?.name || null,
    file_type: file?.type || null,
  });
  if (error) throw error;

  await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);
}

export async function uploadChatFile(conversationId: string, userId: string, file: File) {
  const ext = file.name.split(".").pop();
  const path = `${userId}/${conversationId}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage.from("chat-attachments").upload(path, file);
  if (error) throw error;

  const { data } = supabase.storage.from("chat-attachments").getPublicUrl(path);
  return { url: data.publicUrl, name: file.name, type: file.type };
}

export async function createConversation(currentUserId: string, otherUserId: string) {
  // Check if 1-on-1 conversation already exists
  const { data: myConvos } = await supabase
    .from("conversation_members")
    .select("conversation_id")
    .eq("user_id", currentUserId);

  const { data: theirConvos } = await supabase
    .from("conversation_members")
    .select("conversation_id")
    .eq("user_id", otherUserId);

  if (myConvos && theirConvos) {
    const myIds = new Set(myConvos.map((m: any) => m.conversation_id));
    const common = theirConvos.filter((m: any) => myIds.has(m.conversation_id));

    for (const c of common) {
      const { data: conv } = await supabase
        .from("conversations")
        .select("*")
        .eq("id", c.conversation_id)
        .eq("is_group", false)
        .single();
      if (conv) return conv.id;
    }
  }

  // Create new conversation
  const { data: conv, error } = await supabase
    .from("conversations")
    .insert({ is_group: false, created_by: currentUserId })
    .select()
    .single();

  if (error) throw error;

  // Add current user first, then other user
  await supabase.from("conversation_members").insert({
    conversation_id: conv.id, user_id: currentUserId,
  });
  await supabase.from("conversation_members").insert({
    conversation_id: conv.id, user_id: otherUserId,
  });

  return conv.id;
}

export async function createGroupConversation(name: string, currentUserId: string, memberIds: string[]) {
  const { data: conv, error } = await supabase
    .from("conversations")
    .insert({ name, is_group: true, created_by: currentUserId })
    .select()
    .single();

  if (error) throw error;

  const members = [currentUserId, ...memberIds].map((userId) => ({
    conversation_id: conv.id,
    user_id: userId,
  }));

  await supabase.from("conversation_members").insert(members);

  return conv.id;
}
