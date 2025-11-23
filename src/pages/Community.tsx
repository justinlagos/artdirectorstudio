import { useEffect, useMemo, useRef, useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Heart, MessageCircle, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";
import { useUnifiedVisualContext } from "@/store/unifiedVisualContext";

const PAGE_SIZE = 12;

type SortOption = "trending" | "recent" | "discussed";
type CommunityPost = Database["public"]["Tables"]["community_posts"]["Row"] & {
  profiles?: { username: string | null; email: string } | null;
};
type CommunityComment = Database["public"]["Tables"]["community_comments"]["Row"] & {
  profiles?: { username: string | null; email: string } | null;
};

const sortLabels: Record<SortOption, string> = {
  trending: "Trending",
  recent: "Recent",
  discussed: "Most Discussed",
};

const Community = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [sort, setSort] = useState<SortOption>("trending");
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [commentsByPost, setCommentsByPost] = useState<Record<string, CommunityComment[]>>({});
  const [loadingComments, setLoadingComments] = useState<Record<string, boolean>>({});
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const unifiedContext = useUnifiedVisualContext.getState();

  const fetchPosts = async ({ pageParam = 0 }: { pageParam?: number }): Promise<{ data: CommunityPost[]; count: number | null }> => {
    const from = pageParam * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from("community_posts")
      .select("*, profiles!community_posts_user_id_fkey(username, email)", { count: "exact" })
      .range(from, to);

    if (sort === "recent") {
      query = query.order("created_at", { ascending: false });
    } else if (sort === "discussed") {
      query = query.order("comments_count", { ascending: false }).order("created_at", { ascending: false });
    } else {
      query = query
        .order("likes_count", { ascending: false })
        .order("comments_count", { ascending: false })
        .order("created_at", { ascending: false });
    }

    const { data, error, count } = await query;
    if (error) throw error;
    return { data: (data as unknown as CommunityPost[]) ?? [], count: count ?? null };
  };

  const postsQuery = useInfiniteQuery({
    queryKey: ["community-posts", sort, user?.id],
    queryFn: fetchPosts,
    getNextPageParam: (lastPage, pages) => {
      const totalLoaded = pages.reduce((acc, page) => acc + page.data.length, 0);
      if (lastPage.count === null) return undefined;
      return totalLoaded < lastPage.count ? pages.length : undefined;
    },
    initialPageParam: 0,
    refetchOnWindowFocus: false,
  });

  const posts = useMemo(
    () => postsQuery.data?.pages.flatMap((page) => page.data) ?? [],
    [postsQuery.data]
  );

  useEffect(() => {
    if (!user || posts.length === 0) return;
    const loadLikes = async () => {
      const ids = posts.map((p) => p.id);
      const { data } = await supabase
        .from("community_likes")
        .select("post_id")
        .eq("user_id", user.id)
        .in("post_id", ids);

      setLikedPosts(new Set(data?.map((item) => item.post_id) ?? []));
    };

    loadLikes();
  }, [user?.id, posts.map((p) => p.id).join("-"), sort]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && postsQuery.hasNextPage && !postsQuery.isFetchingNextPage) {
          postsQuery.fetchNextPage();
        }
      },
      { rootMargin: "200px" }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [postsQuery.hasNextPage, postsQuery.isFetchingNextPage, postsQuery.fetchNextPage]);

  const updateLocalCounts = (postId: string, deltaLikes: number, deltaComments: number) => {
    queryClient.setQueryData<any>(["community-posts", sort, user?.id], (current) => {
      if (!current) return current;
      return {
        ...current,
        pages: current.pages.map((page: any) => ({
          ...page,
          data: page.data.map((post: CommunityPost) =>
            post.id === postId
              ? { ...post, likes_count: post.likes_count + deltaLikes, comments_count: post.comments_count + deltaComments }
              : post
          ),
        })),
      };
    });
  };

  const handleLike = async (postId: string) => {
    if (!user) {
      toast.error("Sign in to like posts");
      return;
    }

    const alreadyLiked = likedPosts.has(postId);
    setLikedPosts((prev) => {
      const next = new Set(prev);
      alreadyLiked ? next.delete(postId) : next.add(postId);
      return next;
    });

    try {
      if (alreadyLiked) {
        await supabase.from("community_likes").delete().match({ post_id: postId, user_id: user.id });
        updateLocalCounts(postId, -1, 0);
      } else {
        await supabase.from("community_likes").insert({ post_id: postId, user_id: user.id });
        updateLocalCounts(postId, 1, 0);
      }
    } catch (error) {
      console.error("Failed to toggle like", error);
      toast.error("Could not update like");
    }
  };

  const loadComments = async (postId: string) => {
    setLoadingComments((prev) => ({ ...prev, [postId]: true }));
    const { data, error } = await supabase
      .from("community_comments")
      .select("id, post_id, comment_text, created_at, user_id, profiles!community_comments_user_id_fkey(username, email)")
      .eq("post_id", postId)
      .order("created_at", { ascending: false })
      .limit(10);
    if (!error) {
      setCommentsByPost((prev) => ({ ...prev, [postId]: (data as unknown as CommunityComment[]) ?? [] }));
    }
    setLoadingComments((prev) => ({ ...prev, [postId]: false }));
  };

  const handleAddComment = async (postId: string) => {
    if (!user) {
      toast.error("Sign in to comment");
      return;
    }
    const text = commentInputs[postId]?.trim();
    if (!text) return;

    try {
      const { data, error } = await supabase
        .from("community_comments")
        .insert({ post_id: postId, user_id: user.id, comment_text: text })
        .select("id, post_id, comment_text, created_at, user_id, profiles!community_comments_user_id_fkey(username, email)")
        .single();

      if (error) throw error;

      setCommentsByPost((prev) => ({
        ...prev,
        [postId]: [data as unknown as CommunityComment, ...(prev[postId] || [])],
      }));
      setCommentInputs((prev) => ({ ...prev, [postId]: "" }));
      updateLocalCounts(postId, 0, 1);
      toast.success("Comment added");
    } catch (error) {
      console.error("Failed to comment", error);
      toast.error("Could not add comment");
    }
  };

  const handleDiscussWithArtie = (post: CommunityPost) => {
    const messageId = `community-${post.id}`;
    try {
      const existingRaw = sessionStorage.getItem("artie-conversation");
      const history = existingRaw ? JSON.parse(existingRaw) : [];
      if (history.length === 0) {
        history.push({
          id: "1",
          text: "Hi! I'm Artie — let's dive into this community creation together.",
          sender: "artie",
          timestamp: new Date().toISOString(),
        });
      }
      history.push({
        id: messageId,
        text: post.caption || "Let's talk about this community post.",
        sender: "user",
        timestamp: new Date().toISOString(),
        attachment: {
          type: "image",
          url: post.image_url,
          name: post.caption || "Community image",
        },
      });
      sessionStorage.setItem("artie-conversation", JSON.stringify(history));

      const contextRaw = sessionStorage.getItem("artie-context-memory");
      const context = contextRaw ? JSON.parse(contextRaw) : { images: [], documents: [] };
      const hasImage = Array.isArray(context.images) && context.images.some((img: any) => img.url === post.image_url);
      if (!hasImage) {
        context.images = [
          ...(Array.isArray(context.images) ? context.images : []),
          {
            url: post.image_url,
            messageId,
            name: post.caption || "Community reference",
            source: "user",
            timestamp: new Date().toISOString(),
          },
        ];
        sessionStorage.setItem("artie-context-memory", JSON.stringify(context));
      }

      unifiedContext.addImageToMemory({
        url: post.image_url,
        source: "user",
        name: post.caption || "Community post",
      });

      window.dispatchEvent(new Event("openArtieChat"));
      toast.success("Opening Artie with this image");
    } catch (error) {
      console.error("Failed to open Artie", error);
      toast.error("Could not open Artie right now");
    }
  };

  const renderPostCard = (post: CommunityPost) => {
    const username = post.profiles?.username || "Creator";
    const initials = username.substring(0, 2).toUpperCase();
    const liked = likedPosts.has(post.id);
    const comments = commentsByPost[post.id] || [];

    return (
      <Card key={post.id} className="mb-6 break-inside-avoid shadow-sm border-border/60">
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary/10 text-primary">{initials}</AvatarFallback>
              </Avatar>
              <div>
                <div className="font-medium leading-none">{username}</div>
                <div className="text-xs text-muted-foreground">
                  {post.created_at ? `${formatDistanceToNow(new Date(post.created_at))} ago` : "Just now"}
                </div>
              </div>
            </div>
            <Badge variant="secondary">{sortLabels[sort]}</Badge>
          </div>

          <div className="rounded-xl overflow-hidden bg-muted">
            <img
              src={post.image_url}
              alt={post.caption ?? "Community post"}
              className="w-full h-auto object-cover"
              loading="lazy"
            />
          </div>

          {post.caption && <p className="text-sm text-foreground/80 whitespace-pre-wrap">{post.caption}</p>}

          <div className="flex items-center gap-2">
            <Button
              variant={liked ? "default" : "outline"}
              size="sm"
              onClick={() => handleLike(post.id)}
              className="gap-2"
            >
              <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} />
              {post.likes_count}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (!commentsByPost[post.id]) {
                  loadComments(post.id);
                }
                setCommentInputs((prev) => ({ ...prev, [post.id]: prev[post.id] || "" }));
                setLoadingComments((prev) => ({ ...prev, [post.id]: prev[post.id] ?? false }));
              }}
              className="gap-2"
            >
              <MessageCircle className="h-4 w-4" />
              {post.comments_count}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDiscussWithArtie(post)}
              className="gap-2 ml-auto"
            >
              <Sparkles className="h-4 w-4" />
              Discuss with Artie
            </Button>
          </div>

          {loadingComments[post.id] && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading comments...
            </div>
          )}

          {comments.length > 0 && (
            <div className="space-y-3 border border-border/60 rounded-lg p-3 bg-muted/30">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {(comment.profiles?.username || "User").substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="text-sm font-medium">{comment.profiles?.username || "User"}</div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{comment.comment_text}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <Textarea
              placeholder={user ? "Leave a comment" : "Sign in to comment"}
              value={commentInputs[post.id] || ""}
              onChange={(e) => setCommentInputs((prev) => ({ ...prev, [post.id]: e.target.value }))}
              onFocus={() => {
                if (!user) toast.error("Please sign in to comment");
                if (!commentsByPost[post.id]) loadComments(post.id);
              }}
              disabled={!user}
              className="min-h-[80px]"
            />
            <Button
              size="sm"
              onClick={() => handleAddComment(post.id)}
              disabled={!user || !commentInputs[post.id]?.trim()}
              className="w-full"
            >
              Post Comment
            </Button>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface-1">
      <Header />
      <main className="flex-1 container mx-auto px-4 md:px-8 py-12">
        <div className="max-w-6xl mx-auto space-y-10">
          <div className="text-center space-y-4">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div className="space-y-3">
              <h1 className="text-4xl font-display font-bold">Community</h1>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                Explore creations from ArtDirector Studio artists. Browse the latest drops, trending shots, and most discussed visuals.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              {(Object.keys(sortLabels) as SortOption[]).map((key) => (
                <Button
                  key={key}
                  variant={sort === key ? "default" : "outline"}
                  onClick={() => {
                    setSort(key);
                    postsQuery.refetch();
                  }}
                  className="gap-2"
                  size="sm"
                >
                  {sortLabels[key]}
                </Button>
              ))}
            </div>
          </div>

          <div className="columns-1 sm:columns-2 lg:columns-3 gap-4">
            {posts.map((post) => renderPostCard(post))}
          </div>

          {postsQuery.isFetchingNextPage && (
            <div className="flex justify-center py-6 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          )}

          <div ref={loadMoreRef} className="h-10" />

          {!postsQuery.isLoading && posts.length === 0 && (
            <Card className="p-8 text-center space-y-3">
              <h3 className="text-xl font-semibold">No posts yet</h3>
              <p className="text-muted-foreground">Be the first to share your work from the Studio.</p>
              <Button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
                Start Creating
              </Button>
            </Card>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Community;
