import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Check, X, Eye, Search, CheckCircle2, XCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface PendingItem {
  id: string;
  share_token: string;
  created_at: string;
  is_inspire_approved: boolean;
  is_deleted: boolean;
  user_id: string;
  profiles?: {
    username?: string;
    email: string;
  };
  generated_assets?: {
    image_url: string;
    prompt: string;
    type: string;
  };
}

export const InspireApprovalPanel = () => {
  const [items, setItems] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [previewItem, setPreviewItem] = useState<PendingItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "approved">("pending");

  useEffect(() => {
    fetchItems();
  }, [filterStatus]);

  const fetchItems = async () => {
    try {
      setLoading(true);
      // @ts-ignore - Complex query with new fields
      let query = supabase
        .from("shared_assets")
        .select(`
          id,
          share_token,
          created_at,
          is_inspire_approved,
          is_deleted,
          user_id,
          profiles!shared_assets_user_id_fkey(username, email),
          generated_assets!shared_assets_asset_id_fkey(image_url, prompt, type)
        `)
        .eq("is_public", true)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false });

      if (filterStatus === "pending") {
        // @ts-ignore - New field
        query = query.eq("is_inspire_approved", false);
      } else if (filterStatus === "approved") {
        // @ts-ignore - New field
        query = query.eq("is_inspire_approved", true);
      }

      // @ts-ignore - Complex query types
      const { data, error } = await query;
      if (error) throw error;
      setItems((data as any) || []);
    } catch (error) {
      console.error("Error fetching items:", error);
      toast.error("Failed to load items");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from("shared_assets")
        // @ts-ignore - New field not in types yet
        .update({ is_inspire_approved: true })
        .eq("id", itemId);

      if (error) throw error;
      toast.success("Approved for Inspire gallery");
      fetchItems();
    } catch (error) {
      console.error("Error approving:", error);
      toast.error("Failed to approve");
    }
  };

  const handleUnapprove = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from("shared_assets")
        // @ts-ignore - New field not in types yet
        .update({ is_inspire_approved: false })
        .eq("id", itemId);

      if (error) throw error;
      toast.success("Removed from Inspire gallery");
      fetchItems();
    } catch (error) {
      console.error("Error removing:", error);
      toast.error("Failed to remove");
    }
  };

  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) {
      toast.error("No items selected");
      return;
    }

    try {
      const { error } = await supabase
        .from("shared_assets")
        // @ts-ignore - New field not in types yet
        .update({ is_inspire_approved: true })
        .in("id", Array.from(selectedIds));

      if (error) throw error;
      toast.success(`Approved ${selectedIds.size} items`);
      setSelectedIds(new Set());
      fetchItems();
    } catch (error) {
      console.error("Error bulk approving:", error);
      toast.error("Failed to bulk approve");
    }
  };

  const handleBulkUnapprove = async () => {
    if (selectedIds.size === 0) {
      toast.error("No items selected");
      return;
    }

    try {
      const { error } = await supabase
        .from("shared_assets")
        // @ts-ignore - New field not in types yet
        .update({ is_inspire_approved: false })
        .in("id", Array.from(selectedIds));

      if (error) throw error;
      toast.success(`Removed ${selectedIds.size} items`);
      setSelectedIds(new Set());
      fetchItems();
    } catch (error) {
      console.error("Error bulk removing:", error);
      toast.error("Failed to bulk remove");
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const filteredItems = items.filter(item => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      item.generated_assets?.prompt?.toLowerCase().includes(searchLower) ||
      item.profiles?.email?.toLowerCase().includes(searchLower) ||
      item.profiles?.username?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Inspire Gallery Approval</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by prompt or creator..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={filterStatus === "pending" ? "default" : "outline"}
                onClick={() => setFilterStatus("pending")}
                size="sm"
              >
                Pending
              </Button>
              <Button
                variant={filterStatus === "approved" ? "default" : "outline"}
                onClick={() => setFilterStatus("approved")}
                size="sm"
              >
                Approved
              </Button>
              <Button
                variant={filterStatus === "all" ? "default" : "outline"}
                onClick={() => setFilterStatus("all")}
                size="sm"
              >
                All
              </Button>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-4 p-4 bg-primary/5 rounded-lg border border-primary/10">
              <span className="text-sm font-medium">{selectedIds.size} selected</span>
              <Button size="sm" onClick={handleBulkApprove} className="gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Approve All
              </Button>
              <Button size="sm" variant="destructive" onClick={handleBulkUnapprove} className="gap-2">
                <XCircle className="h-4 w-4" />
                Remove All
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
                Clear Selection
              </Button>
            </div>
          )}

          {/* Items Grid */}
          {loading ? (
            <div className="text-center py-12">Loading...</div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No items found
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredItems.map((item) => (
                <Card key={item.id} className="relative group">
                  <CardContent className="p-4 space-y-3">
                    {/* Checkbox */}
                    <div className="absolute top-4 left-4 z-10">
                      <Checkbox
                        checked={selectedIds.has(item.id)}
                        onCheckedChange={() => toggleSelect(item.id)}
                        className="bg-background border-2"
                      />
                    </div>

                    {/* Status Badge */}
                    <div className="absolute top-4 right-4 z-10">
                      <Badge variant={item.is_inspire_approved ? "default" : "secondary"}>
                        {item.is_inspire_approved ? "Approved" : "Pending"}
                      </Badge>
                    </div>

                    {/* Image */}
                    {item.generated_assets?.image_url && (
                      <div className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                        <img
                          src={item.generated_assets.image_url}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    {/* Info */}
                    <div className="space-y-2">
                      <p className="text-sm line-clamp-2">
                        {item.generated_assets?.prompt || "No prompt"}
                      </p>
                      <div className="text-xs text-muted-foreground">
                        by {item.profiles?.username || item.profiles?.email?.split("@")[0]}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPreviewItem(item)}
                        className="flex-1 gap-2"
                      >
                        <Eye className="h-4 w-4" />
                        Preview
                      </Button>
                      {item.is_inspire_approved ? (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleUnapprove(item.id)}
                          className="gap-2"
                        >
                          <X className="h-4 w-4" />
                          Remove
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleApprove(item.id)}
                          className="gap-2"
                        >
                          <Check className="h-4 w-4" />
                          Approve
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={!!previewItem} onOpenChange={() => setPreviewItem(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Preview</DialogTitle>
          </DialogHeader>
          {previewItem && (
            <div className="space-y-4">
              {previewItem.generated_assets?.image_url && (
                <img
                  src={previewItem.generated_assets.image_url}
                  alt="Full preview"
                  className="w-full rounded-lg"
                />
              )}
              <div className="space-y-2">
                <h3 className="font-semibold">Prompt</h3>
                <p className="text-sm">{previewItem.generated_assets?.prompt}</p>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold">Creator</h3>
                <p className="text-sm">
                  {previewItem.profiles?.username || previewItem.profiles?.email}
                </p>
              </div>
              <div className="flex gap-2">
                {previewItem.is_inspire_approved ? (
                  <Button
                    variant="destructive"
                    onClick={() => {
                      handleUnapprove(previewItem.id);
                      setPreviewItem(null);
                    }}
                    className="gap-2"
                  >
                    <X className="h-4 w-4" />
                    Remove from Inspire
                  </Button>
                ) : (
                  <Button
                    onClick={() => {
                      handleApprove(previewItem.id);
                      setPreviewItem(null);
                    }}
                    className="gap-2"
                  >
                    <Check className="h-4 w-4" />
                    Approve for Inspire
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
