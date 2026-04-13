import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useChat";

interface TypingUser {
  userId: string;
  displayName: string;
}

export function useTypingIndicator(conversationId: string | null) {
  const { user } = useAuth();
  const profile = useProfile();
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const timeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!conversationId || !user) return;

    const channel = supabase.channel(`typing:${conversationId}`);
    channelRef.current = channel;

    channel
      .on("broadcast", { event: "typing" }, (payload) => {
        const { userId, displayName, isTyping } = payload.payload as {
          userId: string;
          displayName: string;
          isTyping: boolean;
        };

        if (userId === user.id) return;

        if (isTyping) {
          setTypingUsers((prev) => {
            if (prev.some((u) => u.userId === userId)) return prev;
            return [...prev, { userId, displayName }];
          });

          // Clear existing timeout for this user
          const existing = timeoutsRef.current.get(userId);
          if (existing) clearTimeout(existing);

          // Auto-remove after 3s if no new typing event
          const timeout = setTimeout(() => {
            setTypingUsers((prev) => prev.filter((u) => u.userId !== userId));
            timeoutsRef.current.delete(userId);
          }, 3000);
          timeoutsRef.current.set(userId, timeout);
        } else {
          setTypingUsers((prev) => prev.filter((u) => u.userId !== userId));
          const existing = timeoutsRef.current.get(userId);
          if (existing) {
            clearTimeout(existing);
            timeoutsRef.current.delete(userId);
          }
        }
      })
      .subscribe();

    return () => {
      timeoutsRef.current.forEach((t) => clearTimeout(t));
      timeoutsRef.current.clear();
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [conversationId, user]);

  const sendTyping = useCallback(
    (isTyping: boolean) => {
      if (!channelRef.current || !user || !profile) return;

      channelRef.current.send({
        type: "broadcast",
        event: "typing",
        payload: {
          userId: user.id,
          displayName: profile.display_name || profile.username,
          isTyping,
        },
      });
    },
    [user, profile]
  );

  const handleTyping = useCallback(() => {
    sendTyping(true);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      sendTyping(false);
    }, 2000);
  }, [sendTyping]);

  const stopTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    sendTyping(false);
  }, [sendTyping]);

  return { typingUsers, handleTyping, stopTyping };
}
