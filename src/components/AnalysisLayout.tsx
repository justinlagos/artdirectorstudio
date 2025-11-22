import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface AnalysisLayoutProps {
  imageUrl?: string;
  analysisContent: ReactNode;
  className?: string;
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
}: AnalysisLayoutProps) => {
  return (
    <div
      className={cn(
        "w-full grid gap-6 md:gap-8",
        "lg:grid-cols-[2fr_3fr] lg:gap-12",
        className
      )}
    >
      {/* Left Column - Sticky Image Preview with Premium Treatment */}
      {imageUrl && (
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full lg:sticky lg:top-24 lg:self-start lg:max-h-[calc(100vh-8rem)]"
        >
          <div className="relative w-full aspect-square lg:aspect-auto lg:h-full rounded-2xl overflow-hidden bg-gradient-to-br from-muted/50 to-background shadow-xl ring-1 ring-border/30 hover:ring-border/50 transition-all duration-300 hover:shadow-2xl group">
            {/* Subtle background pattern */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent opacity-50" />
            
            <img
              src={imageUrl}
              alt="Analysis preview"
              className="relative w-full h-full object-contain group-hover:scale-[1.02] transition-transform duration-500"
              loading="lazy"
            />
            
            {/* Refined border glow effect */}
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
