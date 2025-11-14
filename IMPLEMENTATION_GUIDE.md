# Implementation Guide: God-Tier Platform Enhancements

This guide provides step-by-step implementation for the highest-impact improvements.

---

## 1. KEYBOARD SHORTCUTS SYSTEM ⚡

### Implementation:

**Create `src/hooks/useGlobalShortcuts.tsx`:**
```typescript
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToolsModal } from '@/contexts/ToolsModalContext';

export const useGlobalShortcuts = () => {
  const navigate = useNavigate();
  const { openTool } = useToolsModal();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifier = isMac ? e.metaKey : e.ctrlKey;

      // Command Palette: Cmd/Ctrl + K
      if (modifier && e.key === 'k') {
        e.preventDefault();
        // Open command palette
        document.dispatchEvent(new CustomEvent('open-command-palette'));
        return;
      }

      // New Generation: Cmd/Ctrl + N
      if (modifier && e.key === 'n') {
        e.preventDefault();
        navigate('/');
        // Trigger generation modal
        setTimeout(() => {
          document.dispatchEvent(new CustomEvent('open-generate-modal'));
        }, 100);
        return;
      }

      // Quick Tools
      if (modifier && e.shiftKey) {
        switch (e.key) {
          case 'B':
            e.preventDefault();
            openTool('blend');
            break;
          case 'U':
            e.preventDefault();
            openTool('upscale');
            break;
          case 'A':
            e.preventDefault();
            navigate('/');
            break;
        }
      }

      // Escape: Close modals
      if (e.key === 'Escape') {
        // Already handled by Radix UI
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, openTool]);
};
```

**Add to `App.tsx`:**
```typescript
import { useGlobalShortcuts } from '@/hooks/useGlobalShortcuts';

const App = () => {
  useGlobalShortcuts();
  // ... rest of component
};
```

---

## 2. COMMAND PALETTE 🎨

### Implementation:

**Create `src/components/CommandPalette.tsx`:**
```typescript
import { useState, useEffect } from 'react';
import { Command } from 'cmdk';
import { useNavigate } from 'react-router-dom';
import { useToolsModal } from '@/contexts/ToolsModalContext';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Search, Sparkles, Layers, Maximize2, ImageIcon } from 'lucide-react';

interface CommandItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  action: () => void;
  keywords: string[];
}

export const CommandPalette = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { openTool } = useToolsModal();

  const commands: CommandItem[] = [
    {
      id: 'generate',
      label: 'Generate Image',
      icon: <Sparkles className="h-4 w-4" />,
      action: () => {
        navigate('/');
        setTimeout(() => {
          document.dispatchEvent(new CustomEvent('open-generate-modal'));
        }, 100);
        setOpen(false);
      },
      keywords: ['generate', 'create', 'new', 'image']
    },
    {
      id: 'blend',
      label: 'Blend Images',
      icon: <Layers className="h-4 w-4" />,
      action: () => {
        openTool('blend');
        setOpen(false);
      },
      keywords: ['blend', 'combine', 'merge']
    },
    {
      id: 'upscale',
      label: 'Upscale Image',
      icon: <Maximize2 className="h-4 w-4" />,
      action: () => {
        openTool('upscale');
        setOpen(false);
      },
      keywords: ['upscale', 'enhance', 'enlarge']
    },
    {
      id: 'history',
      label: 'My Projects',
      icon: <ImageIcon className="h-4 w-4" />,
      action: () => {
        navigate('/history');
        setOpen(false);
      },
      keywords: ['history', 'projects', 'gallery']
    }
  ];

  useEffect(() => {
    const handleOpen = () => setOpen(true);
    document.addEventListener('open-command-palette', handleOpen);
    return () => document.removeEventListener('open-command-palette', handleOpen);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="p-0 max-w-2xl">
        <Command className="rounded-lg">
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <Command.Input
              placeholder="Type a command or search..."
              className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <Command.List className="max-h-[300px] overflow-y-auto p-2">
            <Command.Empty>No results found.</Command.Empty>
            <Command.Group heading="Actions">
              {commands.map((cmd) => (
                <Command.Item
                  key={cmd.id}
                  onSelect={cmd.action}
                  className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer"
                >
                  {cmd.icon}
                  {cmd.label}
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
};
```

**Add to `App.tsx`:**
```typescript
import { CommandPalette } from '@/components/CommandPalette';

const App = () => {
  return (
    // ... existing code
    <CommandPalette />
  );
};
```

---

## 3. PROMPT TEMPLATES SYSTEM 📝

### Implementation:

