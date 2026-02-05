import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/kbd";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useScrollLock } from "@/hooks/useScrollLock";
import { Edit, Maximize2, Layers, Wand2, MessageSquare, ChevronDown, ChevronUp, Keyboard, X, Trophy } from "lucide-react";
import { useEffect, useState } from "react";

interface ShortcutItem {
  key: string;
  description: string;
  icon: React.ElementType;
  category: string;
  action: string; // Unique identifier for tracking mastery
}

interface KeyboardShortcutsOverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MASTERED_STORAGE_KEY = 'mastered-shortcuts';
const TOTAL_SHORTCUTS = 20; // Total shortcuts available (including future ones)

export const KeyboardShortcutsOverlay = ({ open, onOpenChange }: KeyboardShortcutsOverlayProps) => {
  useScrollLock(open, 'keyboard-shortcuts-overlay');
  const [masteredShortcuts, setMasteredShortcuts] = useState<Set<string>>(new Set());

  // Load mastered shortcuts from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(MASTERED_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as string[];
        setMasteredShortcuts(new Set(parsed));
      } catch {
        // Ignore parse errors
      }
    }
  }, []);

  const shortcuts: ShortcutItem[] = [
    // Navigation
    {
      key: 'Esc',
      description: 'Close modal/dialog',
      icon: X,
      category: 'Navigation',
      action: 'close-modal',
    },
    {
      key: '?',
      description: 'Show keyboard shortcuts',
      icon: Keyboard,
      category: 'Navigation',
      action: 'show-shortcuts',
    },
    {
      key: 'J',
      description: 'Navigate to next image',
      icon: ChevronDown,
      category: 'Navigation',
      action: 'next-image',
    },
    {
      key: 'K',
      description: 'Navigate to previous image',
      icon: ChevronUp,
      category: 'Navigation',
      action: 'prev-image',
    },
    // Tools
    {
      key: 'E',
      description: 'Edit selected image',
      icon: Edit,
      category: 'Tools',
      action: 'edit-image',
    },
    {
      key: 'U',
      description: 'Upscale selected image',
      icon: Maximize2,
      category: 'Tools',
      action: 'upscale-image',
    },
    {
      key: 'B',
      description: 'Blend selected images',
      icon: Layers,
      category: 'Tools',
      action: 'blend-images',
    },
    {
      key: 'G',
      description: 'Generate new image',
      icon: Wand2,
      category: 'Tools',
      action: 'generate-image',
    },
    // View
    {
      key: 'A',
      description: 'Toggle Artie chat',
      icon: MessageSquare,
      category: 'View',
      action: 'toggle-artie',
    },
  ];

  const categories = Array.from(new Set(shortcuts.map(s => s.category)));
  const masteredCount = masteredShortcuts.size;
  const masteryPercentage = Math.round((masteredCount / TOTAL_SHORTCUTS) * 100);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Keyboard className="w-6 h-6" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Power user shortcuts for faster workflow. Enable in Settings → Experimental Features.
          </DialogDescription>
        </DialogHeader>

        {/* Gamification Badge */}
        {masteredCount > 0 && (
          <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm font-semibold">Shortcut Mastery</p>
                  <p className="text-xs text-muted-foreground">
                    You've mastered {masteredCount}/{TOTAL_SHORTCUTS} shortcuts
                  </p>
                </div>
              </div>
              <Badge variant="secondary" className="text-sm">
                {masteryPercentage}%
              </Badge>
            </div>
            <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-300"
                style={{ width: `${masteryPercentage}%` }}
              />
            </div>
          </div>
        )}

        <div className="space-y-6 py-4">
          {categories.map((category) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                {category}
              </h3>
              <div className="space-y-2">
                {shortcuts
                  .filter((s) => s.category === category)
                  .map((shortcut) => {
                    const Icon = shortcut.icon;
                    const isMastered = masteredShortcuts.has(shortcut.action);
                    
                    return (
                      <div
                        key={shortcut.action}
                        className={`
                          flex items-center justify-between py-2.5 px-3 rounded-lg transition-colors
                          ${isMastered 
                            ? 'bg-primary/5 border border-primary/20' 
                            : 'hover:bg-muted/50'
                          }
                        `}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className={`w-4 h-4 ${isMastered ? 'text-primary' : 'text-muted-foreground'}`} />
                          <span className={`text-sm ${isMastered ? 'font-medium' : ''}`}>
                            {shortcut.description}
                          </span>
                          {isMastered && (
                            <Badge variant="outline" className="text-xs">
                              Mastered
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Kbd>{shortcut.key}</Kbd>
                        </div>
                      </div>
                    );
                  })}
              </div>
              {category !== categories[categories.length - 1] && (
                <Separator className="mt-4" />
              )}
            </div>
          ))}
        </div>

        <div className="bg-muted/30 rounded-lg p-4 mt-4">
          <p className="text-xs text-muted-foreground">
            <strong>Tip:</strong> Press <Kbd>?</Kbd> anytime to open this guide. Shortcuts are disabled by default - enable them in Settings → Experimental Features.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

/**
 * Track shortcut usage for gamification
 * Call this when a shortcut is used
 */
export function trackShortcutUsage(action: string) {
  const stored = localStorage.getItem(MASTERED_STORAGE_KEY);
  const mastered = stored ? new Set(JSON.parse(stored) as string[]) : new Set<string>();
  
  // Mark as mastered after first use (can be made more sophisticated)
  if (!mastered.has(action)) {
    mastered.add(action);
    localStorage.setItem(MASTERED_STORAGE_KEY, JSON.stringify(Array.from(mastered)));
  }
}
