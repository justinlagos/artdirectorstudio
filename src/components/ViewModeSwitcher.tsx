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
import { useAuth } from '@/contexts/AuthContext';
import { Layout, LayoutGrid, Sparkles, Check } from 'lucide-react';

export const ViewModeSwitcher = () => {
  const { user } = useAuth();
  const { preferences, update, isLoading } = useUserPreferences();

  const workspaceMode = preferences.workspaceMode || 'classic';

  const handleModeChange = (mode: 'classic' | 'auto') => {
    // Write to localStorage immediately for stable local fallback
    if (typeof window !== 'undefined') {
      localStorage.setItem('workspaceMode', mode);
    }
    
    update({ workspaceMode: mode });
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
