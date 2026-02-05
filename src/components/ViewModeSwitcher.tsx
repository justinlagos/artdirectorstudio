import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Layout, LayoutGrid, Sparkles, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export const ViewModeSwitcher = () => {
  const { user } = useAuth();
  const { preferences, update, isLoading } = useUserPreferences();
  const [generationCount, setGenerationCount] = useState<number | null>(null);
  const [isLoadingCount, setIsLoadingCount] = useState(false);

  const workspaceMode = preferences.workspaceMode || 'classic';

  // Load generation count for Auto mode
  useEffect(() => {
    if (user && workspaceMode === 'auto') {
      setIsLoadingCount(true);
      supabase
        .from('generated_assets')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('action', 'generate')
        .then(({ count, error }) => {
          if (!error && count !== null) {
            setGenerationCount(count);
          }
          setIsLoadingCount(false);
        });
    }
  }, [user, workspaceMode]);

  const handleModeChange = (mode: 'classic' | 'auto') => {
    console.log('[ViewModeSwitcher] handleModeChange called', { mode, currentMode: workspaceMode });
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/a8d9adf8-d545-4cbd-a8c1-856264c9a379',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ViewModeSwitcher.tsx:43',message:'handleModeChange called',data:{newMode:mode,currentMode:workspaceMode,isLoading},timestamp:Date.now(),sessionId:'debug-session',runId:'run6',hypothesisId:'D'})}).catch((e)=>{console.error('[ViewModeSwitcher] Log failed',e);});
    // #endregion
    
    // Write to localStorage immediately for stable local fallback
    if (typeof window !== 'undefined') {
      localStorage.setItem('workspaceMode', mode);
    }
    
    update({ workspaceMode: mode });
    console.log('[ViewModeSwitcher] update called', { mode });
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/a8d9adf8-d545-4cbd-a8c1-856264c9a379',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ViewModeSwitcher.tsx:47',message:'update called',data:{mode},timestamp:Date.now(),sessionId:'debug-session',runId:'run6',hypothesisId:'D'})}).catch((e)=>{console.error('[ViewModeSwitcher] Log failed',e);});
    // #endregion
  };

  const modeDisplayName = workspaceMode === 'auto' 
    ? 'Auto (Classic)'
    : 'Classic';

  const modeDescriptions = {
    classic: 'Traditional modal workflow. Perfect for quick generations.',
    auto: 'Automatically uses Classic mode. Recommended for most users.',
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2"
          disabled={isLoading || !user}
        >
          <LayoutGrid className="h-4 w-4" />
          <span className="hidden sm:inline">{modeDisplayName}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>View Mode</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <DropdownMenuItem
          onClick={() => handleModeChange('classic')}
          className="flex flex-col items-start gap-1 py-3"
        >
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <Layout className="h-4 w-4" />
              <span className="font-medium">Classic View</span>
            </div>
            {workspaceMode === 'classic' && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {modeDescriptions.classic}
          </p>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => handleModeChange('auto')}
          className="flex flex-col items-start gap-1 py-3"
        >
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              <span className="font-medium">Auto (Recommended)</span>
            </div>
            {workspaceMode === 'auto' && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {modeDescriptions.auto}
          </p>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
