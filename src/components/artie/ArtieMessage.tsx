import { memo } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sparkles, Wand2, Edit, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { openStudioWithPrompt } from '@/lib/studio';
import type { Message, ContextImage } from './types';

interface ArtieMessageProps {
  message: Message;
  inlineImageUrls: string[];
  onChipAction: (action: string, messageId?: string) => void;
  onRetry: (retryPayload?: unknown) => void;
  onEditImage: (imageUrl: string) => void;
  extractSupabaseImageUrls: (text: string) => string[];
}

export const ArtieMessage = memo(({
  message,
  inlineImageUrls,
  onChipAction,
  onRetry,
  onEditImage,
  extractSupabaseImageUrls,
}: ArtieMessageProps) => {
  return (
    <div
      className={cn(
        "flex animate-fade-in",
        message.sender === 'user' ? 'justify-end' : 'justify-start'
      )}
    >
      <div className={cn(
        "flex items-end gap-2 max-w-[85%]",
        message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'
      )}>
        {message.sender === 'artie' && (
          <div className="h-6 w-6 md:h-7 md:w-7 rounded-lg bg-surface-3 flex items-center justify-center flex-shrink-0 mb-1">
            <Sparkles className="h-3 w-3 md:h-3.5 md:w-3.5 text-primary" />
          </div>
        )}
        <div className="space-y-2 w-full">
          {/* Attachment Preview */}
          {message.attachment && (
            <div className="rounded-xl overflow-hidden border border-border bg-muted">
              {message.attachment.type === 'image' ? (
                <div className="relative group">
                  <img 
                    src={message.attachment.url} 
                    alt={message.attachment.name}
                    className="w-full h-auto max-h-[250px] md:max-h-[300px] object-contain"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        openStudioWithPrompt({
                          basePrompt: "Refine this image",
                          imageUrl: message.attachment?.url || "",
                        });
                        toast.success("Opening in Studio");
                      }}
                      className="gap-1.5"
                    >
                      <Wand2 className="h-3.5 w-3.5" />
                      Open in Studio
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        if (message.attachment?.url) {
                          onEditImage(message.attachment.url);
                        }
                      }}
                      className="gap-1.5"
                    >
                      <Edit className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="bg-surface-3 px-3 py-2 flex items-center gap-2">
                    <span className="text-xs text-muted-foreground truncate">{message.attachment.name}</span>
                  </div>
                  {message.attachment.analysis?.summary && (
                    <div className="px-3 py-3 bg-background/80 border-t border-border/70 space-y-2">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">
                        Brief summary
                      </p>
                      <p className="text-xs text-foreground/80 leading-relaxed">
                        {message.attachment.analysis.summary}
                      </p>
                      {message.attachment.analysis.keyInsights?.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">
                            Key directives
                          </p>
                          <ul className="space-y-1">
                            {message.attachment.analysis.keyInsights.slice(0, 3).map((insight, idx) => (
                              <li key={`${message.id}-insight-${idx}`} className="text-xs text-muted-foreground/90">
                                • {insight}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {inlineImageUrls.length > 0 && (
            <div className="grid grid-cols-1 gap-2">
              {inlineImageUrls.map((url, idx) => (
                <div key={`${message.id}-inline-${idx}`} className="relative rounded-xl overflow-hidden border border-border bg-muted group">
                  <img
                    src={url}
                    alt="Referenced image"
                    className="w-full h-auto max-h-[220px] md:max-h-[260px] object-contain"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        openStudioWithPrompt({
                          basePrompt: "Refine this reference",
                          imageUrl: url,
                        });
                        toast.success("Opening in Studio");
                      }}
                      className="gap-1.5"
                    >
                      <Wand2 className="h-3.5 w-3.5" />
                      Open in Studio
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => onEditImage(url)}
                      className="gap-1.5"
                    >
                      <Edit className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Message Text */}
          <div
            className={cn(
              "rounded-2xl px-3 py-2.5 md:px-4 md:py-3 shadow-xs",
              message.sender === 'user'
                ? 'bg-primary text-primary-foreground rounded-br-sm'
                : message.error 
                ? 'bg-destructive/10 border border-destructive/20 rounded-bl-sm'
                : 'bg-surface-3 rounded-bl-sm'
            )}
          >
            <p className="text-[13px] md:text-sm leading-relaxed whitespace-pre-wrap" style={{ lineHeight: '1.6' }}>
              {message.text}
            </p>
          </div>

          {/* Retry Button for Errors */}
          {message.error && message.retryPayload && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRetry(message.retryPayload)}
              className="text-xs h-7 gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <RefreshCw className="h-3 w-3" />
              Retry
            </Button>
          )}

          {/* Action Chips */}
          {message.actionChips && message.actionChips.length > 0 && (
            <div className="flex flex-wrap gap-1.5 md:gap-2">
              {message.actionChips.map((chip, idx) => (
                <Button
                  key={idx}
                  variant="outline"
                  size="sm"
                  onClick={() => onChipAction(chip.action, message.id)}
                  className="text-xs h-7 hover:bg-accent hover:border-primary/20"
                >
                  {chip.label}
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

ArtieMessage.displayName = 'ArtieMessage';

