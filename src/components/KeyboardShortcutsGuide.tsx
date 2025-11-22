import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/kbd";
import { Separator } from "@/components/ui/separator";
import { getModifierKey } from "@/hooks/useKeyboardShortcuts";
import { useScrollLock } from "@/hooks/useScrollLock";
import { Upload, Play, Wand2, X, Copy, Download, RefreshCw, Keyboard } from "lucide-react";

interface ShortcutItem {
  keys: string[];
  description: string;
  icon?: React.ElementType;
  category: string;
}

interface KeyboardShortcutsGuideProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const KeyboardShortcutsGuide = ({ open, onOpenChange }: KeyboardShortcutsGuideProps) => {
  const modKey = getModifierKey();
  
  // Centralized scroll lock
  useScrollLock(open, 'keyboard-shortcuts-guide');

  const shortcuts: ShortcutItem[] = [
    {
      category: "Upload & Analysis",
      keys: [modKey, "U"],
      description: "Upload new image",
      icon: Upload
    },
    {
      category: "Upload & Analysis",
      keys: [modKey, "Enter"],
      description: "Analyze image",
      icon: Play
    },
    {
      category: "Generation",
      keys: [modKey, "G"],
      description: "Generate image",
      icon: Wand2
    },
    {
      category: "Generation",
      keys: [modKey, "K"],
      description: "Copy prompt",
      icon: Copy
    },
    {
      category: "Generation",
      keys: [modKey, "R"],
      description: "Regenerate prompt",
      icon: RefreshCw
    },
    {
      category: "Navigation",
      keys: ["Esc"],
      description: "Close modal/dialog",
      icon: X
    },
    {
      category: "Navigation",
      keys: [modKey, "?"],
      description: "Show keyboard shortcuts",
      icon: Keyboard
    }
  ];

  const categories = Array.from(new Set(shortcuts.map(s => s.category)));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Keyboard className="w-6 h-6" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Speed up your workflow with these keyboard shortcuts
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {categories.map((category) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                {category}
              </h3>
              <div className="space-y-2">
                {shortcuts
                  .filter((s) => s.category === category)
                  .map((shortcut, index) => {
                    const Icon = shortcut.icon;
                    return (
                      <div
                        key={index}
                        className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          {Icon && <Icon className="w-4 h-4 text-muted-foreground" />}
                          <span className="text-sm">{shortcut.description}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {shortcut.keys.map((key, i) => (
                            <Kbd key={i}>{key}</Kbd>
                          ))}
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
            <strong>Tip:</strong> Press {modKey}+? anytime to open this guide. Most shortcuts work from anywhere in the app.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
