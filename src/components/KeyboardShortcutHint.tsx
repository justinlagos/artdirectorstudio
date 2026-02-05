import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Kbd } from '@/components/ui/kbd';

interface KeyboardShortcutHintProps {
  action: string;
  shortcut: string;
  targetElement?: HTMLElement | null;
  onClickCount?: number; // Number of times button was clicked
  threshold?: number; // Show hint after this many clicks (default: 3)
}

const DISMISSED_HINTS_KEY = 'dismissed-shortcut-hints';
const CLICK_COUNTS_KEY = 'shortcut-hint-click-counts';

export const KeyboardShortcutHint = ({
  action,
  shortcut,
  targetElement,
  onClickCount = 0,
  threshold = 3,
}: KeyboardShortcutHintProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const hintRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check if hint was dismissed
    const dismissed = getDismissedHints();
    if (dismissed.includes(action)) {
      return;
    }

    // Check click count
    const counts = getClickCounts();
    const currentCount = counts[action] || 0;
    
    // Show hint if threshold reached
    if (onClickCount >= threshold || currentCount >= threshold) {
      setIsVisible(true);
      
      // Update click count
      if (onClickCount > 0) {
        updateClickCount(action, onClickCount);
      }

      // Position hint near target element
      if (targetElement) {
        const rect = targetElement.getBoundingClientRect();
        setPosition({
          top: rect.bottom + 8,
          left: rect.left,
        });
      } else {
        // Default position (center bottom)
        setPosition({
          top: window.innerHeight - 100,
          left: window.innerWidth / 2 - 150,
        });
      }
    }
  }, [action, onClickCount, threshold, targetElement]);

  const handleDismiss = () => {
    setIsVisible(false);
    addDismissedHint(action);
  };

  if (!isVisible || !position) return null;

  return (
    <div
      ref={hintRef}
      className={cn(
        "fixed z-50 bg-background border border-primary/20 rounded-lg shadow-lg p-3",
        "animate-in fade-in slide-in-from-bottom-2 duration-300"
      )}
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        transform: 'translateX(-50%)',
      }}
    >
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Pro tip:</span>
        <span className="text-sm font-medium">Press</span>
        <Kbd>{shortcut}</Kbd>
        <span className="text-sm font-medium">to {action.replace(/-/g, ' ')}</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 ml-1"
          onClick={handleDismiss}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
};

/**
 * Get dismissed hints from localStorage
 */
function getDismissedHints(): string[] {
  const stored = localStorage.getItem(DISMISSED_HINTS_KEY);
  if (stored) {
    try {
      return JSON.parse(stored) as string[];
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Add a hint to dismissed list
 */
function addDismissedHint(action: string) {
  const dismissed = getDismissedHints();
  if (!dismissed.includes(action)) {
    dismissed.push(action);
    localStorage.setItem(DISMISSED_HINTS_KEY, JSON.stringify(dismissed));
  }
}

/**
 * Get click counts from localStorage
 */
function getClickCounts(): Record<string, number> {
  const stored = localStorage.getItem(CLICK_COUNTS_KEY);
  if (stored) {
    try {
      return JSON.parse(stored) as Record<string, number>;
    } catch {
      return {};
    }
  }
  return {};
}

/**
 * Update click count for an action
 */
function updateClickCount(action: string, count: number) {
  const counts = getClickCounts();
  counts[action] = Math.max(counts[action] || 0, count);
  localStorage.setItem(CLICK_COUNTS_KEY, JSON.stringify(counts));
}

/**
 * Hook to track button clicks for contextual hints
 */
export function useShortcutHintTracking(action: string) {
  const [clickCount, setClickCount] = useState(0);

  const handleClick = () => {
    const counts = getClickCounts();
    const newCount = (counts[action] || 0) + 1;
    counts[action] = newCount;
    localStorage.setItem(CLICK_COUNTS_KEY, JSON.stringify(counts));
    setClickCount(newCount);
  };

  return {
    clickCount,
    handleClick,
  };
}