**Create `src/components/PromptTemplates.tsx`:**
```typescript
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Copy, Star } from 'lucide-react';
import { toast } from 'sonner';

interface Template {
  id: string;
  name: string;
  category: string;
  prompt: string;
  description: string;
  tags: string[];
  popular?: boolean;
}

const TEMPLATES: Template[] = [
  {
    id: '1',
    name: 'Cinematic Portrait',
    category: 'Portrait',
    prompt: 'cinematic portrait, dramatic lighting, shallow depth of field, professional photography, 85mm lens, f/1.4, high detail, 4k',
    description: 'Professional portrait with cinematic lighting',
    tags: ['portrait', 'cinematic', 'photography'],
    popular: true
  },
  {
    id: '2',
    name: 'Product Photography',
    category: 'Product',
    prompt: 'product photography, studio lighting, white background, professional, commercial, high detail, sharp focus',
    description: 'Clean product shot for e-commerce',
    tags: ['product', 'commercial', 'studio'],
    popular: true
  },
  // Add more templates...
];

export const PromptTemplates = ({ onSelect }: { onSelect: (prompt: string) => void }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = ['all', ...Array.from(new Set(TEMPLATES.map(t => t.category)))];

  const filteredTemplates = selectedCategory === 'all'
    ? TEMPLATES
    : TEMPLATES.filter(t => t.category === selectedCategory);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {categories.map(cat => (
          <Button
            key={cat}
            variant={selectedCategory === cat ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(cat)}
          >
            {cat}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredTemplates.map(template => (
          <Card key={template.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold flex items-center gap-2">
                    {template.name}
                    {template.popular && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
                  </h3>
                  <p className="text-sm text-muted-foreground">{template.description}</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{template.prompt}</p>
              <div className="flex items-center justify-between">
                <div className="flex gap-1 flex-wrap">
                  {template.tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(template.prompt);
                      toast.success('Template copied!');
                    }}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => onSelect(template.prompt)}
                  >
                    <Sparkles className="h-3 w-3 mr-1" />
                    Use
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
```

---

## 4. BULK OPERATIONS IN HISTORY 📦

### Implementation:

**Update `src/pages/History.tsx`:**
```typescript
// Add state for selection
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
const [isSelectionMode, setIsSelectionMode] = useState(false);

// Add checkbox to each card
{isSelectionMode && (
  <input
    type="checkbox"
    checked={selectedIds.has(asset.id)}
    onChange={(e) => {
      const newSet = new Set(selectedIds);
      if (e.target.checked) {
        newSet.add(asset.id);
      } else {
        newSet.delete(asset.id);
      }
      setSelectedIds(newSet);
    }}
    className="absolute top-4 left-4 w-5 h-5"
  />
)}

// Add bulk actions toolbar
{isSelectionMode && selectedIds.size > 0 && (
  <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-background border rounded-lg p-4 shadow-lg z-50">
    <div className="flex items-center gap-4">
      <span className="text-sm font-medium">{selectedIds.size} selected</span>
      <Button
        variant="outline"
        size="sm"
        onClick={async () => {
          // Batch delete
          for (const id of selectedIds) {
            await handleDelete(id);
          }
          setSelectedIds(new Set());
          setIsSelectionMode(false);
          toast.success(`Deleted ${selectedIds.size} items`);
        }}
      >
        Delete Selected
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          // Batch download
          selectedIds.forEach(id => {
            const asset = assets.find(a => a.id === id);
            if (asset?.image_url) {
              window.open(asset.image_url, '_blank');
            }
          });
        }}
      >
        Download Selected
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          setSelectedIds(new Set());
          setIsSelectionMode(false);
        }}
      >
        Cancel
      </Button>
    </div>
  </div>
)}
```

---

## 5. ERROR TRACKING WITH SENTRY 🐛

### Implementation:

**Install:**
```bash
npm install @sentry/react
```

**Create `src/lib/sentry.ts`:**
```typescript
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  integrations: [
    new Sentry.BrowserTracing(),
    new Sentry.Replay(),
  ],
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  environment: import.meta.env.MODE,
});
```

**Update `App.tsx`:**
```typescript
import * as Sentry from "@sentry/react";

const App = Sentry.withErrorBoundary(() => {
  // ... existing code
}, {
  fallback: ({ error, resetError }) => (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h2>Something went wrong</h2>
        <button onClick={resetError}>Try again</button>
      </div>
    </div>
  ),
});
```

---

## 6. ANALYTICS WITH MIXPANEL 📊

### Implementation:

**Install:**
```bash
npm install mixpanel-browser
```

**Create `src/lib/analytics.ts`:**
```typescript
import mixpanel from 'mixpanel-browser';

if (import.meta.env.VITE_MIXPANEL_TOKEN) {
  mixpanel.init(import.meta.env.VITE_MIXPANEL_TOKEN, {
    track_pageview: true,
    persistence: 'localStorage',
  });
}

export const analytics = {
  track: (event: string, properties?: Record<string, any>) => {
    if (import.meta.env.VITE_MIXPANEL_TOKEN) {
      mixpanel.track(event, properties);
    }
  },
  identify: (userId: string) => {
    if (import.meta.env.VITE_MIXPANEL_TOKEN) {
      mixpanel.identify(userId);
    }
  },
  setUserProperties: (properties: Record<string, any>) => {
    if (import.meta.env.VITE_MIXPANEL_TOKEN) {
      mixpanel.people.set(properties);
    }
  },
};
```

