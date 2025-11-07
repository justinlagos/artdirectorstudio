import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { 
  Flag, 
  Eye, 
  Trash2, 
  Star, 
  Award,
  Search,
  Calendar,
  Heart,
  Bookmark
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SharedAsset {
  id: string;
  view_count: number;
  like_count: number;
  bookmark_count: number;
  created_at: string;
  featured: boolean;
  staff_pick: boolean;
  is_public: boolean;
  tags: any;
  asset: {
    id: string;
    type: string;
    image_url: string | null;
    prompt: string | null;
  };
  profile: {
    email: string;
    username?: string;
  };
}

export const ContentModeration = () => {
  const [assets, setAssets] = useState<SharedAsset[]>([]);
  const [filteredAssets, setFilteredAssets] = useState<SharedAsset[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedAsset, setSelectedAsset] = useState<SharedAsset | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    fetchAssets();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      const filtered = assets.filter(asset =>
        asset.profile.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.asset.prompt?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredAssets(filtered);
    } else {
      setFilteredAssets(assets);
    }
  }, [searchQuery, assets]);

  const fetchAssets = async () => {
    try {
      const { data, error } = await supabase
        .from('shared_assets')
        .select(`
          id,
          view_count,
          like_count,
          bookmark_count,
          created_at,
          featured,
          staff_pick,
          is_public,
          tags,
          asset:generated_assets (
            id,
            type,
            image_url,
            prompt
          ),
          profile:profiles!shared_assets_user_id_fkey (
            email,
            username
          )
        `)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const validAssets = (data as unknown as SharedAsset[]).filter(a => a.asset !== null);
      setAssets(validAssets);
      setFilteredAssets(validAssets);
    } catch (error) {
      console.error("Error fetching assets:", error);
      toast.error("Failed to load content");
    } finally {
      setLoading(false);
    }
  };

  const toggleFeature = async (asset: SharedAsset) => {
    try {
      const { error } = await supabase
        .from('shared_assets')
        .update({ featured: !asset.featured })
        .eq('id', asset.id);

      if (error) throw error;

      toast.success(asset.featured ? "Removed from featured" : "Added to featured");
      fetchAssets();
    } catch (error) {
      console.error("Error toggling feature:", error);
      toast.error("Failed to update");
    }
  };

  const toggleStaffPick = async (asset: SharedAsset) => {
    try {
      const { error } = await supabase
        .from('shared_assets')
        .update({ staff_pick: !asset.staff_pick })
        .eq('id', asset.id);

      if (error) throw error;

      toast.success(asset.staff_pick ? "Removed from staff picks" : "Added to staff picks");
      fetchAssets();
    } catch (error) {
      console.error("Error toggling staff pick:", error);
      toast.error("Failed to update");
    }
  };

  const confirmDelete = (asset: SharedAsset) => {
    setSelectedAsset(asset);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedAsset) return;

    try {
      const { error } = await supabase
        .from('shared_assets')
        .delete()
        .eq('id', selectedAsset.id);

      if (error) throw error;

      toast.success("Content removed successfully");
      setDeleteDialogOpen(false);
      setSelectedAsset(null);
      fetchAssets();
    } catch (error) {
      console.error("Error deleting asset:", error);
      toast.error("Failed to delete content");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return <div>Loading content...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Flag className="w-5 h-5" />
              Content Moderation
            </CardTitle>
            <div className="relative w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by creator or prompt..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {filteredAssets.length} public asset{filteredAssets.length !== 1 ? 's' : ''} found
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAssets.length === 0 ? (
              <div className="col-span-full text-center text-muted-foreground py-12">
                No content found
              </div>
            ) : (
              filteredAssets.map((asset) => (
                <Card key={asset.id} className="overflow-hidden">
                  {asset.asset.image_url && (
                    <div className="aspect-square overflow-hidden bg-muted relative">
                      <img
                        src={asset.asset.image_url}
                        alt="Content"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 right-2 flex gap-1">
                        {asset.staff_pick && (
                          <Badge className="bg-amber-500 text-white">
                            <Award className="w-3 h-3" />
                          </Badge>
                        )}
                        {asset.featured && (
                          <Badge className="bg-primary">
                            <Star className="w-3 h-3" />
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>by {asset.profile.username || asset.profile.email.split('@')[0]}</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(asset.created_at)}
                      </span>
                    </div>

                    {asset.asset.prompt && (
                      <p className="text-sm line-clamp-2">{asset.asset.prompt}</p>
                    )}

                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Heart className="w-4 h-4" />
                          {asset.like_count}
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="w-4 h-4" />
                          {asset.view_count}
                        </span>
                        <span className="flex items-center gap-1">
                          <Bookmark className="w-4 h-4" />
                          {asset.bookmark_count}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2 border-t">
                      <Button
                        size="sm"
                        variant={asset.staff_pick ? "default" : "outline"}
                        onClick={() => toggleStaffPick(asset)}
                        className="flex-1"
                      >
                        <Award className="w-3 h-3 mr-1" />
                        {asset.staff_pick ? "Unpick" : "Staff Pick"}
                      </Button>
                      <Button
                        size="sm"
                        variant={asset.featured ? "default" : "outline"}
                        onClick={() => toggleFeature(asset)}
                        className="flex-1"
                      >
                        <Star className="w-3 h-3 mr-1" />
                        {asset.featured ? "Unfeature" : "Feature"}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => confirmDelete(asset)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this content? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete Content
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};