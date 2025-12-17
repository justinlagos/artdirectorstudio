import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type { Database } from "@/integrations/supabase/types";
import { formatDistanceToNow } from "date-fns";
import { Heart, MessageCircle, Sparkles, Wand2, Layers, Maximize2, Edit, Loader2, ArrowRight } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

type CommunityPost = Database["public"]["Tables"]["community_posts"]["Row"] & {
  profiles?: { username: string | null; email: string } | null;
};

type CommunityComment = Database["public"]["Tables"]["community_comments"]["Row"] & {
  profiles?: { username: string | null; email: string } | null;
};

interface CommunityPostCardProps {
  post: CommunityPost;
  liked: boolean;
  onLike: (postId: string) => void;
  onDiscuss: (post: CommunityPost) => void;
  comments: CommunityComment[];
  loadingComments: boolean;
  onLoadComments: (postId: string) => void;
  onAddComment: (postId: string, text: string) => void;
  onRemix: (post: CommunityPost) => void;
  onOpenInStudio: (post: CommunityPost) => void;
  sortLabel?: string;
}

export const CommunityPostCard = ({
  post,
  liked,
  onLike,
  onDiscuss,
  comments,
  loadingComments,
  onLoadComments,
  onAddComment,
  onRemix,
  onOpenInStudio,
  sortLabel,
}: CommunityPostCardProps) => {
  const { user } = useAuth();
  const [commentText, setCommentText] = useState("");
  const username = post.profiles?.username || "Creator";
  const initials = username.substring(0, 2).toUpperCase();

  const getToolIcon = (tool?: string | null) => {
    switch (tool) {
      case "studio": return <Wand2 className="h-3 w-3" />;
      case "edit": return <Edit className="h-3 w-3" />;
      case "blend": return <Layers className="h-3 w-3" />;
      case "upscale": return <Maximize2 className="h-3 w-3" />;
      case "artie": return <Sparkles className="h-3 w-3" />;
      default: return null;
    }
  };

  const getToolLabel = (tool?: string | null) => {
    if (!tool) return null;
    return tool.charAt(0).toUpperCase() + tool.slice(1);
  };

  return (
    <Card className="mb-6 break-inside-avoid shadow-sm border-border/60 hover:shadow-md transition-shadow duration-200">
      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary/10 text-primary">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium leading-none">{username}</div>
              <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                {post.created_at ? `${formatDistanceToNow(new Date(post.created_at))} ago` : "Just now"}
                {post.remix_source_id && (
                  <span className="flex items-center gap-1 text-primary/80 bg-primary/5 px-1.5 py-0.5 rounded-sm">
                    <RefreshCw className="h-3 w-3" />
                    Remix
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {post.tool_used && (
              <Badge variant="outline" className="gap-1.5 pl-2">
                {getToolIcon(post.tool_used)}
                {getToolLabel(post.tool_used)}
              </Badge>
            )}
            {sortLabel && <Badge variant="secondary">{sortLabel}</Badge>}
          </div>
        </div>

        {/* Image */}
        <div className="rounded-xl overflow-hidden bg-muted relative group">
          <img
            src={post.thumbnail_url || post.image_url}
            alt={post.caption ?? "Community post"}
            className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-[1.02]"
            loading="lazy"
          />
          
          {/* Hover Actions Overlay */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-4">
            <Button 
              size="sm" 
              variant="secondary" 
              className="gap-2 shadow-lg"
              onClick={() => onRemix(post)}
            >
              <RefreshCw className="h-4 w-4" />
              Remix
            </Button>
            <Button 
              size="sm" 
              variant="secondary" 
              className="gap-2 shadow-lg"
              onClick={() => onOpenInStudio(post)}
            >
              <Wand2 className="h-4 w-4" />
              Open in Studio
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-2">
          {post.caption && <p className="text-sm font-medium text-foreground">{post.caption}</p>}
          {post.prompt && post.prompt !== post.caption && (
            <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded-lg border border-border/40 font-mono">
              <span className="font-semibold text-primary/80">Prompt: </span>
              {post.prompt.length > 150 ? `${post.prompt.slice(0, 150)}...` : post.prompt}
            </div>
          )}
        </div>

        {/* Metrics & Actions */}
        <div className="flex items-center gap-2 pt-2">
          <Button
            variant={liked ? "default" : "outline"}
            size="sm"
            onClick={() => onLike(post.id)}
            className="gap-2 h-8 text-xs"
          >
            <Heart className={`h-3.5 w-3.5 ${liked ? "fill-current" : ""}`} />
            {post.likes_count}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => onLoadComments(post.id)}
            className="gap-2 h-8 text-xs"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            {post.comments_count}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDiscuss(post)}
            className="gap-2 ml-auto h-8 text-xs text-muted-foreground hover:text-foreground"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Discuss
          </Button>
        </div>

        {/* Comments Section */}
        {loadingComments && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
            <Loader2 className="h-3 w-3 animate-spin" /> Loading comments...
          </div>
        )}

        {comments.length > 0 && (
          <div className="space-y-3 pt-2">
            <div className="space-y-3 border-l-2 border-border/40 pl-3">
              {comments.map((comment) => (
                <div key={comment.id} className="gap-2 text-sm">
                  <span className="font-semibold text-foreground/90 text-xs mr-2">
                    {comment.profiles?.username || "User"}
                  </span>
                  <span className="text-muted-foreground">{comment.comment_text}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add Comment Input */}
        <div className="flex gap-2 pt-2">
          <Textarea
            placeholder={user ? "Add a comment..." : "Sign in to comment"}
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            onFocus={() => {
              if (!user) toast.error("Please sign in to comment");
              if (!comments.length && !loadingComments) onLoadComments(post.id);
            }}
            disabled={!user}
            className="min-h-[36px] h-9 py-2 text-xs resize-none flex-1"
          />
          <Button
            size="sm"
            onClick={() => {
              onAddComment(post.id, commentText);
              setCommentText("");
            }}
            disabled={!user || !commentText.trim()}
            className="h-9 w-9 p-0"
          >
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};

// Helper icon component since we used it in logic but didn't import
function RefreshCw(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M8 16H3v5" />
    </svg>
  )
}
