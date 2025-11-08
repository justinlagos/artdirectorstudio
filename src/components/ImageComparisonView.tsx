import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BeforeAfterSlider } from "@/components/ui/before-after-slider";
import { Download, X, ChevronLeft, ChevronRight, Eye, Maximize2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface GeneratedImage {
  id: string;
  imageUrl: string;
  prompt: string;
  timestamp: Date;
}

interface ImageComparisonViewProps {
  originalImage: string;
  generatedImages: GeneratedImage[];
  onClose?: () => void;
}

export const ImageComparisonView = ({ 
  originalImage, 
  generatedImages,
  onClose 
}: ImageComparisonViewProps) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showFullscreen, setShowFullscreen] = useState(false);

  if (generatedImages.length === 0) {
    return null;
  }

  const currentImage = generatedImages[selectedIndex];

  const handleDownloadComparison = () => {
    // Download the current generated image
    const link = document.createElement('a');
    link.href = currentImage.imageUrl;
    link.download = `comparison-${currentImage.timestamp.getTime()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Image downloaded!");
  };

  const handleNext = () => {
    setSelectedIndex((prev) => (prev + 1) % generatedImages.length);
  };

  const handlePrevious = () => {
    setSelectedIndex((prev) => (prev - 1 + generatedImages.length) % generatedImages.length);
  };

  const formatTimestamp = (date: Date) => {
    return date.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <>
      <Card className="overflow-hidden">
        <div className="p-6 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-semibold">Before & After Comparison</h3>
                <Badge variant="secondary">
                  {selectedIndex + 1} / {generatedImages.length}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Drag the slider to compare your original image with AI-generated variations
              </p>
            </div>
            {onClose && (
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Before/After Slider */}
          <div className="relative">
            <BeforeAfterSlider
              beforeImage={originalImage}
              afterImage={currentImage.imageUrl}
              beforeLabel="Original"
              afterLabel="Generated"
              className="w-full"
            />
            
            {/* Navigation Arrows (on larger screens) */}
            {generatedImages.length > 1 && (
              <>
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-20 shadow-strong hidden md:flex"
                  onClick={handlePrevious}
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-20 shadow-strong hidden md:flex"
                  onClick={handleNext}
                >
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </>
            )}

            {/* Fullscreen Button - Hidden on Mobile */}
            <Button
              variant="secondary"
              size="icon"
              className="absolute bottom-4 right-4 z-20 shadow-strong hidden md:flex"
              onClick={() => setShowFullscreen(true)}
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
          </div>

          {/* Current Image Info */}
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Eye className="w-3 h-3" />
                  <span>Generated {formatTimestamp(currentImage.timestamp)}</span>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {currentImage.prompt}
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleDownloadComparison}
              >
                <Download className="w-3 h-3 mr-2" />
                Download
              </Button>
            </div>
          </div>

          {/* Quick Toggle Buttons */}
          {generatedImages.length > 1 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Quick Switch</p>
                <div className="flex gap-2 md:hidden">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrevious}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNext}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              <ScrollArea className="w-full">
                <div className="flex gap-2 pb-2">
                  {generatedImages.map((image, index) => (
                    <button
                      key={image.id}
                      onClick={() => setSelectedIndex(index)}
                      className={`relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                        selectedIndex === index
                          ? 'border-primary shadow-medium scale-105'
                          : 'border-border hover:border-primary/50 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={image.imageUrl}
                        alt={`Variation ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      {selectedIndex === index && (
                        <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                          <Badge className="text-xs">
                            {index + 1}
                          </Badge>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </div>
          )}
        </div>
      </Card>

      {/* Fullscreen Dialog */}
      <Dialog open={showFullscreen} onOpenChange={setShowFullscreen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-4">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>Fullscreen Comparison</span>
                <Badge variant="secondary">
                  {selectedIndex + 1} / {generatedImages.length}
                </Badge>
              </div>
            </DialogTitle>
          </DialogHeader>
          
          <div className="relative mt-4">
            <BeforeAfterSlider
              beforeImage={originalImage}
              afterImage={currentImage.imageUrl}
              beforeLabel="Original"
              afterLabel="Generated"
              className="w-full h-[calc(85vh-120px)]"
            />
            
            {/* Navigation in Fullscreen */}
            {generatedImages.length > 1 && (
              <>
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-20 shadow-strong"
                  onClick={handlePrevious}
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-20 shadow-strong"
                  onClick={handleNext}
                >
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </>
            )}
          </div>

          {/* Quick Toggle in Fullscreen */}
          {generatedImages.length > 1 && (
            <div className="mt-4">
              <ScrollArea className="w-full">
                <div className="flex gap-2 pb-2 justify-center">
                  {generatedImages.map((image, index) => (
                    <button
                      key={image.id}
                      onClick={() => setSelectedIndex(index)}
                      className={`relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                        selectedIndex === index
                          ? 'border-primary shadow-medium scale-110'
                          : 'border-border hover:border-primary/50 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={image.imageUrl}
                        alt={`Variation ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
