import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Users,
  Check,
  X,
  Star,
  Search,
  Calendar,
  Heart,
  Clock,
  CheckCircle2,
  Sparkles,
  Trash2,
  Eye,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface CommunityPost {
  id: string;
  image_url: string;
  caption: string | null;
  likes_count: number;
  created_at: string;
  is_approved: boolean | null;
  approved_at: string | null;
  is_featured: boolean | null;
  featured_at: string | null;
  profiles: {
    username: string | null;
    email: string;
  } | null;
}

type TabValue = "pending" | "approved" | "featured";

export const CommunityModeration = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<CommunityPost[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabValue>("pending");
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);

  useEffect(() => {
    fetchPosts();
  }, [activeTab]);

  useEffect(() => {
    if (searchQuery) {
      const filtered = posts.filter(
        (post) =>
          post.profiles?.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          post.profiles?.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          post.caption?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredPosts(filtered);
    } else {
      setFilteredPosts(posts);
    }
  }, [searchQuery, posts]);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("community_posts")
        .select(
          `
          id,
          image_url,
          caption,
          likes_count,
          created_at,
          is_approved,
          approved_at,
          is_featured,
          featured_at,
          profiles!community_posts_user_id_fkey (
            username,
            email
          )
        `
        )
        .order("created_at", { ascending: false });

      // Filter based on active tab
      if (activeTab === "pending") {
        query = query.or("is_approved.is.null,is_approved.eq.false");
      } else if (activeTab === "approved") {
        query = query.eq("is_approved", true);
      } else if (activeTab === "featured") {
        query = query.eq("is_featured", true);
      }

      const { data, error } = await query.limit(100);

      if (error) throw error;

      setPosts((data as unknown as CommunityPost[]) || []);
      setFilteredPosts((data as unknown as CommunityPost[]) || []);
    } catch (error) {
      console.error("Error fetching community posts:", error);
      toast.error("Failed to load community posts");
    } finally {
      setLoading(false);
    }
  };

  const approvePost = async (post: CommunityPost) => {
    try {
      const { error } = await supabase
        .from("community_posts")
        .update({
          is_approved: true,
          approved_at: new Date().toISOString(),
          approved_by: user?.id,
        })
        .eq("id", post.id);

      if (error) throw error;

      toast.success("Post approved successfully");
      fetchPosts();
    } catch (error) {
      console.error("Error approving post:", error);
      toast.error("Failed to approve post");
    }
  };

  const rejectPost = async (post: CommunityPost) => {
    try {
      const { error } = await supabase
        .from("community_posts")
        .update({
          is_approved: false,
          approved_at: null,
          approved_by: null,
        })
        .eq("id", post.id);

      if (error) throw error;

      toast.success("Post rejected");
      fetchPosts();
    } catch (error) {
      console.error("Error rejecting post:", error);
      toast.error("Failed to reject post");
    }
  };

  const toggleFeature = async (post: CommunityPost) => {
    try {
      const newFeaturedState = !post.is_featured;
      const { error } = await supabase
        .from("community_posts")
        .update({
          is_featured: newFeaturedState,
          featured_at: newFeaturedState ? new Date().toISOString() : null,
        })
        .eq("id", post.id);

      if (error) throw error;

      toast.success(newFeaturedState ? "Post featured" : "Post unfeatured");
      fetchPosts();
    } catch (error) {
      console.error("Error toggling feature:", error);
      toast.error("Failed to update post");
    }
  };

  const confirmDelete = (post: CommunityPost) => {
    setSelectedPost(post);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedPost) return;

    try {
      const { error } = await supabase
        .from("community_posts")
        .delete()
        .eq("id", selectedPost.id);

      if (error) throw error;

      toast.success("Post deleted successfully");
      setDeleteDialogOpen(false);
      setSelectedPost(null);
      fetchPosts();
    } catch (error) {
      console.error("Error deleting post:", error);
      toast.error("Failed to delete post");
    }
  };

  const openPreview = (post: CommunityPost) => {
    setSelectedPost(post);
    setPreviewDialogOpen(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (post: CommunityPost) => {
    if (post.is_featured) {
      return (
        <Badge className="bg-amber-500 text-white">
          <Sparkles className="w-3 h-3 mr-1" />
          Featured
        </Badge>
      );
    }
    if (post.is_approved) {
      return (
        <Badge className="bg-green-500 text-white">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Approved
        </Badge>
      );
    }
    return (
      <Badge variant="secondary">
        <Clock className="w-3 h-3 mr-1" />
        Pending
      </Badge>
    );
  };

  const getTabCount = (tab: TabValue) => {
    switch (tab) {
      case "pending":
        return posts.filter((p) => !p.is_approved).length;
      case "approved":
        return posts.filter((p) => p.is_approved && !p.is_featured).length;
      case "featured":
        return posts.filter((p) => p.is_featured).length;
      default:
        return 0;
    }
  };

  if (loading && posts.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Community Posts Moderation
            </CardTitle>
            <div className="relative w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by creator or caption..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as TabValue)}
            className="space-y-4"
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="pending" className="gap-2">
                <Clock className="w-4 h-4" />
                Pending
                <Badge variant="secondary" className="ml-1">
                  {getTabCount("pending")}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="approved" className="gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Approved
                <Badge variant="secondary" className="ml-1">
                  {getTabCount("approved")}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="featured" className="gap-2">
                <Sparkles className="w-4 h-4" />
                Featured
                <Badge variant="secondary" className="ml-1">
                  {getTabCount("featured")}
                </Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-4">
              <p className="text-sm text-muted-foreground mb-4">
                {filteredPosts.length} post{filteredPosts.length !== 1 ? "s" : ""} found
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPosts.length === 0 ? (
                  <div className="col-span-full text-center text-muted-foreground py-12">
                    No posts found in this category
                  </div>
                ) : (
                  filteredPosts.map((post) => (
                    <Card key={post.id} className="overflow-hidden">
                      <div className="aspect-square overflow-hidden bg-muted relative group">
                        <img
                          src={post.image_url}
                          alt="Community post"
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className="absolute top-2 right-2">{getStatusBadge(post)}</div>
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                          <Button
                            size="sm"
                            variant="secondary"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => openPreview(post)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Preview
                          </Button>
                        </div>
                      </div>
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="font-medium">
                            {post.profiles?.username || post.profiles?.email.split("@")[0] || "Unknown"}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(post.created_at)}
                          </span>
                        </div>

                        {post.caption && (
                          <p className="text-sm line-clamp-2">{post.caption}</p>
                        )}

                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Heart className="w-4 h-4" />
                          <span>{post.likes_count} likes</span>
                        </div>

                        <div className="flex gap-2 pt-2 border-t">
                          {activeTab === "pending" && (
                            <>
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => approvePost(post)}
                                className="flex-1"
                              >
                                <Check className="w-3 h-3 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => rejectPost(post)}
                                className="flex-1"
                              >
                                <X className="w-3 h-3 mr-1" />
                                Reject
                              </Button>
                            </>
                          )}
                          {(activeTab === "approved" || activeTab === "featured") && (
                            <>
                              <Button
                                size="sm"
                                variant={post.is_featured ? "default" : "outline"}
                                onClick={() => toggleFeature(post)}
                                className="flex-1"
                              >
                                <Star className="w-3 h-3 mr-1" />
                                {post.is_featured ? "Unfeature" : "Feature"}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => rejectPost(post)}
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </>
                          )}
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => confirmDelete(post)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Post Preview</DialogTitle>
          </DialogHeader>
          {selectedPost && (
            <div className="space-y-4">
              <div className="aspect-video overflow-hidden rounded-lg bg-muted">
                <img
                  src={selectedPost.image_url}
                  alt="Preview"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {selectedPost.profiles?.username ||
                      selectedPost.profiles?.email.split("@")[0]}
                  </span>
                  {getStatusBadge(selectedPost)}
                </div>
                {selectedPost.caption && (
                  <p className="text-muted-foreground">{selectedPost.caption}</p>
                )}
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Heart className="w-4 h-4" />
                    {selectedPost.likes_count} likes
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {formatDate(selectedPost.created_at)}
                  </span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewDialogOpen(false)}>
              Close
            </Button>
            {selectedPost && !selectedPost.is_approved && (
              <Button
                onClick={() => {
                  approvePost(selectedPost);
                  setPreviewDialogOpen(false);
                }}
              >
                <Check className="w-4 h-4 mr-1" />
                Approve
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this community post? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete Post
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CommunityModeration;
