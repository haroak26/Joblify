import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Shield, ShieldOff, Ban, CheckCircle, Eye, UserX, Gift } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@shared/schema";

export function AdminUserManagement() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [blockDialog, setBlockDialog] = useState(false);
  const [blockType, setBlockType] = useState<"account" | "ai">("account");
  const [blockReason, setBlockReason] = useState("");
  const [perkDialog, setPerkDialog] = useState(false);
  const [selectedPerk, setSelectedPerk] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Fetch users
  const { data: usersData, isLoading } = useQuery({
    queryKey: ["/api/admin/users", { page, search }],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        ...(search && { search }),
      });
      const res = await fetch(`/api/admin/users?${params}`);
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
  });

  // Fetch perks for awarding
  const { data: perksData } = useQuery({
    queryKey: ["/api/admin/perks"],
    queryFn: async () => {
      const res = await fetch("/api/admin/perks");
      if (!res.ok) throw new Error("Failed to fetch perks");
      return res.json();
    },
  });

  // Block account mutation
  const blockAccountMutation = useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason: string }) => {
      const res = await fetch(`/api/admin/users/${userId}/block-account`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) throw new Error("Failed to block account");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Account blocked successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setBlockDialog(false);
      setBlockReason("");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to block account", variant: "destructive" });
    },
  });

  // Block AI mutation
  const blockAIMutation = useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason: string }) => {
      const res = await fetch(`/api/admin/users/${userId}/block-ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) throw new Error("Failed to block AI access");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "AI access blocked successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setBlockDialog(false);
      setBlockReason("");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to block AI access", variant: "destructive" });
    },
  });

  // Unblock account mutation
  const unblockAccountMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`/api/admin/users/${userId}/unblock-account`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to unblock account");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Account unblocked successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
  });

  // Unblock AI mutation
  const unblockAIMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`/api/admin/users/${userId}/unblock-ai`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to unblock AI access");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "AI access unblocked successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
  });

  // Award perk mutation  
  const awardPerkMutation = useMutation({
    mutationFn: async ({ userId, perkId }: { userId: string; perkId: string }) => {
      const res = await fetch(`/api/admin/users/${userId}/award-perk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ perkId }),
      });
      if (!res.ok) throw new Error("Failed to award perk");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Perk awarded and email sent to user" });
      setPerkDialog(false);
      setSelectedPerk("");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to award perk", variant: "destructive" });
    },
  });

  const handleBlockUser = () => {
    if (!selectedUser || !blockReason.trim()) {
      toast({ title: "Error", description: "Please provide a reason", variant: "destructive" });
      return;
    }

    if (blockType === "account") {
      blockAccountMutation.mutate({ userId: selectedUser.id, reason: blockReason });
    } else {
      blockAIMutation.mutate({ userId: selectedUser.id, reason: blockReason });
    }
  };

  const handleAwardPerk = () => {
    if (!selectedUser || !selectedPerk) {
      toast({ title: "Error", description: "Please select a perk", variant: "destructive" });
      return;
    }
    awardPerkMutation.mutate({ userId: selectedUser.id, perkId: selectedPerk });
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or username..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          {/* Users Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>2FA</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">Loading...</TableCell>
                  </TableRow>
                ) : usersData?.users?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">No users found</TableCell>
                  </TableRow>
                ) : (
                  usersData?.users?.map((user: any) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{user.name || user.username}</span>
                          <span className="text-xs text-muted-foreground">@{user.username}</span>
                        </div>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {user.accountBlocked && (
                            <Badge variant="destructive">Account Blocked</Badge>
                          )}
                          {user.aiAccessBlocked && (
                            <Badge variant="outline" className="border-orange-500 text-orange-500">
                              AI Blocked
                            </Badge>
                          )}
                          {!user.accountBlocked && !user.aiAccessBlocked && (
                            <Badge variant="outline" className="border-green-500 text-green-500">
                              Active
                            </Badge>
                          )}
                          {user.isAdmin && <Badge>Admin</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.twoFactorEnabled ? (
                          <Badge variant="outline" className="border-green-500 text-green-500">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Enabled
                          </Badge>
                        ) : (
                          <Badge variant="outline">Disabled</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(user.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setLocation(`/dashboard/admin/users/${user.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {!user.isAdmin && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setPerkDialog(true);
                                }}
                              >
                                <Gift className="h-4 w-4" />
                              </Button>
                              {user.accountBlocked ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => unblockAccountMutation.mutate(user.id)}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setBlockType("account");
                                    setBlockDialog(true);
                                  }}
                                >
                                  <Ban className="h-4 w-4" />
                                </Button>
                              )}
                              {user.aiAccessBlocked ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => unblockAIMutation.mutate(user.id)}
                                >
                                  <Shield className="h-4 w-4" />
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setBlockType("ai");
                                    setBlockDialog(true);
                                  }}
                                >
                                  <ShieldOff className="h-4 w-4" />
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {usersData && usersData.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Page {page} of {usersData.totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= usersData.totalPages}
                  onClick={() => setPage((p) => Math.min(usersData.totalPages, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>

      {/* Award Perk Dialog */}
      <Dialog open={perkDialog} onOpenChange={setPerkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Award Perk to User</DialogTitle>
            <DialogDescription>
              Select a perk to award. An email notification will be sent to the user.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>User</Label>
              <div className="p-2 bg-muted rounded text-sm">
                {selectedUser?.email}
              </div>
            </div>
            <div>
              <Label>Select Perk</Label>
              <Select value={selectedPerk} onValueChange={setSelectedPerk}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a perk" />
                </SelectTrigger>
                <SelectContent>
                  {perksData?.perks?.map((perk: any) => (
                    <SelectItem key={perk.id} value={perk.id}>
                      {perk.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPerkDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAwardPerk} disabled={!selectedPerk}>
              Award Perk
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Block User Dialog */}
      <Dialog open={blockDialog} onOpenChange={setBlockDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {blockType === "account" ? "Block Account" : "Block AI Access"}
            </DialogTitle>
            <DialogDescription>
              Provide an internal note explaining why this action is being taken.
              This note will NOT be shown to the user.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Internal Note (Required)</Label>
              <Textarea
                placeholder="Explain why this account/AI access is being blocked..."
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBlockDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleBlockUser}
              disabled={!blockReason.trim()}
            >
              {blockType === "account" ? "Block Account" : "Block AI Access"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
