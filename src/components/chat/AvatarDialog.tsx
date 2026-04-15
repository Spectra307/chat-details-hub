import { useRef, useState } from "react";
import { Camera, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface AvatarDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  avatarUrl: string | null;
  /** "profile" = user's own pic, "group" = group avatar */
  type: "profile" | "group";
  /** Required for group avatars */
  conversationId?: string;
  /** Display name shown in the dialog */
  displayName: string;
  onAvatarUpdated?: (newUrl: string | null) => void;
}

export default function AvatarDialog({
  open,
  onOpenChange,
  avatarUrl,
  type,
  conversationId,
  displayName,
  onAvatarUpdated,
}: AvatarDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [currentAvatar, setCurrentAvatar] = useState<string | null>(avatarUrl);

  // Sync prop changes
  useState(() => {
    setCurrentAvatar(avatarUrl);
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

      if (type === "group" && conversationId) {
        const path = `groups/${conversationId}/${timestamp}.${ext}`;
        const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
        if (error) throw error;
        const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
        await supabase.from("conversations").update({ avatar_url: urlData.publicUrl }).eq("id", conversationId);
        setCurrentAvatar(urlData.publicUrl);
        onAvatarUpdated?.(urlData.publicUrl);
      } else {
        const path = `${user.id}/${timestamp}.${ext}`;
        const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
        if (error) throw error;
        const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
        await supabase.from("profiles").update({ avatar_url: urlData.publicUrl }).eq("user_id", user.id);
        setCurrentAvatar(urlData.publicUrl);
        onAvatarUpdated?.(urlData.publicUrl);
      }
      toast({ title: "Avatar updated!" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleRemove = async () => {
    if (!user) return;
    setRemoving(true);
    try {
      if (type === "group" && conversationId) {
        await supabase.from("conversations").update({ avatar_url: null }).eq("id", conversationId);
      } else {
        await supabase.from("profiles").update({ avatar_url: null }).eq("user_id", user.id);
      }
      setCurrentAvatar(null);
      onAvatarUpdated?.(null);
      toast({ title: "Avatar removed" });
    } catch (err: any) {
      toast({ title: "Remove failed", description: err.message, variant: "destructive" });
    } finally {
      setRemoving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="image/*"
          onChange={handleUpload}
        />
        <DialogHeader>
          <DialogTitle className="font-display text-center">
            {displayName}
          </DialogTitle>
        </DialogHeader>

        {/* Avatar preview */}
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="flex h-40 w-40 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-5xl overflow-hidden">
            {currentAvatar ? (
              <img src={currentAvatar} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              displayName.charAt(0).toUpperCase()
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || removing}
              className="gap-2"
            >
              {uploading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              ) : (
                <Camera className="h-4 w-4" />
              )}
              {currentAvatar ? "Change Photo" : "Upload Photo"}
            </Button>
            {currentAvatar && (
              <Button
                variant="destructive"
                onClick={handleRemove}
                disabled={uploading || removing}
                className="gap-2"
              >
                {removing ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Remove
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