**Usage:**
```typescript
import { analytics } from '@/lib/analytics';

// Track events
analytics.track('Image Generated', {
  tool: 'generate',
  prompt_length: prompt.length,
  has_reference: !!referenceImage,
});

// Identify user
analytics.identify(user.id);
analytics.setUserProperties({
  tier: user.subscription_tier,
  credits: user.credits,
});
```

---

## 7. IMAGE CDN WITH CLOUDFLARE 🖼️

### Implementation:

**Update image URLs to use Cloudflare:**
```typescript
const CLOUDFLARE_ACCOUNT_ID = import.meta.env.VITE_CLOUDFLARE_ACCOUNT_ID;
const CLOUDFLARE_IMAGES_URL = `https://imagedelivery.net/${CLOUDFLARE_ACCOUNT_ID}`;

export const getOptimizedImageUrl = (
  imageUrl: string,
  options?: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'webp' | 'avif' | 'jpg' | 'png';
  }
) => {
  if (!imageUrl || !CLOUDFLARE_ACCOUNT_ID) return imageUrl;
  
  // If already a Cloudflare URL, return as-is
  if (imageUrl.includes('imagedelivery.net')) return imageUrl;
  
  // Upload to Cloudflare and return optimized URL
  // Implementation depends on your upload strategy
  return imageUrl;
};
```

---

## 8. SEARCH WITH ALGOLIA 🔍

### Implementation:

**Install:**
```bash
npm install algoliasearch
```

**Create `src/lib/search.ts`:**
```typescript
import algoliasearch from 'algoliasearch/lite';

const client = algoliasearch(
  import.meta.env.VITE_ALGOLIA_APP_ID,
  import.meta.env.VITE_ALGOLIA_SEARCH_KEY
);

export const searchIndex = client.initIndex('generated_assets');

export const searchAssets = async (query: string, userId: string) => {
  return searchIndex.search(query, {
    filters: `user_id:${userId}`,
    hitsPerPage: 20,
  });
};
```

---

## 9. QUICK ACTIONS MENU ⚡

### Implementation:

**Create `src/components/QuickActions.tsx`:**
```typescript
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sparkles, Layers, Maximize2, Download, Share2, Trash2 } from 'lucide-react';

export const QuickActions = ({ assetId, asset }: { assetId: string; asset: any }) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => {/* Generate variation */}}>
          <Sparkles className="mr-2 h-4 w-4" />
          Generate Variation
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => {/* Upscale */}}>
          <Maximize2 className="mr-2 h-4 w-4" />
          Upscale
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => {/* Download */}}>
          <Download className="mr-2 h-4 w-4" />
          Download
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => {/* Share */}}>
          <Share2 className="mr-2 h-4 w-4" />
          Share
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => {/* Delete */}} className="text-destructive">
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
```

---

## 10. PERFORMANCE OPTIMIZATIONS 🚀

### Code Splitting:

**Update `vite.config.ts`:**
```typescript
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'react-vendor': ['react', 'react-dom', 'react-router-dom'],
        'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
        'query-vendor': ['@tanstack/react-query'],
        'ai-vendor': ['@supabase/supabase-js'],
        'artie-chat': ['./src/components/ArtieChat'],
      },
    },
  },
  chunkSizeWarningLimit: 1000,
}
```

### Lazy Load ArtieChat:

**Update `App.tsx`:**
```typescript
const ArtieChat = lazy(() => 
  import('./components/ArtieChat').then(m => ({ default: m.ArtieChat }))
);
```

---

## PRIORITY IMPLEMENTATION ORDER:

1. **Week 1:** Keyboard Shortcuts + Command Palette
2. **Week 2:** Prompt Templates + Bulk Operations
3. **Week 3:** Error Tracking + Analytics
4. **Week 4:** Image CDN + Performance Optimization
5. **Week 5:** Search + Quick Actions

---

## ENVIRONMENT VARIABLES TO ADD:

```bash
# Analytics
VITE_MIXPANEL_TOKEN=your_token

# Error Tracking
VITE_SENTRY_DSN=your_dsn

# CDN
VITE_CLOUDFLARE_ACCOUNT_ID=your_account_id

# Search
VITE_ALGOLIA_APP_ID=your_app_id
VITE_ALGOLIA_SEARCH_KEY=your_search_key
```

---

**Next Steps:**
1. Review this guide
2. Prioritize features based on user feedback
3. Implement Phase 1 (Quick Wins)
4. Measure impact
5. Iterate

