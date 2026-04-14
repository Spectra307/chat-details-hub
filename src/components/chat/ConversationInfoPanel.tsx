import { useRef, useState } from "react";
import { X, Users, Mail, Clock, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Profile } from "@/hooks/useChat";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface ConversationInfoPanelProps {
  conversationName: string;
  isGroup: boolean;
  members: Profile[];
  otherUserEmail?: string;
  conversationId?: string;
  avatarUrl?: string | null;
  onClose: () => void;
  onAvatarUpdated?: () => void;
}

export default function ConversationInfoPanel({
  conversationName,
  isGroup,
  members,
  otherUserEmail,
  conversationId,
  avatarUrl,
  onClose,
  onAvatarUpdated,
}: ConversationInfoPanelProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [currentAvatar, setCurrentAvatar] = useState(avatarUrl);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please select an image", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 5MB", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const timestamp = Date.now();

      if (isGroup && conversationId) {
        // Group avatar: store under groups/{conversationId}
        const path = `groups/${conversationId}/${timestamp}.${ext}`;
        const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
        if (error) throw error;
        const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
        await supabase.from("conversations").update({ avatar_url: urlData.publicUrl }).eq("id", conversationId);
        setCurrentAvatar(urlData.publicUrl);
      } else {
        // User avatar: store under {userId}/
        const path = `${user.id}/${timestamp}.${ext}`;
        const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
        if (error) throw error;
        const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
        await supabase.from("profiles").update({ avatar_url: urlData.publicUrl }).eq("user_id", user.id);
        setCurrentAvatar(urlData.publicUrl);
      }

      toast({ title: "Avatar updated!" });
      onAvatarUpdated?.();
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  // For 1-on-1, the "other" member's avatar
  const displayAvatar = isGroup
    ? currentAvatar
    : (members[0]?.avatar_url || currentAvatar);

  // Can current user change the avatar?
  const canChangeAvatar = isGroup
    ? true // any group member can change
    : members.length > 0 && members[0]?.user_id === user?.id; // only in own profile — but this panel shows the OTHER user. Let's allow changing own profile from sidebar instead.
  // Actually for 1-on-1, we show the other user — no one should change their pic. Users change their OWN pic.
  // So we need a different approach: show a "change your profile pic" option separately.
  // For now: group members can change group pic. For 1-on-1, no avatar change here.

  return (
    <div className="flex h-full w-80 flex-col border-l bg-card">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="image/*"
        onChange={handleAvatarUpload}
      />

      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-4">
        <h3 className="font-display font-semibold text-foreground">
          {isGroup ? "Group Info" : "Contact Info"}
        </h3>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Avatar & Name */}
      <div className="flex flex-col items-center gap-3 px-4 py-6 border-b">
        <div
          className={`relative flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-2xl overflow-hidden ${isGroup ? "cursor-pointer group" : ""}`}
          onClick={() => isGroup && fileInputRef.current?.click()}
        >
          {displayAvatar ? (
            <img src={displayAvatar} alt="Avatar" className="h-full w-full object-cover" />
          ) : isGroup ? (
            <Users className="h-8 w-8" />
          ) : (
            conversationName.charAt(0).toUpperCase()
          )}
          {isGroup && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
              {uploading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Camera className="h-5 w-5 text-white" />
              )}
            </div>
          )}
        </div>
        <h2 className="font-display text-lg font-semibold text-foreground">
          {conversationName}
        </h2>
        {isGroup && (
          <p className="text-xs text-muted-foreground">
            {members.length} member{members.length !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      {/* Members list */}
      {isGroup && members.length > 0 && (
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Members
          </h4>
          <div className="space-y-2">
            {members.map((member) => (
              <div key={member.id} className="flex items-center gap-3 rounded-lg px-2 py-2">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold overflow-hidden">
                  {member.avatar_url ? (
                    <img src={member.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    member.display_name?.charAt(0).toUpperCase() ||
                    member.username?.charAt(0).toUpperCase() ||
                    "?"
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {member.display_name || member.username}
                  </p>
                  {member.status && (
                    <p className="truncate text-xs text-muted-foreground">{member.status}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* For 1-on-1: show the other user's details */}
      {!isGroup && members.length > 0 && (
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {members[0] && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm font-medium text-foreground">
                    {otherUserEmail || "Not available"}
                  </p>
                </div>
              </div>
              {members[0].last_seen && (
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Last seen</p>
                    <p className="text-sm font-medium text-foreground">
                      {new Date(members[0].last_seen).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
