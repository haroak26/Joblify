import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Gift, Search, Plus, Ticket, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function AdminPerksManagement() {
  const [awardDialog, setAwardDialog] = useState(false);
  const [createPerkDialog, setCreatePerkDialog] = useState(false);
  const [createCodeDialog, setCreateCodeDialog] = useState(false);
  const [selectedPerk, setSelectedPerk] = useState("");
  const [searchUserId, setSearchUserId] = useState("");
  
  // Perk creation state
  const [perkName, setPerkName] = useState("");
  const [perkType, setPerkType] = useState("");
  const [perkValue, setPerkValue] = useState("");
  const [perkDescription, setPerkDescription] = useState("");
  
  // Code creation state
  const [codeUserEmail, setCodeUserEmail] = useState("");
  const [codePerkId, setCodePerkId] = useState("");
  const [codeMaxRedemptions, setCodeMaxRedemptions] = useState("1");
  const [codeExpiresAt, setCodeExpiresAt] = useState("");
  
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

  // Create perk mutation
  const createPerkMutation = useMutation({
    mutationFn: async (perkData: any) => {
      const res = await fetch("/api/admin/perks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(perkData),
      });
      if (!res.ok) throw new Error("Failed to create perk");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Perk created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/perks"] });
      setCreatePerkDialog(false);
      setPerkName("");
      setPerkType("");
      setPerkValue("");
      setPerkDescription("");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create perk", variant: "destructive" });
    },
  });

  // Create code mutation
  const createCodeMutation = useMutation({
    mutationFn: async (codeData: any) => {
      const res = await fetch("/api/admin/codes/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(codeData),
      });
      if (!res.ok) throw new Error("Failed to create code");
      return res.json();
    },
    onSuccess: (data) => {
      toast({ 
        title: "Success", 
        description: `Redemption code created: ${data.code.code}` 
      });
      setCreateCodeDialog(false);
      setCodeUserEmail("");
      setCodePerkId("");
      setCodeMaxRedemptions("1");
      setCodeExpiresAt("");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create redemption code", variant: "destructive" });
    },
  });

  const handleAwardPerk = () => {
    if (!searchUserId || !selectedPerk) {
      toast({ title: "Error", description: "Please select user and perk", variant: "destructive" });
      return;
    }
    awardPerkMutation.mutate({ userId: searchUserId, perkId: selectedPerk });
  };

  const handleCreatePerk = () => {
    if (!perkName || !perkType || !perkDescription) {
      toast({ title: "Error", description: "Please fill all required fields", variant: "destructive" });
      return;
    }
    createPerkMutation.mutate({
      name: perkName,
      perkType,
      value: perkValue ? parseInt(perkValue) : null,
      description: perkDescription,
    });
  };

  const handleCreateCode = () => {
    if (!codeUserEmail || !codePerkId) {
      toast({ title: "Error", description: "Please fill user email and select perk", variant: "destructive" });
      return;
    }
    createCodeMutation.mutate({
      perkId: codePerkId,
      userEmail: codeUserEmail,
      maxRedemptions: parseInt(codeMaxRedemptions),
      expiresAt: codeExpiresAt || null,
    });
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
          <div className="flex gap-2 flex-wrap">
            <Button onClick={() => setCreatePerkDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create New Perk
            </Button>
            <Button onClick={() => setCreateCodeDialog(true)} variant="outline">
              <Ticket className="h-4 w-4 mr-2" />
              Create Coupon Code
            </Button>
            <Button onClick={() => setAwardDialog(true)} variant="outline">
              <Gift className="h-4 w-4 mr-2" />
              Award Perk to User
            </Button>
          </div>

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

      {/* Create Perk Dialog */}
      <Dialog open={createPerkDialog} onOpenChange={setCreatePerkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Perk</DialogTitle>
            <DialogDescription>
              Create a new perk that can be awarded to users
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Perk Name *</Label>
              <Input
                placeholder="e.g., Free Practice Interview"
                value={perkName}
                onChange={(e) => setPerkName(e.target.value)}
              />
            </div>
            <div>
              <Label>Perk Type *</Label>
              <Select value={perkType} onValueChange={setPerkType}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose perk type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="interview_credit">Interview Credit</SelectItem>
                  <SelectItem value="ats_scan_credit">ATS Scan Credit</SelectItem>
                  <SelectItem value="ai_edit_credit">AI Edit Credit</SelectItem>
                  <SelectItem value="temp_pro_access">Temporary Pro Access</SelectItem>
                  <SelectItem value="temp_ultra_access">Temporary Ultra Access</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Value (Optional)</Label>
              <Input
                type="number"
                placeholder="e.g., 5 for 5 credits or 30 for 30 days"
                value={perkValue}
                onChange={(e) => setPerkValue(e.target.value)}
              />
              <p className="text-sm text-muted-foreground mt-1">
                Number of credits or days, depending on perk type
              </p>
            </div>
            <div>
              <Label>Description *</Label>
              <Textarea
                placeholder="Describe what this perk provides..."
                value={perkDescription}
                onChange={(e) => setPerkDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreatePerkDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreatePerk} disabled={createPerkMutation.isPending}>
              {createPerkMutation.isPending ? "Creating..." : "Create Perk"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Code Dialog */}
      <Dialog open={createCodeDialog} onOpenChange={setCreateCodeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Redemption Code</DialogTitle>
            <DialogDescription>
              Generate a unique coupon code for a user to redeem a perk
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>User Email *</Label>
              <Input
                type="email"
                placeholder="user@example.com"
                value={codeUserEmail}
                onChange={(e) => setCodeUserEmail(e.target.value)}
              />
              <p className="text-sm text-muted-foreground mt-1">
                User will receive an email with the code
              </p>
            </div>
            <div>
              <Label>Select Perk *</Label>
              <Select value={codePerkId} onValueChange={setCodePerkId}>
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
            <div>
              <Label>Max Redemptions</Label>
              <Input
                type="number"
                value={codeMaxRedemptions}
                onChange={(e) => setCodeMaxRedemptions(e.target.value)}
                min="1"
              />
              <p className="text-sm text-muted-foreground mt-1">
                How many times this code can be redeemed (default: 1)
              </p>
            </div>
            <div>
              <Label>Expiration Date (Optional)</Label>
              <Input
                type="date"
                value={codeExpiresAt}
                onChange={(e) => setCodeExpiresAt(e.target.value)}
              />
              <p className="text-sm text-muted-foreground mt-1">
                Leave blank for no expiration
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateCodeDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateCode} disabled={createCodeMutation.isPending}>
              {createCodeMutation.isPending ? "Creating..." : "Create Code"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
