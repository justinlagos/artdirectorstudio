import { useRef, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface PreviewCanvasProps {
  imageUrl: string;
  filterStyle?: string;
  selectedRegion?: { x: number; y: number; width: number; height: number } | null;
  onRegionSelect?: (region: { x: number; y: number; width: number; height: number } | null) => void;
  className?: string;
}

export const PreviewCanvas = ({
  imageUrl,
  filterStyle,
  selectedRegion,
  onRegionSelect,
  className,
}: PreviewCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [currentPos, setCurrentPos] = useState<{ x: number; y: number } | null>(null);
  const [imageData, setImageData] = useState<{ width: number; height: number; scale: number; offsetX: number; offsetY: number } | null>(null);

  useEffect(() => {
    if (!imageRef.current || !containerRef.current) return;

    const img = imageRef.current;
    const container = containerRef.current;
    
    const updateImageData = () => {
      const rect = container.getBoundingClientRect();
      const scale = Math.min(rect.width / img.naturalWidth, rect.height / img.naturalHeight, 1);
      const displayWidth = img.naturalWidth * scale;
      const displayHeight = img.naturalHeight * scale;
      const offsetX = (rect.width - displayWidth) / 2;
      const offsetY = (rect.height - displayHeight) / 2;
      
      setImageData({ width: img.naturalWidth, height: img.naturalHeight, scale, offsetX, offsetY });
    };

    if (img.complete) {
      updateImageData();
    } else {
      img.onload = updateImageData;
    }
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

      // Draw semi-transparent overlay
      ctx.fillStyle = "rgba(59, 130, 246, 0.3)";
      ctx.fillRect(regionX, regionY, regionWidth, regionHeight);

      // Draw border
      ctx.strokeStyle = "rgb(59, 130, 246)";
      ctx.lineWidth = 2;
      ctx.strokeRect(regionX, regionY, regionWidth, regionHeight);
    }

    // Draw temporary selection while dragging
    if (isSelecting && startPos && currentPos && imageData) {
      const x = Math.min(startPos.x, currentPos.x);
      const y = Math.min(startPos.y, currentPos.y);
      const width = Math.abs(currentPos.x - startPos.x);
      const height = Math.abs(currentPos.y - startPos.y);

      ctx.fillStyle = "rgba(59, 130, 246, 0.2)";
      ctx.fillRect(x, y, width, height);
      ctx.strokeStyle = "rgb(59, 130, 246)";
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, width, height);
    }
  }, [selectedRegion, isSelecting, startPos, currentPos, imageData]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!onRegionSelect || !containerRef.current || !imageData) return;
    e.preventDefault();
    
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
    if (!isSelecting || !startPos || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setCurrentPos({ x, y });
  }, [isSelecting, startPos]);

  const handlePointerUp = useCallback(() => {
    if (!isSelecting || !startPos || !currentPos || !onRegionSelect || !imageData) return;
    
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
  }, [isSelecting, startPos, currentPos, onRegionSelect, imageData]);

  // Touch event handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!onRegionSelect || !containerRef.current || !imageData) return;
    e.preventDefault();
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
    if (!isSelecting || !startPos || !containerRef.current) return;
    e.preventDefault();
    const touch = e.touches[0];
    const rect = containerRef.current.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    setCurrentPos({ x, y });
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isSelecting || !startPos || !currentPos || !onRegionSelect || !imageData) return;
    e.preventDefault();
    
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
      onMouseDown={onRegionSelect ? handleMouseDown : undefined}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={onRegionSelect ? handleTouchStart : undefined}
      onTouchMove={onRegionSelect ? handleTouchMove : undefined}
      onTouchEnd={onRegionSelect ? handleTouchEnd : undefined}
      style={{ 
        cursor: onRegionSelect ? (isSelecting ? "crosshair" : "crosshair") : "default", 
        touchAction: onRegionSelect ? "none" : "auto",
        WebkitTapHighlightColor: "transparent",
        userSelect: "none"
      }}
    >
      <img
        ref={imageRef}
        src={imageUrl}
        alt="Preview"
        className="max-h-full w-auto h-auto object-contain transition-all duration-200"
        style={{ filter: filterStyle }}
      />
      {onRegionSelect && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 pointer-events-none"
        />
      )}
    </div>
  );
};


