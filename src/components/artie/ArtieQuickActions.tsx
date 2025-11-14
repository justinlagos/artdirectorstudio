import { memo } from 'react';
import { Button } from '@/components/ui/button';
import type { QuickAction } from './types';

interface ArtieQuickActionsProps {
  quickActions: QuickAction[];
  isOnline: boolean;
  onQuickAction: (action: QuickAction) => void;
}

export const ArtieQuickActions = memo(({
  quickActions,
  isOnline,
  onQuickAction,
}: ArtieQuickActionsProps) => {
  return (
    <div className="flex-shrink-0 px-4 md:px-6 py-3 md:py-4 border-b border-border bg-surface-2">
      <p className="text-[10px] md:text-xs font-medium text-muted-foreground mb-2 md:mb-3">Quick Actions</p>
      {/* Desktop: 2-row grid, Mobile: horizontal scroll */}
      <div className="hidden md:grid md:grid-cols-2 md:gap-2">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Button
              key={action.label}
              variant="outline"
              size="sm"
              onClick={() => onQuickAction(action)}
              className="justify-start gap-2 text-xs h-10 hover:bg-accent transition-colors"
              disabled={!isOnline}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{action.label}</span>
            </Button>
          );
        })}
      </div>
      <div className="flex md:hidden gap-2 overflow-x-auto scrollbar-hide snap-x snap-mandatory">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Button
              key={action.label}
              variant="outline"
              size="sm"
              onClick={() => onQuickAction(action)}
              className="flex-shrink-0 snap-start gap-2 text-xs h-9 hover:bg-accent"
              disabled={!isOnline}
            >
              <Icon className="h-3.5 w-3.5" />
              {action.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
});

ArtieQuickActions.displayName = 'ArtieQuickActions';

