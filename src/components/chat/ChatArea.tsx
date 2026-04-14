import { useState, useRef, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useMessages, sendMessage, uploadChatFile, Message, Profile } from "@/hooks/useChat";
import { Send, Check, CheckCheck, Paperclip, X, FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { useReadReceipts } from "@/hooks/useReadReceipts";
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
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { typingUsers, handleTyping, stopTyping } = useTypingIndicator(conversationId);

  const messageIds = useMemo(() => messages.map((m) => m.id), [messages]);
  const { markAsRead, isRead } = useReadReceipts(conversationId, messageIds);

  // Mark incoming messages as read when they appear
  useEffect(() => {
    if (!user || messages.length === 0) return;
    const otherMsgIds = messages
      .filter((m) => m.sender_id !== user.id)
      .map((m) => m.id);
    if (otherMsgIds.length > 0) {
      markAsRead(otherMsgIds);
    }
  }, [messages, user, markAsRead]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max file size is 10MB", variant: "destructive" });
      return;
    }
    setPendingFile(file);
    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setPendingPreview(url);
    } else {
      setPendingPreview(null);
    }
    e.target.value = "";
  };

  const clearPendingFile = () => {
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    setPendingFile(null);
    setPendingPreview(null);
  };

  const handleSend = async () => {
    if ((!newMessage.trim() && !pendingFile) || !conversationId || !user) return;
    setSending(true);
    stopTyping();
    try {
      let fileData: { url: string; name: string; type: string } | undefined;
      if (pendingFile) {
        setUploading(true);
        fileData = await uploadChatFile(conversationId, user.id, pendingFile);
        setUploading(false);
      }
      await sendMessage(conversationId, user.id, newMessage, fileData);
      setNewMessage("");
      clearPendingFile();
      inputRef.current?.focus();
    } catch (error: any) {
      setUploading(false);
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
                      {msg.file_url && msg.file_type?.startsWith("image/") ? (
                        <a href={msg.file_url} target="_blank" rel="noopener noreferrer">
                          <img
                            src={msg.file_url}
                            alt={msg.file_name || "Image"}
                            className="max-w-[260px] rounded-xl mb-1"
                            loading="lazy"
                          />
                        </a>
                      ) : msg.file_url ? (
                        <a
                          href={msg.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 py-1"
                        >
                          <FileText className="h-5 w-5 shrink-0" />
                          <span className="truncate underline">{msg.file_name || "File"}</span>
                          <Download className="h-4 w-4 shrink-0 ml-auto" />
                        </a>
                      ) : null}
                      {msg.content && !(msg.file_url && msg.content === msg.file_name) && (
                        <span>{msg.content}</span>
                      )}
                    </div>
                    <div className={`mt-1 flex items-center gap-1 ${isOwn ? "justify-end mr-1" : "ml-3"}`}>
                      <span className="text-[10px] text-muted-foreground">
                        {formatMessageTime(msg.created_at)}
                      </span>
                      {isOwn && (
                        isRead(msg.id, msg.sender_id) ? (
                          <CheckCheck className="h-3.5 w-3.5 text-primary" />
                        ) : (
                          <Check className="h-3.5 w-3.5 text-muted-foreground" />
                        )
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing indicator */}
      {typingUsers.length > 0 && (
        <div className="px-6 py-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="flex gap-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:0ms]" />
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]" />
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]" />
            </div>
            <span>
              {typingUsers.map((u) => u.displayName).join(", ")}{" "}
              {typingUsers.length === 1 ? "is" : "are"} typing…
            </span>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t p-4">
        <div className="flex items-end gap-2 rounded-2xl border bg-card p-2">
          <textarea
            ref={inputRef}
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              handleTyping();
            }}
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
          otherUserEmail={!isGroup ? members.find((m) => m.user_id !== user?.id)?.email || undefined : undefined}
          onClose={() => setShowInfo(false)}
        />
      )}
    </div>
  );
}
