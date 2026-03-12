import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sidebar } from "@/components/Sidebar";
import { trpc } from "@/lib/trpc";
import { Users as UsersIcon, Plus, Trash2, KeyRound, LogOut, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

function formatDate(date: Date | null | undefined) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString();
}

export default function Users() {
  const { user, loading, logout } = useAuth({ redirectOnUnauthenticated: true });
  const [, navigate] = useLocation();
  const [openCreate, setOpenCreate] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    username: "",
    password: "",
    name: "",
    role: "user" as "user" | "admin",
    mustChangePassword: true,
  });

  const { data: userList, isLoading, refetch } = trpc.users.list.useQuery();

  const createUserMutation = trpc.users.create.useMutation({
    onSuccess: () => {
      toast.success("User created successfully");
      setOpenCreate(false);
      setFormData({ username: "", password: "", name: "", role: "user", mustChangePassword: true });
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create user");
    },
  });

  const deleteUserMutation = trpc.users.delete.useMutation({
    onSuccess: () => {
      toast.success("User deleted successfully");
      setDeleteId(null);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete user");
    },
  });

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const isAdmin = user?.role === "admin" && !user?.dealerId;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />

      <div className="flex-1">
        <header className="bg-white shadow-sm border-b">
          <div className="px-8 py-4 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <UsersIcon className="w-6 h-6" />
                Users
              </h1>
              <p className="text-sm text-gray-600">
                Manage accounts, passwords and sessions
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" asChild>
                <Link href="/change-password">
                  <KeyRound className="w-4 h-4 mr-2" />
                  Change Password
                </Link>
              </Button>
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
              {isAdmin && (
                <Dialog open={openCreate} onOpenChange={setOpenCreate}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Add User
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New User</DialogTitle>
                      <DialogDescription>
                        Add a new user account. They will be required to change the password on first login if you enable that option.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
                          placeholder="Jane Doe"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="username">Username</Label>
                        <Input
                          id="username"
                          value={formData.username}
                          onChange={(e) => setFormData((f) => ({ ...f, username: e.target.value }))}
                          placeholder="jane.doe"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="password">Initial Password</Label>
                        <Input
                          id="password"
                          type="password"
                          value={formData.password}
                          onChange={(e) => setFormData((f) => ({ ...f, password: e.target.value }))}
                          placeholder="At least 6 characters"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="role">Role</Label>
                        <Select
                          value={formData.role}
                          onValueChange={(v) => setFormData((f) => ({ ...f, role: v as "user" | "admin" }))}
                        >
                          <SelectTrigger id="role">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">User</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          id="mustChange"
                          type="checkbox"
                          checked={formData.mustChangePassword}
                          onChange={(e) => setFormData((f) => ({ ...f, mustChangePassword: e.target.checked }))}
                          className="h-4 w-4"
                        />
                        <Label htmlFor="mustChange">Require password change on first login</Label>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setOpenCreate(false)}>
                        Cancel
                      </Button>
                      <Button
                        onClick={() => createUserMutation.mutate(formData)}
                        disabled={createUserMutation.isPending}
                      >
                        {createUserMutation.isPending ? "Creating..." : "Create User"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        </header>

        <main className="p-8">
          <div className="max-w-5xl mx-auto space-y-6">
            {/* Current user info card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-blue-600" />
                  My Account
                </CardTitle>
                <CardDescription>Your current session details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Name</span>
                    <p className="font-medium">{user?.name || "—"}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Username</span>
                    <p className="font-medium">{user?.username || "—"}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Role</span>
                    <p>
                      <Badge variant={user?.role === "admin" ? "default" : "secondary"}>
                        {user?.role}
                      </Badge>
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">Login method</span>
                    <p className="font-medium">{user?.loginMethod || "local"}</p>
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/change-password">
                      <KeyRound className="w-4 h-4 mr-2" />
                      Change Password
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleLogout}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* User list table (admin only) */}
            {isAdmin && (
              <Card>
                <CardHeader>
                  <CardTitle>All Users</CardTitle>
                  <CardDescription>
                    Manage user accounts across the platform
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="text-center py-8 text-gray-500">Loading users…</div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Username</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead>Last Sign In</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(userList || []).map((u: any) => (
                          <TableRow key={u.id}>
                            <TableCell className="font-medium">{u.name || "—"}</TableCell>
                            <TableCell>{u.username || "—"}</TableCell>
                            <TableCell>
                              <Badge variant={u.role === "admin" ? "default" : "secondary"}>
                                {u.role}
                              </Badge>
                            </TableCell>
                            <TableCell>{u.loginMethod || "local"}</TableCell>
                            <TableCell>{formatDate(u.lastSignedIn)}</TableCell>
                            <TableCell>{formatDate(u.createdAt)}</TableCell>
                            <TableCell className="text-right">
                              {u.id !== user?.id && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700"
                                  onClick={() => setDeleteId(u.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                        {(userList || []).length === 0 && (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                              No users found
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this user? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteId !== null && deleteUserMutation.mutate({ id: deleteId })}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
