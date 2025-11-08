import { Loader2 } from "lucide-react";

export const LoadingState = () => {
  return (
    <div className="flex flex-col items-center justify-center py-24 space-y-8">
      <div className="relative">
        {/* Animated rings */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-20 h-20 rounded-full border-2 border-primary/20 animate-ping" />
        </div>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-16 h-16 rounded-full border-2 border-primary/40 animate-pulse" />
        </div>
        
        {/* Central icon */}
        <div className="relative w-12 h-12 flex items-center justify-center">
          <Loader2 className="w-12 h-12 animate-spin" />
        </div>
      </div>
      
      <div className="text-center space-y-3 max-w-sm mx-auto px-4">
        <p className="text-lg font-medium animate-pulse-subtle">
          Analyzing visual composition
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Examining lighting, color harmony,<br />
          artistic style, and creative intent…
        </p>
      </div>
    </div>
  );
};
