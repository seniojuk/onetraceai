import { useState } from "react";
import { 
  Users, 
  Plus,
  Mail,
  MoreVertical,
  Shield,
  UserMinus,
  Loader2,
  Check,
  Crown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppLayout } from "@/components/layout/AppLayout";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspaces } from "@/hooks/useWorkspaces";
import { useUIStore } from "@/store/uiStore";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface TeamMember {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  role: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
  status: "active" | "pending";
  joinedAt?: string;
}

// Mock team members
const mockMembers: TeamMember[] = [
  {
    id: "1",
    email: "owner@example.com",
    displayName: "You",
    role: "OWNER",
    status: "active",
    joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
  },
];

const TeamPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { currentWorkspaceId } = useUIStore();
  const { data: workspaces } = useWorkspaces();
  
  const [members, setMembers] = useState<TeamMember[]>([
    { ...mockMembers[0], email: user?.email || "owner@example.com" }
  ]);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<string>("MEMBER");
  const [isInviting, setIsInviting] = useState(false);

  const currentWorkspace = workspaces?.find(w => w.id === currentWorkspaceId);

  const handleInvite = async () => {
    if (!inviteEmail) return;
    
    setIsInviting(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const newMember: TeamMember = {
      id: String(Date.now()),
      email: inviteEmail,
      displayName: inviteEmail.split("@")[0],
      role: inviteRole as TeamMember["role"],
      status: "pending",
    };
    
    setMembers([...members, newMember]);
    setIsInviting(false);
    setIsInviteOpen(false);
    setInviteEmail("");
    setInviteRole("MEMBER");
    
    toast({
      title: "Invitation sent",
      description: `An invitation has been sent to ${inviteEmail}`,
    });
  };

  const handleRemoveMember = async (member: TeamMember) => {
    setMembers(members.filter(m => m.id !== member.id));
    toast({
      title: "Member removed",
      description: `${member.displayName} has been removed from the team.`,
    });
  };

  const handleChangeRole = async (member: TeamMember, newRole: string) => {
    setMembers(members.map(m => 
      m.id === member.id ? { ...m, role: newRole as TeamMember["role"] } : m
    ));
    toast({
      title: "Role updated",
      description: `${member.displayName}'s role has been changed to ${newRole}.`,
    });
  };

  const roleColors = {
    OWNER: "bg-amber-100 text-amber-700",
    ADMIN: "bg-purple-100 text-purple-700",
    MEMBER: "bg-blue-100 text-blue-700",
    VIEWER: "bg-slate-100 text-slate-700",
  };

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <AuthGuard>
      <AppLayout>
        <div className="p-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Team</h1>
              <p className="text-muted-foreground">
                Manage members of {currentWorkspace?.name || "your workspace"}
              </p>
            </div>
            <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
              <DialogTrigger asChild>
                <Button className="bg-accent hover:bg-accent/90">
                  <Plus className="w-4 h-4 mr-2" />
                  Invite Member
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite Team Member</DialogTitle>
                  <DialogDescription>
                    Send an invitation to join your workspace
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="colleague@company.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select value={inviteRole} onValueChange={setInviteRole}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ADMIN">Admin - Full access</SelectItem>
                        <SelectItem value="MEMBER">Member - Can edit</SelectItem>
                        <SelectItem value="VIEWER">Viewer - Read only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsInviteOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleInvite}
                    disabled={!inviteEmail || isInviting}
                    className="bg-accent hover:bg-accent/90"
                  >
                    {isInviting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Mail className="w-4 h-4 mr-2" />
                    )}
                    Send Invitation
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Stats */}
          <div className="grid sm:grid-cols-3 gap-4 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{members.length}</p>
                    <p className="text-sm text-muted-foreground">Total Members</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                    <Check className="w-5 h-5 text-success" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">
                      {members.filter(m => m.status === "active").length}
                    </p>
                    <p className="text-sm text-muted-foreground">Active</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">
                      {members.filter(m => m.status === "pending").length}
                    </p>
                    <p className="text-sm text-muted-foreground">Pending</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Members List */}
          <Card>
            <CardHeader>
              <CardTitle>Members</CardTitle>
              <CardDescription>People with access to this workspace</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {members.map(member => (
                  <div 
                    key={member.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card"
                  >
                    <div className="flex items-center gap-4">
                      <Avatar>
                        <AvatarImage src={member.avatarUrl} />
                        <AvatarFallback className="bg-accent text-accent-foreground">
                          {getInitials(member.displayName)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-foreground">{member.displayName}</p>
                          {member.role === "OWNER" && (
                            <Crown className="w-4 h-4 text-amber-500" />
                          )}
                          {member.status === "pending" && (
                            <Badge variant="secondary">Pending</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{member.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={cn(roleColors[member.role])}>
                        {member.role}
                      </Badge>
                      {member.role !== "OWNER" && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleChangeRole(member, "ADMIN")}>
                              <Shield className="w-4 h-4 mr-2" />
                              Make Admin
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleChangeRole(member, "MEMBER")}>
                              <Users className="w-4 h-4 mr-2" />
                              Make Member
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleChangeRole(member, "VIEWER")}>
                              <Users className="w-4 h-4 mr-2" />
                              Make Viewer
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleRemoveMember(member)}
                              className="text-destructive"
                            >
                              <UserMinus className="w-4 h-4 mr-2" />
                              Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    </AuthGuard>
  );
};

export default TeamPage;
