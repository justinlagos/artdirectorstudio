import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { ArrowsMaximize, Maximize2, RefreshCw, ZoomIn, ZoomOut } from "lucide-react";

interface AnalysisLayoutProps {
  imageUrl?: string;
  analysisContent: ReactNode;
  className?: string;
  onReplaceImage?: () => void;
}

/**
 * Premium two-column analysis layout with refined aesthetics
 * Desktop: Sticky image on left with shadow and border, scrollable analysis on right
 * Mobile: Stacked layout with refined spacing
 */
export const AnalysisLayout = ({
  imageUrl,
  analysisContent,
  className,
  onReplaceImage,
}: AnalysisLayoutProps) => {
  const [isZoomed, setIsZoomed] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<string>("—");
  const imageContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleZoom = () => setIsZoomed((prev) => !prev);

  const handleFullscreen = () => {
    if (!imageContainerRef.current) return;

    if (!document.fullscreenElement) {
      imageContainerRef.current.requestFullscreen().catch(() => setIsFullscreen(false));
    } else {
      document.exitFullscreen();
    }
  };

  const handleReplace = () => {
    if (onReplaceImage) {
      onReplaceImage();
      return;
    }

    const uploader = document.querySelector<HTMLInputElement>("input[type='file']");
    uploader?.click();
  };

  const aspectRatioLabel = useMemo(() => {
    return aspectRatio;
  }, [aspectRatio]);

  const handleImageLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = event.currentTarget;
    if (!naturalWidth || !naturalHeight) return;

    const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
    const divisor = gcd(naturalWidth, naturalHeight);
    const ratio = `${naturalWidth / divisor}:${naturalHeight / divisor}`;
    setAspectRatio(ratio);
  };

  return (
    <div
      className={cn(
        "w-full grid gap-6 md:gap-8",
        "lg:grid-cols-[1.1fr_1.2fr] lg:gap-10",
        "overflow-hidden",
        className
      )}
    >
      {/* Left Column - Sticky Image Preview with Premium Treatment */}
      {imageUrl && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full lg:sticky lg:top-20 lg:self-start"
        >
          <div
            ref={imageContainerRef}
            className={cn(
              "relative w-full aspect-[4/5] lg:aspect-[5/6] rounded-2xl overflow-hidden",
              "bg-gradient-to-br from-muted/50 to-background shadow-xl ring-1 ring-border/30",
              "transition-all duration-300 hover:shadow-2xl group"
            )}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent opacity-50" />

            <div
              className={cn(
                "absolute inset-0 flex items-center justify-center p-4",
                isZoomed ? "cursor-zoom-out" : "cursor-zoom-in"
              )}
              onClick={toggleZoom}
            >
              <img
                src={imageUrl}
                alt="Analysis preview"
                onLoad={handleImageLoad}
                className={cn(
                  "relative max-h-full max-w-full object-contain transition-transform duration-500",
                  isZoomed ? "scale-[1.35]" : "scale-100"
                )}
                loading="lazy"
              />
            </div>

            <div className="absolute left-4 right-4 top-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/80 backdrop-blur shadow-sm ring-1 ring-border/60 text-xs font-medium text-muted-foreground">
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{aspectRatioLabel}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleZoom}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-background/90 backdrop-blur ring-1 ring-border text-xs font-semibold shadow-sm hover:bg-foreground/5"
                >
                  {isZoomed ? <ZoomOut className="w-3.5 h-3.5" /> : <ZoomIn className="w-3.5 h-3.5" />}
                  {isZoomed ? "Reset" : "Zoom"}
                </button>
                <button
                  type="button"
                  onClick={handleFullscreen}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-background/90 backdrop-blur ring-1 ring-border text-xs font-semibold shadow-sm hover:bg-foreground/5"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  {isFullscreen ? "Exit" : "Full"}
                </button>
              </div>
            </div>

            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs text-muted-foreground">
              <button
                type="button"
                onClick={handleReplace}
                className="underline underline-offset-4 hover:text-foreground transition-colors"
              >
                Replace image
              </button>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/90 backdrop-blur ring-1 ring-border shadow-sm text-[11px] font-semibold">
                <ArrowsMaximize className="w-3.5 h-3.5" />
                <span>Aspect live preview</span>
              </div>
            </div>

            <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10 pointer-events-none" />
          </div>
        </motion.div>
      )}

      {/* Right Column - Scrollable Analysis Content with Animation */}
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="w-full space-y-6"
      >
        {analysisContent}
      </motion.div>
    </div>
  );
};
