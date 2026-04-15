import { useAuth } from "@/contexts/AuthContext";
import { useConversations, Conversation, Profile } from "@/hooks/useChat";
import { useProfile } from "@/hooks/useChat";
import { Search, Plus, LogOut, MessageCircle, Users } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import NewChatDialog from "./NewChatDialog";
import AvatarDialog from "./AvatarDialog";

interface ChatSidebarProps {
  selectedConversation: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
}

function getConversationDisplayName(conv: Conversation, currentUserId: string): string {
  if (conv.is_group && conv.name) return conv.name;
  const otherMember = conv.members?.find((m) => m.user_id !== currentUserId);
  return otherMember?.display_name || otherMember?.username || "Unknown";
}

function getConversationAvatar(conv: Conversation, currentUserId: string): string | null {
  if (conv.is_group) return conv.avatar_url || null;
  const otherMember = conv.members?.find((m) => m.user_id !== currentUserId);
  return otherMember?.avatar_url || null;
}

function getConversationAvatarInitial(conv: Conversation, currentUserId: string): string {
  if (conv.is_group) return conv.name?.charAt(0).toUpperCase() || "G";
  const otherMember = conv.members?.find((m) => m.user_id !== currentUserId);
  return otherMember?.display_name?.charAt(0).toUpperCase() || otherMember?.username?.charAt(0).toUpperCase() || "?";
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const oneDay = 86400000;

  if (diff < oneDay) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  if (diff < oneDay * 7) {
    return date.toLocaleDateString([], { weekday: "short" });
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function ChatSidebar({ selectedConversation, onSelectConversation, onNewChat }: ChatSidebarProps) {
  const { user, signOut } = useAuth();
  const profile = useProfile();
  const { conversations, loading } = useConversations();
  const [search, setSearch] = useState("");
  const [showNewChat, setShowNewChat] = useState(false);
  const [showAvatarDialog, setShowAvatarDialog] = useState(false);
  const [localAvatar, setLocalAvatar] = useState<string | null>(null);

  const currentAvatar = localAvatar || profile?.avatar_url || null;

  const filtered = conversations.filter((c) => {
    if (!search) return true;
    const name = getConversationDisplayName(c, user?.id || "");
    return name.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="flex h-full w-72 flex-col bg-sidebar text-sidebar-foreground">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-5">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-6 w-6 text-sidebar-accent" />
          <h1 className="text-lg font-display font-bold">ChatFlow</h1>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-muted"
          onClick={() => setShowNewChat(true)}
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>

      {/* Search */}
      <div className="px-3 pb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sidebar-foreground/40" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations..."
            className="border-sidebar-muted bg-sidebar-muted pl-9 text-sidebar-foreground placeholder:text-sidebar-foreground/40 focus-visible:ring-sidebar-accent"
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-2">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-sidebar-accent border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-sidebar-foreground/50">
            {search ? "No conversations found" : "No conversations yet. Start a new chat!"}
          </div>
        ) : (
          filtered.map((conv) => {
            const isSelected = selectedConversation === conv.id;
            const displayName = getConversationDisplayName(conv, user?.id || "");
            const avatarUrl = getConversationAvatar(conv, user?.id || "");
            const avatarInitial = getConversationAvatarInitial(conv, user?.id || "");

            return (
              <button
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors mb-0.5 ${
                  isSelected
                    ? "bg-sidebar-muted text-sidebar-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-muted/50"
                }`}
              >
                <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sidebar-accent/20 text-sidebar-accent font-semibold text-sm overflow-hidden">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : conv.is_group ? (
                    <Users className="h-4 w-4" />
                  ) : (
                    avatarInitial
                  )}
                  {!conv.is_group && (() => {
                    const otherMember = conv.members?.find((m) => m.user_id !== user?.id);
                    const isOnline = otherMember?.status === "online";
                    return (
                      <span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-sidebar ${isOnline ? "bg-green-500" : "bg-muted-foreground/40"}`} />
                    );
                  })()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="truncate text-sm font-medium">{displayName}</span>
                    {conv.last_message && (
                      <span className="ml-2 text-xs text-sidebar-foreground/40">
                        {formatTime(conv.last_message.created_at)}
                      </span>
                    )}
                  </div>
                  {conv.last_message && (
                    <p className="truncate text-xs text-sidebar-foreground/50 mt-0.5">
                      {conv.last_message.content}
                    </p>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* User Profile */}
      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3">
          <div
            className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-primary-foreground font-semibold text-sm cursor-pointer overflow-hidden"
            onClick={() => setShowAvatarDialog(true)}
          >
            {currentAvatar ? (
              <img src={currentAvatar} alt="" className="h-full w-full object-cover" />
            ) : (
              profile?.display_name?.charAt(0).toUpperCase() || profile?.username?.charAt(0).toUpperCase() || "?"
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{profile?.display_name || profile?.username}</p>
            <p className="truncate text-xs text-sidebar-foreground/50">{user?.email}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-muted"
            onClick={signOut}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <AvatarDialog
        open={showAvatarDialog}
        onOpenChange={setShowAvatarDialog}
        avatarUrl={currentAvatar}
        type="profile"
        displayName={profile?.display_name || profile?.username || "You"}
        onAvatarUpdated={(url) => setLocalAvatar(url)}
      />

      <NewChatDialog
        open={showNewChat}
        onOpenChange={setShowNewChat}
        onConversationCreated={(id) => {
          setShowNewChat(false);
          onSelectConversation(id);
        }}
      />
    </div>
  );
}
