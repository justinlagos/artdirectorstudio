import { useRef, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface PreviewCanvasProps {
  imageUrl: string;
  filterStyle?: string;
  selectedRegion?: { x: number; y: number; width: number; height: number } | null;
  onRegionSelect?: (region: { x: number; y: number; width: number; height: number } | null) => void;
  isSelectionMode?: boolean;
  className?: string;
}

export const PreviewCanvas = ({
  imageUrl,
  filterStyle,
  selectedRegion,
  onRegionSelect,
  isSelectionMode = false,
  className,
}: PreviewCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [currentPos, setCurrentPos] = useState<{ x: number; y: number } | null>(null);
  const [imageData, setImageData] = useState<{ width: number; height: number; scale: number; offsetX: number; offsetY: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!imageRef.current || !containerRef.current) return;

    const img = imageRef.current;
    const container = containerRef.current;
    
    setIsLoading(true);
    setLoadError(null);
    
    const updateImageData = () => {
      const rect = container.getBoundingClientRect();
      const scale = Math.min(rect.width / img.naturalWidth, rect.height / img.naturalHeight, 1);
      const displayWidth = img.naturalWidth * scale;
      const displayHeight = img.naturalHeight * scale;
      const offsetX = (rect.width - displayWidth) / 2;
      const offsetY = (rect.height - displayHeight) / 2;
      
      setImageData({ width: img.naturalWidth, height: img.naturalHeight, scale, offsetX, offsetY });
      setIsLoading(false);
    };

    const handleError = () => {
      setIsLoading(false);
      setLoadError("Failed to load image. Please check the URL and try again.");
    };

    if (img.complete && img.naturalWidth > 0) {
      updateImageData();
    } else {
      img.onload = updateImageData;
      img.onerror = handleError;
    }

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [imageUrl]);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current || !imageData) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = containerRef.current.offsetWidth;
    canvas.height = containerRef.current.offsetHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw selection region
    if (selectedRegion) {
      const regionX = imageData.offsetX + (selectedRegion.x * imageData.scale);
      const regionY = imageData.offsetY + (selectedRegion.y * imageData.scale);
      const regionWidth = selectedRegion.width * imageData.scale;
      const regionHeight = selectedRegion.height * imageData.scale;

      // Draw dark overlay outside selection
      ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Clear the selection area (punch through)
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillRect(regionX, regionY, regionWidth, regionHeight);
      
      // Reset composite operation
      ctx.globalCompositeOperation = "source-over";

      // Draw semi-transparent highlight inside selection
      ctx.fillStyle = "rgba(59, 130, 246, 0.2)";
      ctx.fillRect(regionX, regionY, regionWidth, regionHeight);

      // Draw border with handles
      ctx.strokeStyle = "rgb(59, 130, 246)";
      ctx.lineWidth = 2;
      ctx.strokeRect(regionX, regionY, regionWidth, regionHeight);
      
      // Draw corner handles
      const handleSize = 8;
      ctx.fillStyle = "rgb(59, 130, 246)";
      ctx.fillRect(regionX - handleSize/2, regionY - handleSize/2, handleSize, handleSize);
      ctx.fillRect(regionX + regionWidth - handleSize/2, regionY - handleSize/2, handleSize, handleSize);
      ctx.fillRect(regionX - handleSize/2, regionY + regionHeight - handleSize/2, handleSize, handleSize);
      ctx.fillRect(regionX + regionWidth - handleSize/2, regionY + regionHeight - handleSize/2, handleSize, handleSize);
    }

    // Draw temporary selection while dragging
    if (isSelecting && startPos && currentPos && imageData) {
      const x = Math.min(startPos.x, currentPos.x);
      const y = Math.min(startPos.y, currentPos.y);
      const width = Math.abs(currentPos.x - startPos.x);
      const height = Math.abs(currentPos.y - startPos.y);

      // Draw dark overlay outside selection
      ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Clear the selection area (punch through)
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillRect(x, y, width, height);
      
      // Reset composite operation
      ctx.globalCompositeOperation = "source-over";

      // Draw semi-transparent highlight inside selection
      ctx.fillStyle = "rgba(59, 130, 246, 0.2)";
      ctx.fillRect(x, y, width, height);
      
      // Draw border
      ctx.strokeStyle = "rgb(59, 130, 246)";
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, width, height);
    }
  }, [selectedRegion, isSelecting, startPos, currentPos, imageData]);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only handle selection if in selection mode
    if (!isSelectionMode || !onRegionSelect || !containerRef.current || !imageData) return;
    
    // Prevent default to stop any image dragging/panning
    e.preventDefault();
    e.stopPropagation();
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Check if click is within image bounds
    if (x < imageData.offsetX || x > imageData.offsetX + (imageData.width * imageData.scale) ||
        y < imageData.offsetY || y > imageData.offsetY + (imageData.height * imageData.scale)) {
      return;
    }
    
    setIsSelecting(true);
    setStartPos({ x, y });
    setCurrentPos({ x, y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isSelectionMode || !isSelecting || !startPos || !containerRef.current) return;
    
    // Prevent default to stop any image dragging/panning
    e.preventDefault();
    e.stopPropagation();
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setCurrentPos({ x, y });
  };

  const handleMouseUp = (e?: React.MouseEvent) => {
    if (e && isSelectionMode) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (!isSelectionMode || !isSelecting || !startPos || !currentPos || !onRegionSelect || !imageData) return;
    
    const x = Math.max(imageData.offsetX, Math.min(startPos.x, currentPos.x));
    const y = Math.max(imageData.offsetY, Math.min(startPos.y, currentPos.y));
    const width = Math.abs(currentPos.x - startPos.x);
    const height = Math.abs(currentPos.y - startPos.y);

    // Convert to image coordinates
    const imageX = (x - imageData.offsetX) / imageData.scale;
    const imageY = (y - imageData.offsetY) / imageData.scale;
    const imageWidth = width / imageData.scale;
    const imageHeight = height / imageData.scale;

    if (imageWidth > 10 && imageHeight > 10) {
      onRegionSelect({ 
        x: Math.max(0, imageX), 
        y: Math.max(0, imageY), 
        width: Math.min(imageWidth, imageData.width - Math.max(0, imageX)), 
        height: Math.min(imageHeight, imageData.height - Math.max(0, imageY))
      });
    } else {
      onRegionSelect(null);
    }

    setIsSelecting(false);
    setStartPos(null);
    setCurrentPos(null);
  };

  // Touch event handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    // Only handle selection if in selection mode
    if (!isSelectionMode || !onRegionSelect || !containerRef.current || !imageData) return;
    
    // Only prevent default for single touch (selection mode)
    // Allow multi-touch for pinch zoom (but don't select)
    if (e.touches.length === 1) {
      e.preventDefault();
      e.stopPropagation();
    } else {
      // Multi-touch: allow pan/zoom, don't select
      return;
    }
    
    const touch = e.touches[0];
    const rect = containerRef.current.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    
    // Check if touch is within image bounds
    if (x < imageData.offsetX || x > imageData.offsetX + (imageData.width * imageData.scale) ||
        y < imageData.offsetY || y > imageData.offsetY + (imageData.height * imageData.scale)) {
      return;
    }
    
    setIsSelecting(true);
    setStartPos({ x, y });
    setCurrentPos({ x, y });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSelectionMode || !isSelecting || !startPos || !containerRef.current) return;
    
    // Only prevent default for single touch (selection mode)
    if (e.touches.length === 1) {
      e.preventDefault();
      e.stopPropagation();
    } else {
      // Multi-touch: allow pan/zoom, cancel selection
      setIsSelecting(false);
      setStartPos(null);
      setCurrentPos(null);
      return;
    }
    
    const touch = e.touches[0];
    const rect = containerRef.current.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    setCurrentPos({ x, y });
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isSelectionMode || !isSelecting || !startPos || !currentPos || !onRegionSelect || !imageData) return;
    
    if (e.touches.length === 0 && isSelectionMode) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    const x = Math.max(imageData.offsetX, Math.min(startPos.x, currentPos.x));
    const y = Math.max(imageData.offsetY, Math.min(startPos.y, currentPos.y));
    const width = Math.abs(currentPos.x - startPos.x);
    const height = Math.abs(currentPos.y - startPos.y);

    // Convert to image coordinates
    const imageX = (x - imageData.offsetX) / imageData.scale;
    const imageY = (y - imageData.offsetY) / imageData.scale;
    const imageWidth = width / imageData.scale;
    const imageHeight = height / imageData.scale;

    if (imageWidth > 10 && imageHeight > 10) {
      onRegionSelect({ 
        x: Math.max(0, imageX), 
        y: Math.max(0, imageY), 
        width: Math.min(imageWidth, imageData.width - Math.max(0, imageX)), 
        height: Math.min(imageHeight, imageData.height - Math.max(0, imageY))
      });
    } else {
      onRegionSelect(null);
    }

    setIsSelecting(false);
    setStartPos(null);
    setCurrentPos(null);
  };

  return (
    <div
      ref={containerRef}
      className={cn("relative rounded-xl overflow-hidden bg-muted flex items-center justify-center border border-border/50 shadow-sm", className)}
      onMouseDown={isSelectionMode ? handleMouseDown : undefined}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={isSelectionMode ? handleTouchStart : undefined}
      onTouchMove={isSelectionMode ? handleTouchMove : undefined}
      onTouchEnd={isSelectionMode ? handleTouchEnd : undefined}
      style={{ 
        cursor: isSelectionMode ? (isSelecting ? "crosshair" : "crosshair") : "default", 
        touchAction: isSelectionMode ? "none" : "auto",
        WebkitTapHighlightColor: "transparent",
        userSelect: "none",
        pointerEvents: "auto"
      }}
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-muted-foreground">Loading image...</p>
          </div>
        </div>
      )}
      {loadError && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
          <div className="text-center p-4">
            <p className="text-sm text-destructive font-medium">Error loading image</p>
            <p className="text-xs text-muted-foreground mt-1">{loadError}</p>
          </div>
        </div>
      )}
      <img
        ref={imageRef}
        src={imageUrl}
        alt="Preview"
        className={cn(
          "max-h-full w-auto h-auto object-contain transition-all duration-200 pointer-events-none",
          isLoading || loadError ? "opacity-0" : "opacity-100"
        )}
        style={{ filter: filterStyle }}
        draggable={false}
      />
      {(isSelectionMode || selectedRegion) && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 pointer-events-none"
        />
      )}
    </div>
  );
};


