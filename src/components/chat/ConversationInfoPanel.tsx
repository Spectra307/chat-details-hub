import { X, Users, Mail, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Profile } from "@/hooks/useChat";

interface ConversationInfoPanelProps {
  conversationName: string;
  isGroup: boolean;
  members: Profile[];
  otherUserEmail?: string;
  onClose: () => void;
}

export default function ConversationInfoPanel({
  conversationName,
  isGroup,
  members,
  otherUserEmail,
  onClose,
}: ConversationInfoPanelProps) {
  return (
    <div className="flex h-full w-80 flex-col border-l bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-4">
        <h3 className="font-display font-semibold text-foreground">
          {isGroup ? "Group Info" : "Contact Info"}
        </h3>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Avatar & Name */}
      <div className="flex flex-col items-center gap-3 px-4 py-6 border-b">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-2xl">
          {isGroup ? (
            <Users className="h-8 w-8" />
          ) : (
            conversationName.charAt(0).toUpperCase()
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
              <div
                key={member.id}
                className="flex items-center gap-3 rounded-lg px-2 py-2"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold">
                  {member.display_name?.charAt(0).toUpperCase() ||
                    member.username?.charAt(0).toUpperCase() ||
                    "?"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {member.display_name || member.username}
                  </p>
                  {member.status && (
                    <p className="truncate text-xs text-muted-foreground">
                      {member.status}
                    </p>
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
