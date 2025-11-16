/**
 * Artie Image Thumbnail Component
 * Displays images in chat with quick action buttons
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Edit, 
  Maximize2, 
  Layers, 
  Wand2, 
  Download,
  Share2,
  X,
  Eye
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface ArtieImageThumbnailProps {
  imageUrl: string;
  imageName?: string;
  onEdit?: () => void;
  onUpscale?: () => void;
  onBlend?: () => void;
  onOpenStudio?: () => void;
  onViewDetails?: () => void;
  onSave?: () => void;
  onShare?: () => void;
  onDelete?: () => void;
  className?: string;
  showActions?: boolean;
}

export const ArtieImageThumbnail = ({
  imageUrl,
  imageName,
  onEdit,
  onUpscale,
  onBlend,
  onOpenStudio,
  onViewDetails,
  onSave,
  onShare,
  onDelete,
  className,
  showActions = true,
}: ArtieImageThumbnailProps) => {
  const isMobile = useIsMobile();
  const [isExpanded, setIsExpanded] = useState(false);
  const [imageError, setImageError] = useState(false);

  if (imageError) {
    return (
      <div className={cn(
        "rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-center",
        className
      )}>
        <p className="text-sm text-destructive">Failed to load image</p>
        {onDelete && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="mt-2"
          >
            Remove
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={cn("relative group rounded-xl overflow-hidden border border-border bg-muted", className)}>
      {/* Image */}
      <div className="relative">
        <img
          src={imageUrl}
          alt={imageName || "Image"}
          className={cn(
            "w-full h-auto object-contain transition-all duration-300",
            isExpanded ? "max-h-[70vh] cursor-zoom-out" : "max-h-[250px] md:max-h-[300px] cursor-zoom-in"
          )}
          loading="lazy"
          onClick={() => setIsExpanded(!isExpanded)}
          onError={() => setImageError(true)}
        />
        
        {/* Quick Actions Overlay */}
        {showActions && (
          <div className={cn(
            "absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-200",
            isMobile ? "opacity-100" : "opacity-0 group-hover:opacity-100",
            isExpanded && "opacity-100"
          )}>
            <div className={cn(
              "h-full flex items-center justify-center gap-2",
              isMobile ? "flex-wrap p-2" : "p-4"
            )}>
              {/* Mobile: Vertical stack */}
              {isMobile ? (
                <div className="flex flex-col gap-2 w-full">
                  <div className="flex gap-2 flex-wrap justify-center">
                    {onEdit && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit();
                        }}
                        className="flex-1 min-w-[100px] gap-1.5"
                      >
                        <Edit className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                    )}
                    {onOpenStudio && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenStudio();
                        }}
                        className="flex-1 min-w-[100px] gap-1.5"
                      >
                        <Wand2 className="h-3.5 w-3.5" />
                        Studio
                      </Button>
                    )}
                    {onUpscale && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpscale();
                        }}
                        className="flex-1 min-w-[100px] gap-1.5"
                      >
                        <Maximize2 className="h-3.5 w-3.5" />
                        Upscale
                      </Button>
                    )}
                    {onBlend && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          onBlend();
                        }}
                        className="flex-1 min-w-[100px] gap-1.5"
                      >
                        <Layers className="h-3.5 w-3.5" />
                        Blend
                      </Button>
                    )}
                  </div>
                  <div className="flex gap-2 flex-wrap justify-center">
                    {onViewDetails && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewDetails();
                        }}
                        className="gap-1.5"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Details
                      </Button>
                    )}
                    {onSave && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSave();
                        }}
                        className="gap-1.5"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Save
                      </Button>
                    )}
                    {onShare && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          onShare();
                        }}
                        className="gap-1.5"
                      >
                        <Share2 className="h-3.5 w-3.5" />
                        Share
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                /* Desktop: Horizontal layout */
                <>
                  {onEdit && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit();
                      }}
                      className="gap-1.5"
                    >
                      <Edit className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                  )}
                  {onOpenStudio && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenStudio();
                      }}
                      className="gap-1.5"
                    >
                      <Wand2 className="h-3.5 w-3.5" />
                      Studio
                    </Button>
                  )}
                  {onUpscale && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        onUpscale();
                      }}
                      className="gap-1.5"
                    >
                      <Maximize2 className="h-3.5 w-3.5" />
                      Upscale
                    </Button>
                  )}
                  {onBlend && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        onBlend();
                      }}
                      className="gap-1.5"
                    >
                      <Layers className="h-3.5 w-3.5" />
                      Blend
                    </Button>
                  )}
                  {onViewDetails && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewDetails();
                      }}
                      className="gap-1.5"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Details
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Image Name (if provided) */}
      {imageName && (
        <div className="px-3 py-2 bg-surface-3 border-t border-border">
          <p className="text-xs text-muted-foreground truncate">{imageName}</p>
        </div>
      )}
    </div>
  );
};

