import { useState, useEffect, useRef } from 'react';
import { X, Minimize2, Maximize2, Sparkles, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ArtieChat } from '@/components/ArtieChat';
import { useUserPreferences } from '@/hooks/useUserPreferences';

type AssistantSize = 'normal' | 'expanded' | 'minimized';

interface ArtieFloatingAssistantProps {
  className?: string;
}

const STORAGE_KEY = 'artie-floating-position';
const STORAGE_SIZE_KEY = 'artie-floating-size';

export const ArtieFloatingAssistant = ({ className }: ArtieFloatingAssistantProps) => {
  const { preferences } = useUserPreferences();
  const [isOpen, setIsOpen] = useState(false);
  const [size, setSize] = useState<AssistantSize>('normal');
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  // Load saved position and size
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedPosition = localStorage.getItem(STORAGE_KEY);
      const savedSize = localStorage.getItem(STORAGE_SIZE_KEY) as AssistantSize | null;
      
      if (savedPosition) {
        try {
          const pos = JSON.parse(savedPosition);
          setPosition(pos);
        } catch {
          // Default position
          setPosition({ x: window.innerWidth - 420, y: window.innerHeight - 600 });
        }
      } else {
        // Default position: bottom-right
        setPosition({ x: window.innerWidth - 420, y: window.innerHeight - 600 });
      }
      
      if (savedSize) {
        setSize(savedSize);
      }
    }
  }, []);

  // Save position and size
  useEffect(() => {
    if (typeof window !== 'undefined' && position.x !== 0 && position.y !== 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(position));
    }
  }, [position]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_SIZE_KEY, size);
    }
  }, [size]);

  // Handle drag start
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!headerRef.current || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setIsDragging(true);
  };

  // Handle drag
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      
      // Constrain to viewport
      const maxX = window.innerWidth - (size === 'expanded' ? 620 : 420);
      const maxY = window.innerHeight - (size === 'minimized' ? 60 : size === 'expanded' ? 700 : 600);
      
      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset, size]);

  // Check if Artie is enabled
  const isArtieEnabled = preferences.experimentalFeatures?.proactiveArtie || false;

  if (!isArtieEnabled && size === 'minimized') {
    return null; // Don't show if disabled and minimized
  }

  const width = size === 'expanded' ? 600 : size === 'minimized' ? 60 : 400;
  const height = size === 'minimized' ? 60 : size === 'expanded' ? 700 : 600;

  if (size === 'minimized') {
    return (
      <div
        ref={containerRef}
        className={cn(
          'fixed z-50 flex items-center justify-center',
          'bg-gradient-to-br from-primary to-primary/80',
          'rounded-full shadow-2xl cursor-pointer transition-all',
          'hover:scale-110 hover:shadow-3xl',
          'animate-glow-pulse',
          className
        )}
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          width: `${width}px`,
          height: `${height}px`,
        }}
        onClick={() => {
          setSize('normal');
          setIsOpen(true);
        }}
      >
        <Sparkles className="h-6 w-6 text-primary-foreground" />
        <div className="absolute -top-1 -right-1 h-4 w-4 bg-green-500 rounded-full border-2 border-background animate-pulse" />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'fixed z-50 flex flex-col',
        'bg-background border border-border rounded-lg shadow-2xl',
        'transition-all duration-200',
        isDragging && 'cursor-grabbing',
        className
      )}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${width}px`,
        height: `${height}px`,
      }}
    >
      {/* Header - Draggable */}
      <div
        ref={headerRef}
        onMouseDown={handleMouseDown}
        className={cn(
          'flex items-center justify-between px-4 py-2 border-b border-border',
          'bg-muted/30 cursor-grab active:cursor-grabbing',
          'select-none'
        )}
      >
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Artie Assistant</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setSize(size === 'expanded' ? 'normal' : 'expanded')}
            title={size === 'expanded' ? 'Normal size' : 'Expand'}
          >
            {size === 'expanded' ? (
              <Maximize2 className="h-3 w-3" />
            ) : (
              <Maximize2 className="h-3 w-3 rotate-45" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => {
              setSize('minimized');
              setIsOpen(false);
            }}
            title="Minimize"
          >
            <Minimize2 className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => {
              setIsOpen(false);
              setSize('minimized');
            }}
            title="Close"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <div className="h-full">
          <ArtieChat />
        </div>
      </div>
    </div>
  );
};
