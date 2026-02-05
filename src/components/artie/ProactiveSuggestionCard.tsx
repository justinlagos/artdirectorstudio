import { useState } from 'react';
import { Sparkles, X, Check, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ProactiveSuggestion } from '@/lib/intelligence/proactiveArtieEngine';

interface ProactiveSuggestionCardProps {
  suggestion: ProactiveSuggestion;
  onDismiss: (id: string) => void;
  onAction: (id: string, action: string) => void;
  onShowMe?: (suggestion: ProactiveSuggestion) => void;
}

export const ProactiveSuggestionCard = ({
  suggestion,
  onDismiss,
  onAction,
  onShowMe,
}: ProactiveSuggestionCardProps) => {
  const [isDismissing, setIsDismissing] = useState(false);

  const handleDismiss = async () => {
    setIsDismissing(true);
    await onDismiss(suggestion.id);
  };

  const handleAction = (action: string) => {
    onAction(suggestion.id, action);
  };

  const priorityColors = {
    high: 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400',
    medium: 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400',
    low: 'bg-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400',
  };

  const priorityLabels = {
    high: 'Important',
    medium: 'Helpful',
    low: 'Optional',
  };

  return (
    <Card
      className={cn(
        'relative border-2 bg-gradient-to-br from-primary/5 to-primary/10',
        'animate-in fade-in slide-in-from-bottom-2 duration-300',
        priorityColors[suggestion.priority],
        isDismissing && 'opacity-50'
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="mt-0.5">
            <div className="rounded-full bg-primary/20 p-2">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {priorityLabels[suggestion.priority]}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {suggestion.triggerType.replace(/_/g, ' ')}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={handleDismiss}
                disabled={isDismissing}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>

            <p className="text-sm font-medium leading-relaxed">
              {suggestion.suggestion}
            </p>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-1">
              {onShowMe && (
                <Button
                  variant="default"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => onShowMe(suggestion)}
                >
                  Show me
                  <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => handleAction('not_now')}
              >
                Not now
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => handleAction('dont_show_again')}
              >
                Don't show again
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
