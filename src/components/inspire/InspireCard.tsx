import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  Heart, 
  Bookmark, 
  UserPlus, 
  Eye, 
  Wand2,
  MoreVertical
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useInspireSocial } from "@/hooks/useInspireSocial";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface InspireCardProps {
  id: string;
  imageUrl: string | null;
  prompt: string | null;
  creator: {
    id: string;
    name: string;
  };
  viewCount: number;
  likeCount: number;
  bookmarkCount: number;
  createdAt: string;
  onClick: () => void;
  onRemix?: () => void;
}

export const InspireCard = ({
  id,
  imageUrl,
  prompt,
  creator,
  viewCount,
  likeCount,
  bookmarkCount,
  createdAt,
  onClick,
  onRemix,
}: InspireCardProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showOverlay, setShowOverlay] = useState(false);
  const {
    isLiked,
    isBookmarked,
    toggleLike,
    toggleBookmark,
  } = useInspireSocial(id);

  const handleRemix = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      navigate("/auth");
      return;
    }
    if (onRemix) {
      onRemix();
    }
  };

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleLike();
  };

  const handleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleBookmark();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return "Today";
    if (diffInDays === 1) return "Yesterday";
    if (diffInDays < 7) return `${diffInDays}d ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)}w ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <TooltipProvider>
      <Card
        className="group cursor-pointer overflow-hidden hover:shadow-strong transition-all duration-300 interactive-card border-border/50"
        onClick={onClick}
        onMouseEnter={() => setShowOverlay(true)}
        onMouseLeave={() => setShowOverlay(false)}
      >
        <div className="relative aspect-square overflow-hidden bg-muted">
          {imageUrl && (
            <>
              <img
                src={imageUrl}
                alt={prompt?.slice(0, 50) || "Generated content"}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
              
              {/* Hover Overlay */}
              <div 
                className={`absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent transition-opacity duration-300 ${
                  showOverlay ? "opacity-100" : "opacity-0"
                }`}
              >
                <div className="absolute inset-0 p-4 flex flex-col justify-between">
                  {/* Top Actions */}
                  <div className="flex justify-end gap-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant={isLiked ? "default" : "secondary"}
                          className="h-8 w-8 p-0 rounded-full"
                          onClick={handleLike}
                        >
                          <Heart className={`w-4 h-4 ${isLiked ? "fill-current" : ""}`} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{isLiked ? "Unlike" : "Like"}</p>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant={isBookmarked ? "default" : "secondary"}
                          className="h-8 w-8 p-0 rounded-full"
                          onClick={handleBookmark}
                        >
                          <Bookmark className={`w-4 h-4 ${isBookmarked ? "fill-current" : ""}`} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{isBookmarked ? "Remove bookmark" : "Bookmark"}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>

                  {/* Bottom Info */}
                  <div className="space-y-3">
                    {prompt && (
                      <p className="text-white text-sm line-clamp-2 font-medium">
                        {prompt}
                      </p>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-white/80 text-xs">
                        <span className="font-medium">{creator.name}</span>
                      </div>
                      
                      <Button
                        size="sm"
                        variant="default"
                        className="h-8 gap-1.5"
                        onClick={handleRemix}
                      >
                        <Wand2 className="w-3.5 h-3.5" />
                        Remix
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-3 text-muted-foreground">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1">
                    <Heart className="w-3.5 h-3.5" />
                    <span>{likeCount}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent><p>Likes</p></TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" />
                    <span>{viewCount}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent><p>Views</p></TooltipContent>
              </Tooltip>
            </div>
            
            <span className="text-xs text-muted-foreground">
              {formatDate(createdAt)}
            </span>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};
