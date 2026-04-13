import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useConversations } from "@/hooks/useChat";
import ChatSidebar from "@/components/chat/ChatSidebar";
import ChatArea from "@/components/chat/ChatArea";

export default function ChatPage() {
  const { user } = useAuth();
  const { conversations } = useConversations();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);

  const selectedConv = conversations.find((c) => c.id === selectedConversation);

  const getConversationName = () => {
    if (!selectedConv) return "";
    if (selectedConv.is_group && selectedConv.name) return selectedConv.name;
    const other = selectedConv.members?.find((m) => m.user_id !== user?.id);
    return other?.display_name || other?.username || "Unknown";
  };

  return (
    <div className="flex h-screen w-full">
      <ChatSidebar
        selectedConversation={selectedConversation}
        onSelectConversation={setSelectedConversation}
        onNewChat={() => {}}
      />
      <ChatArea
        conversationId={selectedConversation}
        conversationName={getConversationName()}
        isGroup={selectedConv?.is_group || false}
        members={selectedConv?.members || []}
      />
    </div>
  );
}
