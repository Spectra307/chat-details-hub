import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useProfiles, createConversation, createGroupConversation, Profile } from "@/hooks/useChat";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Search, User, Users } from "lucide-react";

interface NewChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConversationCreated: (id: string) => void;
}

export default function NewChatDialog({ open, onOpenChange, onConversationCreated }: NewChatDialogProps) {
  const { user } = useAuth();
  const profiles = useProfiles();
  const [search, setSearch] = useState("");
  const [groupName, setGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const otherProfiles = profiles.filter((p) => p.user_id !== user?.id);
  const filtered = otherProfiles.filter(
    (p) =>
      p.username.toLowerCase().includes(search.toLowerCase()) ||
      (p.display_name || "").toLowerCase().includes(search.toLowerCase())
  );

  const handleDirectMessage = async (otherUserId: string) => {
    if (!user) return;
    setLoading(true);
    try {
      const convId = await createConversation(user.id, otherUserId);
      onConversationCreated(convId);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!user || !groupName.trim() || selectedMembers.length === 0) return;
    setLoading(true);
    try {
      const convId = await createGroupConversation(groupName, user.id, selectedMembers);
      onConversationCreated(convId);
      setGroupName("");
      setSelectedMembers([]);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const toggleMember = (userId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">New Conversation</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="direct" className="mt-2">
          <TabsList className="w-full">
            <TabsTrigger value="direct" className="flex-1 gap-1.5">
              <User className="h-4 w-4" /> Direct Message
            </TabsTrigger>
            <TabsTrigger value="group" className="flex-1 gap-1.5">
              <Users className="h-4 w-4" /> Group Chat
            </TabsTrigger>
          </TabsList>

          <div className="mt-4">
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search users..."
                className="pl-9"
              />
            </div>
          </div>

          <TabsContent value="direct" className="mt-0">
            <div className="max-h-60 overflow-y-auto space-y-1">
              {filtered.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">No users found</p>
              ) : (
                filtered.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleDirectMessage(p.user_id)}
                    disabled={loading}
                    className="flex w-full items-center gap-3 rounded-lg p-3 text-left hover:bg-muted transition-colors"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold">
                      {(p.display_name || p.username).charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{p.display_name || p.username}</p>
                      <p className="text-xs text-muted-foreground">@{p.username}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="group" className="mt-0">
            <div className="space-y-3">
              <div>
                <Label htmlFor="group-name">Group Name</Label>
                <Input
                  id="group-name"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="e.g., Project Team"
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Members ({selectedMembers.length} selected)</Label>
                <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
                  {filtered.map((p) => (
                    <label
                      key={p.id}
                      className="flex items-center gap-3 rounded-lg p-2 hover:bg-muted cursor-pointer transition-colors"
                    >
                      <Checkbox
                        checked={selectedMembers.includes(p.user_id)}
                        onCheckedChange={() => toggleMember(p.user_id)}
                      />
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                        {(p.display_name || p.username).charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm">{p.display_name || p.username}</span>
                    </label>
                  ))}
                </div>
              </div>

              <Button
                onClick={handleCreateGroup}
                disabled={loading || !groupName.trim() || selectedMembers.length === 0}
                className="w-full"
              >
                {loading ? "Creating..." : "Create Group"}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
