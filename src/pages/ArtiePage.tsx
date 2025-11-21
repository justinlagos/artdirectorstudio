import { useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Paperclip, Send, Loader2, FileCheck, Sparkles, Image as ImageIcon, Wand2, Edit } from "lucide-react";
import { cn } from "@/lib/utils";
import { useArtieCore } from "@/hooks/useArtieCore";
import { ImageEditor } from "@/components/ImageEditor";
import { toast } from "sonner";
import { ErrorBoundary } from "@/components/ErrorBoundary";
const SUPABASE_IMAGE_REGEX = /(https:\/\/[^\s]+\.supabase\.co\/storage\/v1\/object\/[^\s]+\.(?:jpg|jpeg|png|gif|webp))/gi;

export default function ArtiePage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatBodyRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    inputValue,
    setInputValue,
    isLoading,
    isUploading,
    isOnline,
    uploadedFiles,
    contextMemory,
    editorOpen,
    editingImageUrl,
    editorInstruction,
    handleSend,
    handleKeyDown,
    handleFileInputChange,
    handleRemoveFile,
    handleChipAction,
    handleOpenStudioFromImage,
    handleEditImageFromMessage,
    setEditorOpen,
    setEditingImageUrl,
    setEditorInstruction,
    learnFromAction,
  } = useArtieCore();

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", {
        state: { message: "Please sign in to use Artie." }
      });
    }
  }, [user, authLoading, navigate]);

  // Scroll to bottom when messages change
  const scrollToBottom = useCallback(() => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '40px';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = Math.min(scrollHeight, 200) + 'px';
    }
  }, [inputValue]);

  const extractSupabaseImageUrls = useCallback((text: string) => {
    if (!text) return [];
    const matches = text.match(SUPABASE_IMAGE_REGEX) || [];
    return Array.from(new Set(matches));
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        
        <main className="flex-1 container mx-auto px-4 py-8 md:py-12 max-w-4xl">
          {/* Header Section */}
          <div className="text-center mb-8 md:mb-12 space-y-4">
            <div className="flex items-center justify-center gap-3">
              <div className="relative">
                <div className="h-12 w-12 md:h-16 md:w-16 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg">
                  <Sparkles className="h-6 w-6 md:h-8 md:w-8 text-primary-foreground" />
                </div>
              </div>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold tracking-tight">
                Artie
              </h1>
            </div>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Creative Intelligent System
            </p>
            <p className="text-sm md:text-base text-muted-foreground max-w-xl mx-auto">
              Ask anything about campaigns, visuals, copy, strategy, or upload a brief and let Artie handle the heavy lifting.
            </p>
          </div>

          {/* Chat Section */}
          <div className="flex flex-col h-[calc(100vh-400px)] md:h-[calc(100vh-350px)] min-h-[500px] bg-card border border-border rounded-2xl shadow-lg overflow-hidden">
            {/* Messages Area */}
            <div 
              ref={chatBodyRef}
              className="flex-1 overflow-y-auto p-6 space-y-6"
            >
              {messages.map((message) => {
                const inlineImageUrls = extractSupabaseImageUrls(message.text);
                return (
                  <div
                    key={message.id}
                    className={cn(
                      "flex gap-4 animate-fade-in",
                      message.sender === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    {message.sender === 'artie' && (
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center flex-shrink-0">
                        <Sparkles className="h-4 w-4 text-primary-foreground" />
                      </div>
                    )}
                    <div className="space-y-3 w-full max-w-[80%]">
                      {/* Attachment Preview */}
                      {message.attachment && (
                        <div className="rounded-xl overflow-hidden border border-border bg-muted">
                          {message.attachment.type === 'image' ? (
                            <div className="relative group">
                              <img 
                                src={message.attachment.url} 
                                alt={message.attachment.name}
                                className="w-full h-auto max-h-[300px] object-contain"
                                loading="lazy"
                              />
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => handleOpenStudioFromImage(message.attachment!.url)}
                                  className="gap-1.5"
                                >
                                  <Wand2 className="h-3.5 w-3.5" />
                                  Open in Studio
                                </Button>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => handleEditImageFromMessage(message.attachment!.url)}
                                  className="gap-1.5"
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                  Edit
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="bg-muted px-3 py-2">
                              <FileCheck className="h-4 w-4 text-muted-foreground inline mr-2" />
                              <span className="text-xs text-muted-foreground">{message.attachment.name}</span>
                            </div>
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
                                className="w-full h-auto max-h-[260px] object-contain"
                                loading="lazy"
                              />
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => handleOpenStudioFromImage(url)}
                                  className="gap-1.5"
                                >
                                  <Wand2 className="h-3.5 w-3.5" />
                                  Open in Studio
                                </Button>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => handleEditImageFromMessage(url)}
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
                          "rounded-2xl px-4 py-3",
                          message.sender === 'user'
                            ? 'bg-primary text-primary-foreground dark:bg-white dark:text-gray-900'
                            : message.error
                            ? 'bg-destructive/10 text-destructive border border-destructive/20'
                            : 'bg-muted text-foreground'
                        )}
                      >
                        <p className={cn(
                          "whitespace-pre-wrap text-sm md:text-base leading-relaxed",
                          message.sender === 'user' && "text-primary-foreground dark:text-gray-900"
                        )}>
                          {message.text || (message.attachment ? "Sent an attachment" : "")}
                        </p>
                      </div>

                      {/* Action Chips */}
                      {message.actionChips && message.actionChips.length > 0 && (
                        <div className="flex flex-wrap gap-3">
                          {message.actionChips.map((chip, idx) => (
                            <Button
                              key={idx}
                              variant="outline"
                              size="sm"
                              onClick={() => handleChipAction(chip.action, message.id)}
                              className="text-xs h-7 hover:bg-accent hover:border-primary/20"
                            >
                              {chip.label}
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                    {message.sender === 'user' && (
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                        <ImageIcon className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                );
              })}
              {isLoading && (
                <div className="flex gap-4 justify-start">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="h-4 w-4 text-primary-foreground animate-pulse" />
                  </div>
                  <div className="bg-muted rounded-2xl px-4 py-3 flex items-center gap-2">
                    <div className="flex gap-1">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="border-t border-border p-4 bg-background">
              {/* Uploaded Files Preview */}
              {uploadedFiles.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {uploadedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 bg-muted px-3 py-2 rounded-lg text-sm"
                    >
                      {file.type.startsWith('image/') ? (
                        <FileCheck className="h-4 w-4 text-primary" />
                      ) : (
                        <FileCheck className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="text-sm max-w-[150px] truncate">{file.name}</span>
                      <button
                        onClick={() => handleRemoveFile(index)}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }} 
                className="flex gap-2"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,application/pdf,.doc,.docx"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading || isUploading || !isOnline}
                  className="flex-shrink-0"
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Textarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    !isOnline 
                      ? "You're offline..." 
                      : isUploading 
                      ? "Processing files..." 
                      : "Ask Artie anything about your campaign, visual, or brief..."
                  }
                  className="min-h-[60px] max-h-[200px] resize-none"
                  disabled={isLoading || isUploading || !isOnline}
                />
                <Button
                  type="submit"
                  disabled={(!inputValue.trim() && uploadedFiles.length === 0) || isLoading || isUploading || !isOnline}
                  className="flex-shrink-0"
                >
                  {isLoading || isUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </form>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Tip: paste prompts, upload a brief, or ask Artie which tool to use next.
              </p>
            </div>
          </div>
        </main>

        <Footer />

        {/* Image Editor Modal */}
        <ImageEditor
          open={editorOpen}
          onOpenChange={(open) => {
            setEditorOpen(open);
            if (!open) {
              setEditorInstruction("");
              setEditingImageUrl("");
            }
          }}
          imageUrl={editingImageUrl}
          initialInstruction={editorInstruction}
          onImageEdited={async (newImageUrl) => {
            const { ensureAssetSaved } = await import('@/lib/saveAsset');
            await ensureAssetSaved({
              imageUrl: newImageUrl,
              action: 'edit',
              sourceUrls: [editingImageUrl],
              params: { source: 'artie_edit', instruction: editorInstruction },
              skipToast: true,
            });

            await learnFromAction('edit', newImageUrl, {
              sourceUrl: editingImageUrl,
              instruction: editorInstruction,
            });

            toast.success("Your edited image is ready and saved to My Projects!");
            setEditorOpen(false);
          }}
        />
      </div>
    </ErrorBoundary>
  );
}

