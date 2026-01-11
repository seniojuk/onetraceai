import { useState } from "react";
import { 
  Users,
  UserPlus,
  Crown,
  Shield,
  User,
  Eye,
  Trash2,
  Loader2,
  Mail,
  AlertTriangle,
  ArrowRightLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { 
  useWorkspaceMembers, 
  useUpdateMemberRole, 
  useRemoveMember,
  useInviteMember,
  useTransferOwnership,
  type WorkspaceMember,
} from "@/hooks/useWorkspaces";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";

const roleIcons: Record<string, React.ElementType> = {
  OWNER: Crown,
  ADMIN: Shield,
  MEMBER: User,
  VIEWER: Eye,
};

const roleColors: Record<string, string> = {
  OWNER: "text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30",
  ADMIN: "text-purple-600 bg-purple-100 dark:bg-purple-900/30",
  MEMBER: "text-blue-600 bg-blue-100 dark:bg-blue-900/30",
  VIEWER: "text-gray-600 bg-gray-100 dark:bg-gray-900/30",
};

const roleDescriptions: Record<string, string> = {
  OWNER: "Full control including deleting workspace",
  ADMIN: "Can manage members and settings",
  MEMBER: "Can create and edit content",
  VIEWER: "Read-only access",
};

interface MemberManagementProps {
  workspaceId: string;
  workspaceName: string;
  userRole: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER" | null;
}

type MemberWithProfile = WorkspaceMember & {
  profile: { id: string; display_name: string | null; avatar_url: string | null } | null;
};

export function MemberManagement({ workspaceId, workspaceName, userRole }: MemberManagementProps) {
  const { user } = useAuth();
  const { data: members, isLoading } = useWorkspaceMembers(workspaceId);
  const updateRole = useUpdateMemberRole();
  const removeMember = useRemoveMember();
  const inviteMember = useInviteMember();
  const transferOwnership = useTransferOwnership();

  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"ADMIN" | "MEMBER" | "VIEWER">("MEMBER");
  const [removeMemberConfirm, setRemoveMemberConfirm] = useState<MemberWithProfile | null>(null);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [selectedNewOwner, setSelectedNewOwner] = useState<string>("");

  const canManageMembers = userRole === "OWNER" || userRole === "ADMIN";
  const isOwner = userRole === "OWNER";

  // Get eligible members for ownership transfer (all non-owners)
  const eligibleForTransfer = members?.filter(m => m.user_id !== user?.id) || [];

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      toast.error("Please enter an email address");
      return;
    }

    try {
      await inviteMember.mutateAsync({
        workspaceId,
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      toast.success(`Invited ${inviteEmail} as ${inviteRole}`);
      setInviteDialogOpen(false);
      setInviteEmail("");
      setInviteRole("MEMBER");
    } catch (error) {
      toast.error("Failed to invite member", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const handleRoleChange = async (member: MemberWithProfile, newRole: string) => {
    if (member.role === newRole) return;
    
    try {
      await updateRole.mutateAsync({
        workspaceId,
        userId: member.user_id,
        role: newRole as "OWNER" | "ADMIN" | "MEMBER" | "VIEWER",
      });
      toast.success(`Updated role to ${newRole}`);
    } catch (error) {
      toast.error("Failed to update role", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const handleRemove = async () => {
    if (!removeMemberConfirm) return;
    
    try {
      await removeMember.mutateAsync({
        workspaceId,
        userId: removeMemberConfirm.user_id,
      });
      toast.success("Member removed from workspace");
      setRemoveMemberConfirm(null);
    } catch (error) {
      toast.error("Failed to remove member", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const handleTransferOwnership = async () => {
    if (!selectedNewOwner) {
      toast.error("Please select a new owner");
      return;
    }

    try {
      await transferOwnership.mutateAsync({
        workspaceId,
        newOwnerId: selectedNewOwner,
      });
      toast.success("Ownership transferred successfully", {
        description: "You are now an Admin of this workspace",
      });
      setTransferDialogOpen(false);
      setSelectedNewOwner("");
    } catch (error) {
      toast.error("Failed to transfer ownership", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>Manage workspace members</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-8 w-24" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-accent" />
                Team Members
              </CardTitle>
              <CardDescription>
                {canManageMembers 
                  ? "Manage members of this workspace"
                  : "View members of this workspace"}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {isOwner && eligibleForTransfer.length > 0 && (
                <Button 
                  variant="outline" 
                  onClick={() => setTransferDialogOpen(true)} 
                  className="gap-2"
                >
                  <ArrowRightLeft className="w-4 h-4" />
                  Transfer Ownership
                </Button>
              )}
              {canManageMembers && (
                <Button onClick={() => setInviteDialogOpen(true)} className="gap-2">
                  <UserPlus className="w-4 h-4" />
                  Invite Member
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!members?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No members found</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-2">
                {members.map((member) => {
                  const RoleIcon = roleIcons[member.role] || User;
                  const isCurrentUser = member.user_id === user?.id;
                  const canEditThisMember = canManageMembers && !isCurrentUser && 
                    (isOwner || (member.role !== "OWNER" && member.role !== "ADMIN"));

                  return (
                    <div
                      key={member.user_id}
                      className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors"
                    >
                      <Avatar>
                        <AvatarImage src={member.profile?.avatar_url || undefined} />
                        <AvatarFallback className="bg-accent/10 text-accent">
                          {getInitials(member.profile?.display_name)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">
                            {member.profile?.display_name || "Unknown User"}
                          </span>
                          {isCurrentUser && (
                            <Badge variant="outline" className="text-xs">You</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {member.invited_at && (
                            <span>
                              Joined {formatDistanceToNow(new Date(member.invited_at), { addSuffix: true })}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {canEditThisMember ? (
                          <Select
                            value={member.role}
                            onValueChange={(value) => handleRoleChange(member, value)}
                            disabled={updateRole.isPending}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {isOwner && (
                                <SelectItem value="OWNER">
                                  <div className="flex items-center gap-2">
                                    <Crown className="w-4 h-4 text-yellow-600" />
                                    Owner
                                  </div>
                                </SelectItem>
                              )}
                              <SelectItem value="ADMIN">
                                <div className="flex items-center gap-2">
                                  <Shield className="w-4 h-4 text-purple-600" />
                                  Admin
                                </div>
                              </SelectItem>
                              <SelectItem value="MEMBER">
                                <div className="flex items-center gap-2">
                                  <User className="w-4 h-4 text-blue-600" />
                                  Member
                                </div>
                              </SelectItem>
                              <SelectItem value="VIEWER">
                                <div className="flex items-center gap-2">
                                  <Eye className="w-4 h-4 text-gray-600" />
                                  Viewer
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge 
                            variant="secondary" 
                            className={`${roleColors[member.role] || ""} gap-1`}
                          >
                            <RoleIcon className="w-3 h-3" />
                            {member.role}
                          </Badge>
                        )}

                        {canEditThisMember && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setRemoveMemberConfirm(member)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Invite Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-accent" />
              Invite Member
            </DialogTitle>
            <DialogDescription>
              Invite a new member to {workspaceName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="invite-email"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  className="pl-10"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                The user must have an existing account
              </p>
            </div>

            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as typeof inviteRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {isOwner && (
                    <SelectItem value="ADMIN">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-purple-600" />
                        <div>
                          <div>Admin</div>
                          <div className="text-xs text-muted-foreground">
                            {roleDescriptions.ADMIN}
                          </div>
                        </div>
                      </div>
                    </SelectItem>
                  )}
                  <SelectItem value="MEMBER">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-blue-600" />
                      <div>
                        <div>Member</div>
                        <div className="text-xs text-muted-foreground">
                          {roleDescriptions.MEMBER}
                        </div>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="VIEWER">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-gray-600" />
                      <div>
                        <div>Viewer</div>
                        <div className="text-xs text-muted-foreground">
                          {roleDescriptions.VIEWER}
                        </div>
                      </div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleInvite} disabled={inviteMember.isPending || !inviteEmail.trim()}>
              {inviteMember.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Send Invite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Confirmation */}
      <AlertDialog open={!!removeMemberConfirm} onOpenChange={(open) => !open && setRemoveMemberConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Remove Member?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove
              <strong className="mx-1">{removeMemberConfirm?.profile?.display_name || "this member"}</strong>
              from {workspaceName}? They will lose access to all workspace content.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleRemove}
              disabled={removeMember.isPending}
            >
              {removeMember.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Remove Member
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Transfer Ownership Dialog */}
      <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-accent" />
              Transfer Workspace Ownership
            </DialogTitle>
            <DialogDescription>
              Transfer ownership of <strong>{workspaceName}</strong> to another member.
              You will be demoted to Admin role.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select New Owner</Label>
              <Select value={selectedNewOwner} onValueChange={setSelectedNewOwner}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a member..." />
                </SelectTrigger>
                <SelectContent>
                  {eligibleForTransfer.map((member) => (
                    <SelectItem key={member.user_id} value={member.user_id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="w-6 h-6">
                          <AvatarImage src={member.profile?.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {getInitials(member.profile?.display_name)}
                          </AvatarFallback>
                        </Avatar>
                        <span>{member.profile?.display_name || "Unknown User"}</span>
                        <Badge variant="outline" className="text-xs">
                          {member.role}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-amber-600 dark:text-amber-400">
                    This action cannot be undone
                  </p>
                  <p className="text-muted-foreground mt-1">
                    Once you transfer ownership, only the new owner can transfer it back to you
                    or give you back the Owner role.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleTransferOwnership} 
              disabled={transferOwnership.isPending || !selectedNewOwner}
              className="gap-2"
            >
              {transferOwnership.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              <Crown className="w-4 h-4" />
              Transfer Ownership
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
