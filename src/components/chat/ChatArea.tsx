import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useMessages, sendMessage, Message, Profile } from "@/hooks/useChat";
import { Send, Smile } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import ConversationInfoPanel from "./ConversationInfoPanel";

interface ChatAreaProps {
  conversationId: string | null;
  conversationName: string;
  isGroup: boolean;
  members?: Profile[];
}

function formatMessageTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDateDivider(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
}

function shouldShowDateDivider(messages: Message[], index: number): boolean {
  if (index === 0) return true;
  const curr = new Date(messages[index].created_at).toDateString();
  const prev = new Date(messages[index - 1].created_at).toDateString();
  return curr !== prev;
}

export default function ChatArea({ conversationId, conversationName, isGroup, members = [] }: ChatAreaProps) {
  const { user } = useAuth();
  const { messages, loading } = useMessages(conversationId);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || !conversationId || !user) return;
    setSending(true);
    try {
      await sendMessage(conversationId, user.id, newMessage);
      setNewMessage("");
      inputRef.current?.focus();
    } catch (error: any) {
      toast({ title: "Failed to send", description: error.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!conversationId) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-background">
        <div className="text-center animate-fade-in">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
            <Send className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-display font-semibold text-foreground">Welcome to ChatFlow</h2>
          <p className="mt-2 text-sm text-muted-foreground">Select a conversation or start a new one</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 bg-background">
      <div className="flex flex-1 flex-col">
      {/* Header */}
      <div
        className="flex items-center gap-3 border-b px-6 py-4 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setShowInfo((v) => !v)}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
          {conversationName.charAt(0).toUpperCase()}
        </div>
        <div>
          <h2 className="font-display font-semibold text-foreground">{conversationName}</h2>
          {isGroup && <p className="text-xs text-muted-foreground">Group chat</p>}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
            No messages yet. Say hello! 👋
          </div>
        ) : (
          messages.map((msg, i) => {
            const isOwn = msg.sender_id === user?.id;
            const showDivider = shouldShowDateDivider(messages, i);

            return (
              <div key={msg.id}>
                {showDivider && (
                  <div className="my-4 flex items-center gap-4">
                    <div className="flex-1 border-t" />
                    <span className="text-xs text-muted-foreground font-medium">
                      {formatDateDivider(msg.created_at)}
                    </span>
                    <div className="flex-1 border-t" />
                  </div>
                )}
                <div className={`mb-3 flex animate-message-in ${isOwn ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[70%] ${isOwn ? "items-end" : "items-start"}`}>
                    {!isOwn && isGroup && msg.sender && (
                      <p className="mb-1 text-xs font-medium text-muted-foreground ml-3">
                        {msg.sender.display_name || msg.sender.username}
                      </p>
                    )}
                    <div
                      className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                        isOwn
                          ? "bg-chat-own text-chat-own-foreground rounded-br-md"
                          : "bg-chat-other text-chat-other-foreground rounded-bl-md"
                      }`}
                    >
                      {msg.content}
                    </div>
                    <p className={`mt-1 text-[10px] text-muted-foreground ${isOwn ? "text-right mr-1" : "ml-3"}`}>
                      {formatMessageTime(msg.created_at)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t p-4">
        <div className="flex items-end gap-2 rounded-2xl border bg-card p-2">
          <textarea
            ref={inputRef}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            className="flex-1 resize-none bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            style={{ maxHeight: "120px" }}
          />
          <Button
            onClick={handleSend}
            disabled={!newMessage.trim() || sending}
            size="icon"
            className="h-9 w-9 shrink-0 rounded-xl"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
      </div>

      {showInfo && (
        <ConversationInfoPanel
          conversationName={conversationName}
          isGroup={isGroup}
          members={isGroup ? members : members.filter((m) => m.user_id !== user?.id)}
          onClose={() => setShowInfo(false)}
        />
      )}
    </div>
  );
}
