import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface ReadReceipt {
  message_id: string;
  user_id: string;
  read_at: string;
}

export function useReadReceipts(conversationId: string | null, messageIds: string[]) {
  const { user } = useAuth();
  const [readReceipts, setReadReceipts] = useState<Map<string, ReadReceipt[]>>(new Map());

  const fetchReceipts = useCallback(async () => {
    if (!conversationId || messageIds.length === 0) return;

    const { data } = await supabase
      .from("message_read_receipts")
      .select("message_id, user_id, read_at")
      .in("message_id", messageIds);

    if (data) {
      const map = new Map<string, ReadReceipt[]>();
      for (const r of data as ReadReceipt[]) {
        const existing = map.get(r.message_id) || [];
        existing.push(r);
        map.set(r.message_id, existing);
      }
      setReadReceipts(map);
    }
  }, [conversationId, messageIds.join(",")]);

  useEffect(() => {
    fetchReceipts();
  }, [fetchReceipts]);

  // Realtime subscription for new read receipts
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`read-receipts:${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "message_read_receipts" },
        (payload) => {
          const receipt = payload.new as ReadReceipt;
          if (messageIds.includes(receipt.message_id)) {
            setReadReceipts((prev) => {
              const next = new Map(prev);
              const existing = next.get(receipt.message_id) || [];
              if (!existing.some((r) => r.user_id === receipt.user_id)) {
                next.set(receipt.message_id, [...existing, receipt]);
              }
              return next;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, messageIds.join(",")]);

  // Mark messages as read
  const markAsRead = useCallback(
    async (msgIds: string[]) => {
      if (!user || msgIds.length === 0) return;

      // Filter out messages already read by this user
      const unread = msgIds.filter((id) => {
        const receipts = readReceipts.get(id) || [];
        return !receipts.some((r) => r.user_id === user.id);
      });

      if (unread.length === 0) return;

      const rows = unread.map((message_id) => ({
        message_id,
        user_id: user.id,
      }));

      await supabase.from("message_read_receipts").upsert(rows, {
        onConflict: "message_id,user_id",
      });
    },
    [user, readReceipts]
  );

  // Check if a message has been read by anyone other than the sender
  const isRead = useCallback(
    (messageId: string, senderId: string) => {
      const receipts = readReceipts.get(messageId) || [];
      return receipts.some((r) => r.user_id !== senderId);
    },
    [readReceipts]
  );

  return { readReceipts, markAsRead, isRead };
}
