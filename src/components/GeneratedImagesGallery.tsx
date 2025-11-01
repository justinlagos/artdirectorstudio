import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Trash2, Maximize2, Image as ImageIcon } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";

interface GeneratedImage {
  id: string;
  imageUrl: string;
  prompt: string;
  timestamp: Date;
}

interface GeneratedImagesGalleryProps {
  images: GeneratedImage[];
  onDelete?: (id: string) => void;
}

export const GeneratedImagesGallery = ({ images, onDelete }: GeneratedImagesGalleryProps) => {
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);
  const [expandedPrompts, setExpandedPrompts] = useState<Set<string>>(new Set());

  const handleDownload = (image: GeneratedImage, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const link = document.createElement('a');
    link.href = image.imageUrl;
    link.download = `generated-${image.timestamp.getTime()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("Image downloaded!");
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(id);
      toast.success("Image deleted");
    }
  };

  const togglePrompt = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedPrompts(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  if (images.length === 0) {
    return (
      <div className="text-center py-12 space-y-4">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            <ImageIcon className="w-8 h-8 text-muted-foreground" />
          </div>
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">No images generated yet</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Generate your first AI image from the analysis above to get started
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <h3 className="text-xl font-semibold">Generated Images ({images.length})</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {images.map((image) => {
            const isExpanded = expandedPrompts.has(image.id);
            const truncatedPrompt = image.prompt.length > 100 
              ? image.prompt.slice(0, 100) + "..." 
              : image.prompt;

            return (
              <Card 
                key={image.id} 
                className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
                onClick={() => setSelectedImage(image)}
              >
                <div className="aspect-square relative overflow-hidden bg-muted">
                  <img
                    src={image.imageUrl}
                    alt={`Generated: ${image.prompt.slice(0, 50)}`}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <Maximize2 className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
                
                <div className="p-4 space-y-3">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {isExpanded ? image.prompt : truncatedPrompt}
                    </p>
                    {image.prompt.length > 100 && (
                      <button
                        onClick={(e) => togglePrompt(image.id, e)}
                        className="text-xs text-primary hover:underline"
                      >
                        {isExpanded ? "Show less" : "Show more"}
                      </button>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{formatTimestamp(image.timestamp)}</span>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="flex-1"
                      onClick={(e) => handleDownload(image, e)}
                    >
                      <Download className="w-3 h-3 mr-1" />
                      Download
                    </Button>
                    {onDelete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleDelete(image.id, e)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Lightbox Dialog */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-5xl p-0">
          {selectedImage && (
            <div className="relative">
              <img
                src={selectedImage.imageUrl}
                alt="Full size view"
                className="w-full h-auto max-h-[85vh] object-contain"
              />
              <div className="p-6 space-y-3">
                <p className="text-sm text-muted-foreground">
                  {selectedImage.prompt}
                </p>
                <div className="flex gap-2">
                  <Button
                    onClick={(e) => handleDownload(selectedImage, e)}
                    variant="secondary"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};