import { memo, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Paperclip, Send, Loader2, FileCheck, ImagePlus, X } from 'lucide-react';

interface ArtieChatInputProps {
  inputValue: string;
  uploadedFiles: File[];
  isLoading: boolean;
  isUploading: boolean;
  isOnline: boolean;
  onInputChange: (value: string) => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile: (index: number) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const ArtieChatInput = memo(({
  inputValue,
  uploadedFiles,
  isLoading,
  isUploading,
  isOnline,
  onInputChange,
  onFileSelect,
  onRemoveFile,
  onSubmit,
}: ArtieChatInputProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '40px';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = Math.min(scrollHeight, 120) + 'px';
    }
  }, [inputValue]);

  return (
    <div className="flex-shrink-0 px-4 md:px-6 py-2 md:py-2.5 pb-[calc(0.5rem+env(safe-area-inset-bottom))] md:pb-2.5 border-t border-border bg-surface-1 shadow-[0_-1px_8px_rgba(0,0,0,0.08)]">
      {/* File Upload Preview */}
      {uploadedFiles.length > 0 && (
        <div className="mb-2 md:mb-3 flex flex-wrap gap-1.5 md:gap-2">
          {uploadedFiles.map((file, index) => (
            <div 
              key={index}
              className="flex items-center gap-1.5 bg-surface-3 rounded-lg px-2.5 py-1.5 text-xs border border-border"
            >
              {file.type.startsWith('image/') ? (
                <ImagePlus className="h-3.5 w-3.5 text-primary" />
              ) : (
                <FileCheck className="h-3.5 w-3.5 text-primary" />
              )}
              <span className="max-w-[100px] truncate text-[11px]">{file.name}</span>
              <button
                onClick={() => onRemoveFile(index)}
                className="ml-0.5 hover:text-destructive transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={onSubmit} className="flex gap-2">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.doc,.docx"
          onChange={onFileSelect}
          className="hidden"
        />
        
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          className="h-10 w-10 flex-shrink-0 hover:bg-accent"
          disabled={isLoading || !isOnline}
        >
          <Paperclip className="h-5 w-5" />
        </Button>

        <Textarea
          ref={textareaRef}
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              const form = e.currentTarget.closest('form');
              if (form) form.requestSubmit();
            }
          }}
          placeholder={
            !isOnline 
              ? "You're offline..." 
              : isUploading 
              ? "Processing files..." 
              : "Ask Artie or describe what you're working on..."
          }
          className="flex-1 min-h-[40px] max-h-[120px] py-2.5 px-3 resize-none bg-background border-input focus-visible:ring-ring text-sm leading-relaxed"
          disabled={isLoading || isUploading || !isOnline}
          rows={1}
        />

        <Button 
          type="submit" 
          size="icon"
          className="h-10 w-10 shadow-subtle flex-shrink-0"
          disabled={(!inputValue.trim() && uploadedFiles.length === 0) || isLoading || isUploading || !isOnline}
        >
          {isLoading || isUploading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </Button>
      </form>
    </div>
  );
});

ArtieChatInput.displayName = 'ArtieChatInput';

