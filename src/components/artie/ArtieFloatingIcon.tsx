import { memo } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Sparkles, ImageIcon, Minimize2, X } from 'lucide-react';
import type { ContextImage } from './types';

interface ArtieFloatingIconProps {
  isOpen: boolean;
  isMinimized: boolean;
  isOnline: boolean;
  hasSeenTooltip: boolean;
  showPrompt: boolean;
  contextualPrompt: string;
  latestContextImage: ContextImage | undefined;
  onOpen: () => void;
  onRestore: () => void;
  onMinimize: () => void;
  onClose: () => void;
  onOpenLatestImage: () => void;
  onPromptClick: () => void;
}

export const ArtieFloatingIcon = memo(({
  isOpen,
  isMinimized,
  isOnline,
  hasSeenTooltip,
  showPrompt,
  contextualPrompt,
  latestContextImage,
  onOpen,
  onRestore,
  onMinimize,
  onClose,
  onOpenLatestImage,
  onPromptClick,
}: ArtieFloatingIconProps) => {
  return (
    <div className="fixed bottom-6 right-4 md:bottom-8 md:right-6 z-40 pointer-events-auto">
      {/* Contextual prompt bubble */}
      {showPrompt && contextualPrompt && !isMinimized && (
        <div 
          className="absolute bottom-full right-0 mb-3 animate-slide-up pointer-events-auto"
          onClick={onPromptClick}
        >
          <div className="bg-card border border-border rounded-xl px-4 py-3 shadow-lg max-w-[240px] md:max-w-[280px] cursor-pointer hover:shadow-xl transition-shadow">
            <p className="text-sm font-medium">{contextualPrompt}</p>
            <div className="absolute bottom-0 right-6 transform translate-y-1/2 rotate-45 w-3 h-3 bg-card border-r border-b border-border" />
          </div>
        </div>
      )}

      {/* Animated Artie icon */}
      <Tooltip open={!hasSeenTooltip && !isOpen && !isMinimized} delayDuration={300}>
        <TooltipTrigger asChild>
          <button
            onClick={() => isMinimized ? onRestore() : onOpen()}
            aria-label="Chat with Artie"
            className={cn(
              "relative h-14 w-14 md:h-16 md:w-16 rounded-full shadow-strong transition-all duration-300",
              "bg-gradient-to-br from-primary to-primary/80",
              "hover:scale-110 hover:shadow-2xl",
              "flex items-center justify-center group",
              !isOpen && !isMinimized && "animate-glow-pulse",
              isMinimized && "ring-2 ring-primary ring-offset-2 ring-offset-background"
            )}
          >
            {/* Glow ring */}
            <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse pointer-events-none" />
            
            {/* Icon with subtle animation */}
            <div className="relative">
              <Sparkles className="h-6 w-6 md:h-7 md:w-7 text-primary-foreground transition-transform group-hover:rotate-12" />
            </div>

            {/* Status indicator */}
            <div className={cn(
              "absolute -top-1 -right-1 h-3 w-3 md:h-4 md:w-4 rounded-full border-2 border-background",
              isMinimized ? "bg-amber-500 animate-bounce" : "bg-green-500 animate-pulse"
            )} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="left" className="text-sm max-w-[180px] md:max-w-[200px] mr-2" sideOffset={8}>
          <p className="font-medium">{isMinimized ? "Click to restore Artie" : "Need creative help? Try Artie."}</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
});

ArtieFloatingIcon.displayName = 'ArtieFloatingIcon';

