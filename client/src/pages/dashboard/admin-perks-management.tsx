import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Gift, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function AdminPerksManagement() {
  const [awardDialog, setAwardDialog] = useState(false);
  const [selectedPerk, setSelectedPerk] = useState("");
  const [searchUserId, setSearchUserId] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all perks
  const { data: perksData } = useQuery({
    queryKey: ["/api/admin/perks"],
    queryFn: async () => {
      const res = await fetch("/api/admin/perks");
      if (!res.ok) throw new Error("Failed to fetch perks");
      return res.json();
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
      setAwardDialog(false);
      setSelectedPerk("");
      setSearchUserId("");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to award perk", variant: "destructive" });
    },
  });

  const handleAwardPerk = () => {
    if (!searchUserId || !selectedPerk) {
      toast({ title: "Error", description: "Please select user and perk", variant: "destructive" });
      return;
    }
    awardPerkMutation.mutate({ userId: searchUserId, perkId: selectedPerk });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Perks Management</CardTitle>
          <CardDescription>
            Award perks to users and track perk redemption
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={() => setAwardDialog(true)}>
            <Gift className="h-4 w-4 mr-2" />
            Award Perk to User
          </Button>

          {/* Available Perks */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Available Perks</h3>
            <div className="grid gap-3 md:grid-cols-2">
              {perksData?.perks?.map((perk: any) => (
                <Card key={perk.id}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">{perk.name}</CardTitle>
                    <CardDescription>{perk.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{perk.perkType}</Badge>
                      {perk.value && <Badge>{perk.value} units</Badge>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Award Perk Dialog */}
      <Dialog open={awardDialog} onOpenChange={setAwardDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Award Perk to User</DialogTitle>
            <DialogDescription>
              Select a user and perk to award. An email notification will be sent.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>User ID</Label>
              <Input
                placeholder="Enter user ID"
                value={searchUserId}
                onChange={(e) => setSearchUserId(e.target.value)}
              />
              <p className="text-sm text-muted-foreground mt-1">
                Find user ID from User Management tab
              </p>
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
            <Button variant="outline" onClick={() => setAwardDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAwardPerk}>
              Award Perk
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
