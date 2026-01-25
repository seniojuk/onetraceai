import { useState } from "react";
import { 
  usePlatformAdminList, 
  useAddPlatformAdmin, 
  useRemovePlatformAdmin 
} from "@/hooks/usePlatformAdminManagement";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { UserPlus, Trash2, Shield, Loader2 } from "lucide-react";
import { format } from "date-fns";

export function PlatformAdminManagement() {
  const { user } = useAuth();
  const { data: admins, isLoading } = usePlatformAdminList();
  const addAdmin = useAddPlatformAdmin();
  const removeAdmin = useRemovePlatformAdmin();

  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [adminToRemove, setAdminToRemove] = useState<{ id: string; email: string | null } | null>(null);

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminEmail.trim()) return;
    
    await addAdmin.mutateAsync(newAdminEmail.trim());
    setNewAdminEmail("");
  };

  const handleRemoveAdmin = async () => {
    if (!adminToRemove) return;
    await removeAdmin.mutateAsync(adminToRemove.id);
    setAdminToRemove(null);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          <CardTitle>Platform Administrators</CardTitle>
        </div>
        <CardDescription>
          Manage users with platform-wide administrative access
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add Admin Form */}
        <form onSubmit={handleAddAdmin} className="flex gap-2">
          <Input
            type="email"
            placeholder="Enter user email address..."
            value={newAdminEmail}
            onChange={(e) => setNewAdminEmail(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" disabled={addAdmin.isPending || !newAdminEmail.trim()}>
            {addAdmin.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <UserPlus className="w-4 h-4 mr-2" />
            )}
            Add Admin
          </Button>
        </form>

        {/* Admins Table */}
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : !admins || admins.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No platform administrators found
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Granted By</TableHead>
                  <TableHead>Granted At</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {admins.map((admin) => (
                  <TableRow key={admin.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {admin.user_name || "—"}
                          {admin.user_id === user?.id && (
                            <Badge variant="outline" className="ml-2 text-xs">You</Badge>
                          )}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {admin.user_email || "—"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm">{admin.granted_by_name || "—"}</span>
                        <span className="text-xs text-muted-foreground">
                          {admin.granted_by_email || "System"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {admin.granted_at 
                        ? format(new Date(admin.granted_at), "MMM d, yyyy")
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={admin.user_id === user?.id || removeAdmin.isPending}
                        onClick={() => setAdminToRemove({ 
                          id: admin.user_id, 
                          email: admin.user_email 
                        })}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Remove Confirmation Dialog */}
        <AlertDialog open={!!adminToRemove} onOpenChange={() => setAdminToRemove(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove Platform Admin</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove <strong>{adminToRemove?.email}</strong> as a platform administrator? 
                They will lose access to all platform-level management features.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleRemoveAdmin}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {removeAdmin.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                Remove Admin
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
