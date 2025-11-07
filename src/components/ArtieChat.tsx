import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MessageCircle, X, Send, Loader2, Sparkles, Lightbulb, Wand2, Image as ImageIcon, Paperclip, FileText, ImagePlus, FileCheck } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'artie';
  timestamp: Date;
  attachment?: {
    type: 'image' | 'document';
    url: string;
    name: string;
    data?: string; // parsed document content or brief analysis
  };
  actionChips?: { label: string; action: string }[];
}

type QuickAction = {
  icon: typeof Lightbulb;
  label: string;
  prompt: string;
};

const quickActions: QuickAction[] = [
  { icon: Lightbulb, label: "Brainstorm ideas", prompt: "Help me brainstorm creative concepts" },
  { icon: Wand2, label: "Refine my visual brief", prompt: "Can you help refine my visual direction?" },
  { icon: Sparkles, label: "Suggest social post", prompt: "Give me ideas for a compelling social media post" },
  { icon: ImageIcon, label: "Analyze my image", prompt: "Help me analyze and improve my uploaded image" },
];

export const ArtieChat = () => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [hasSeenTooltip, setHasSeenTooltip] = useState(false);
  const [contextualPrompt, setContextualPrompt] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [contextMemory, setContextMemory] = useState<{
    lastImageUrl?: string;
    lastAnalysis?: any;
    briefSummary?: string;
  }>({});
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hi! I'm Artie — Your Creative Collaborator.\n\nI can help you brainstorm ideas, refine visual concepts, analyze images, or guide you through any creative challenge. You can also upload images or creative briefs for me to review.\n\nWhat are we working on today?",
      sender: 'artie',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inactivityTimer = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Show tooltip on first 3 visits
  useEffect(() => {
    const visitCount = parseInt(localStorage.getItem('artie-visits') || '0');
    if (visitCount < 3) {
      setHasSeenTooltip(false);
      localStorage.setItem('artie-visits', (visitCount + 1).toString());
    } else {
      setHasSeenTooltip(true);
    }
  }, []);

  // Contextual prompts based on page and inactivity
  useEffect(() => {
    if (isOpen) return;

    // Clear existing timer
    if (inactivityTimer.current) {
      clearTimeout(inactivityTimer.current);
    }

    // Set contextual prompt based on current route
    let prompt = "";
    if (location.pathname.includes('/dashboard') || location.pathname === '/') {
      prompt = "Want me to help refine this?";
    } else if (location.pathname.includes('/inspire')) {
      prompt = "See something you like? I can help remix it.";
    } else if (location.pathname.includes('/history')) {
      prompt = "Would you like me to analyze your past work?";
    }

    if (prompt) {
      // Show prompt after 15-20 seconds of inactivity
      const delay = 15000 + Math.random() * 5000;
      inactivityTimer.current = setTimeout(() => {
        setContextualPrompt(prompt);
        setShowPrompt(true);
        // Auto-hide after 10 seconds
        setTimeout(() => setShowPrompt(false), 10000);
      }, delay);
    }

    return () => {
      if (inactivityTimer.current) {
        clearTimeout(inactivityTimer.current);
      }
    };
  }, [location.pathname, isOpen]);

  const handleQuickAction = (action: QuickAction) => {
    setInputValue(action.prompt);
    setIsOpen(true);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Validate file types and sizes
    const validFiles = files.filter(file => {
      const isValidType = 
        file.type.startsWith('image/') ||
        file.type === 'application/pdf' ||
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.type === 'application/msword';
      
      const isValidSize = file.size <= 20 * 1024 * 1024; // 20MB

      if (!isValidType) {
        toast({
          title: "Invalid file type",
          description: `${file.name} is not supported. Please upload images, PDFs, or Word documents.`,
          variant: "destructive",
        });
      }
      if (!isValidSize) {
        toast({
          title: "File too large",
          description: `${file.name} exceeds 20MB limit.`,
          variant: "destructive",
        });
      }

      return isValidType && isValidSize;
    });

    if (validFiles.length > 0) {
      setUploadedFiles(prev => [...prev, ...validFiles]);
      toast({
        title: "Files added",
        description: `${validFiles.length} file(s) ready to upload`,
      });
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleChipAction = (action: string) => {
    setInputValue(action);
    setTimeout(() => handleSend(), 100);
  };

  const handleSend = async (contextData?: { prompt?: string; analysis?: any; credits?: number }) => {
    if ((!inputValue.trim() && uploadedFiles.length === 0) || isLoading) return;

    setIsLoading(true);
    setIsUploading(true);

    try {
      // Process uploaded files first
      const attachments: any[] = [];
      
      for (const file of uploadedFiles) {
        if (file.type.startsWith('image/')) {
          // Upload image to storage
          const fileExt = file.name.split('.').pop();
          const fileName = `${Math.random()}.${fileExt}`;
          const { data: { user } } = await supabase.auth.getUser();
          
          if (user) {
            const filePath = `${user.id}/${fileName}`;
            const { data, error } = await supabase.storage
              .from('generated-images')
              .upload(filePath, file);

            if (!error) {
              const { data: { publicUrl } } = supabase.storage
                .from('generated-images')
                .getPublicUrl(filePath);
              
              attachments.push({
                type: 'image',
                url: publicUrl,
                name: file.name
              });

              // Store in context memory
              setContextMemory(prev => ({ ...prev, lastImageUrl: publicUrl }));
            }
          }
        } else if (file.type === 'application/pdf' || file.type.includes('word')) {
          // Parse document
          const reader = new FileReader();
          const fileData = await new Promise<string>((resolve) => {
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.readAsDataURL(file);
          });

          attachments.push({
            type: 'document',
            url: fileData,
            name: file.name,
            rawFile: file
          });
        }
      }

      const userMessage: Message = {
        id: Date.now().toString(),
        text: inputValue || "Please review these files",
        sender: 'user',
        timestamp: new Date(),
        ...(attachments.length > 0 && { 
          attachment: attachments[0] // For now, show first attachment
        })
      };

      setMessages(prev => [...prev, userMessage]);
      setInputValue("");
      setUploadedFiles([]);
      setIsUploading(false);

      try {
        const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/artie-chat`;
        
        // Build context-aware message with attachments
        let contextualInput = inputValue || "Please review these files";
        const contextParts = [];
        
        // Add file context
        if (attachments.length > 0) {
          for (const att of attachments) {
            if (att.type === 'image') {
              contextParts.push(`[User uploaded image: ${att.name}]`);
            } else if (att.type === 'document') {
              contextParts.push(`[User uploaded document: ${att.name} - analyzing for creative brief content]`);
            }
          }
        }
        
        // Add context memory
        if (contextMemory.briefSummary) {
          contextParts.push(`Previous brief context: ${contextMemory.briefSummary}`);
        }
        if (contextMemory.lastImageUrl && !attachments.some(a => a.type === 'image')) {
          contextParts.push(`Last image reference: ${contextMemory.lastImageUrl}`);
        }

        if (contextData) {
          if (contextData.prompt) {
            contextParts.push(`Current prompt: "${contextData.prompt.slice(0, 200)}..."`);
          }
          if (contextData.analysis) {
            contextParts.push(`Image overview: ${contextData.analysis.image_overview?.slice(0, 150)}`);
          }
          if (contextData.credits !== undefined) {
            contextParts.push(`User has ${contextData.credits} credits remaining`);
          }
        }
        
        if (contextParts.length > 0) {
          contextualInput = `Context: ${contextParts.join(' | ')}\n\nUser message: ${contextualInput}`;
        }
        
        const response = await fetch(CHAT_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: messages
              .filter(m => m.sender === 'user' || m.sender === 'artie')
              .slice(-10)
              .map(m => ({
                role: m.sender === 'user' ? 'user' : 'assistant',
                content: m.text
              }))
              .concat([{ role: 'user', content: contextualInput }]),
            attachments: attachments,
            contextMemory: contextMemory
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to get response from Artie');
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let accumulatedText = '';
        let textBuffer = '';
        let toolCalls: any[] = [];

        const assistantMessageId = (Date.now() + 1).toString();
        setMessages(prev => [...prev, {
          id: assistantMessageId,
          text: '',
          sender: 'artie',
          timestamp: new Date()
        }]);

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            textBuffer += decoder.decode(value, { stream: true });
            
            let newlineIndex: number;
            while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
              let line = textBuffer.slice(0, newlineIndex);
              textBuffer = textBuffer.slice(newlineIndex + 1);

              if (line.endsWith('\r')) line = line.slice(0, -1);
              if (line.startsWith(':') || line.trim() === '') continue;
              if (!line.startsWith('data: ')) continue;

              const jsonStr = line.slice(6).trim();
              if (jsonStr === '[DONE]') break;

              try {
                const parsed = JSON.parse(jsonStr);
                const delta = parsed.choices?.[0]?.delta;
                
                if (delta?.content) {
                  accumulatedText += delta.content;
                  setMessages(prev => 
                    prev.map(m => 
                      m.id === assistantMessageId 
                        ? { ...m, text: accumulatedText }
                        : m
                    )
                  );
                }

                if (delta?.tool_calls) {
                  delta.tool_calls.forEach((tc: any) => {
                    if (!toolCalls[tc.index]) {
                      toolCalls[tc.index] = {
                        id: tc.id,
                        type: tc.type,
                        function: { name: tc.function?.name || '', arguments: '' }
                      };
                    }
                    if (tc.function?.arguments) {
                      toolCalls[tc.index].function.arguments += tc.function.arguments;
                    }
                  });
                }
              } catch (e) {
                // Ignore parse errors
              }
            }
          }

          if (toolCalls.length > 0) {
            for (const toolCall of toolCalls) {
              if (toolCall.function.name === 'generate_image') {
                const args = JSON.parse(toolCall.function.arguments);
                accumulatedText += '\n\n(Generating image...)';
                setMessages(prev => 
                  prev.map(m => 
                    m.id === assistantMessageId 
                      ? { ...m, text: accumulatedText }
                      : m
                  )
                );

                try {
                  const { data: { session } } = await supabase.auth.getSession();
                  const genResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-image`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${session?.access_token}`,
                    },
                    body: JSON.stringify({ prompt: args.prompt })
                  });

                  const genData = await genResponse.json();
                  if (genData.imageUrl) {
                    accumulatedText = accumulatedText.replace('(Generating image...)', '');
                    accumulatedText += `\n\n[Generated Image]\n${genData.imageUrl}`;
                    setMessages(prev => 
                      prev.map(m => 
                        m.id === assistantMessageId 
                          ? { ...m, text: accumulatedText }
                          : m
                      )
                    );
                  }
                } catch (imgError) {
                  console.error('Image generation error:', imgError);
                  accumulatedText = accumulatedText.replace('(Generating image...)', '(Image generation failed)');
                  setMessages(prev => 
                    prev.map(m => 
                      m.id === assistantMessageId 
                        ? { ...m, text: accumulatedText }
                          : m
                    )
                  );
                }
              }
            }
          }
        }
      } catch (error) {
        console.error('Error getting Artie response:', error);
        toast({
          title: "Connection Error",
          description: "Couldn't reach Artie. Please try again.",
          variant: "destructive",
        });
        
        setMessages(prev => prev.filter(m => m.id !== (Date.now() + 1).toString()));
      }
    } catch (uploadError) {
      console.error('Error uploading files:', uploadError);
      toast({
        title: "Upload Error",
        description: "Failed to process uploaded files. Please try again.",
        variant: "destructive",
      });
      setIsUploading(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Persistent floating icon (always visible)
  const FloatingIcon = () => (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Contextual prompt bubble */}
      {showPrompt && contextualPrompt && (
        <div 
          className="absolute bottom-full right-0 mb-3 animate-slide-up"
          onClick={() => {
            setIsOpen(true);
            setShowPrompt(false);
          }}
        >
          <div className="bg-card border border-border rounded-xl px-4 py-3 shadow-lg max-w-[280px] cursor-pointer hover:shadow-xl transition-shadow">
            <p className="text-sm font-medium">{contextualPrompt}</p>
            <div className="absolute bottom-0 right-6 transform translate-y-1/2 rotate-45 w-3 h-3 bg-card border-r border-b border-border" />
          </div>
        </div>
      )}

      {/* Animated Artie icon */}
      <Tooltip open={!hasSeenTooltip && !isOpen}>
        <TooltipTrigger asChild>
          <button
            onClick={() => setIsOpen(true)}
            className={cn(
              "relative h-16 w-16 rounded-full shadow-strong transition-all duration-300",
              "bg-gradient-to-br from-primary to-primary/80",
              "hover:scale-110 hover:shadow-2xl",
              "flex items-center justify-center group",
              !isOpen && "animate-glow-pulse"
            )}
          >
            {/* Glow ring */}
            <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse" />
            
            {/* Icon with subtle animation */}
            <div className="relative">
              <Sparkles className="h-7 w-7 text-primary-foreground transition-transform group-hover:rotate-12" />
            </div>

            {/* Breathing indicator */}
            <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-green-500 border-2 border-background animate-pulse" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="left" className="text-sm max-w-[200px]">
          <p className="font-medium">Need creative help? Try Artie.</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );

  if (!isOpen) {
    return <FloatingIcon />;
  }

  // Side panel drawer
  return (
    <>
      <FloatingIcon />
      
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 animate-fade-in"
        onClick={() => setIsOpen(false)}
      />

      {/* Side Panel Drawer */}
      <div className="fixed top-0 right-0 h-full w-[90vw] sm:w-[460px] bg-background/95 backdrop-blur-xl border-l border-border shadow-2xl z-50 flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border/50 bg-gradient-to-r from-primary/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-md">
                <Sparkles className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Artie</h3>
              <p className="text-xs text-muted-foreground">Your Creative Collaborator</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(false)}
            className="hover:bg-muted/50"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Quick Actions */}
        <div className="px-5 py-4 border-b border-border/50 bg-muted/20">
          <p className="text-xs font-medium text-muted-foreground mb-3">Quick Actions</p>
          <div className="flex flex-wrap gap-2">
            {quickActions.map((action) => (
              <Button
                key={action.label}
                variant="outline"
                size="sm"
                onClick={() => handleQuickAction(action)}
                className="gap-2 text-xs h-8 hover:bg-primary/10 hover:border-primary/50 transition-all"
              >
                <action.icon className="h-3.5 w-3.5" />
                {action.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 px-5">
          <div className="space-y-4 py-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
              >
                <div className="flex items-end gap-2 max-w-[85%]">
                  {message.sender === 'artie' && (
                    <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center flex-shrink-0 mb-1">
                      <Sparkles className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div className="space-y-2 w-full">
                    {/* Attachment Preview */}
                    {message.attachment && (
                      <div className="rounded-xl overflow-hidden border border-border/50">
                        {message.attachment.type === 'image' ? (
                          <img 
                            src={message.attachment.url} 
                            alt={message.attachment.name}
                            className="w-full h-auto max-h-[200px] object-cover"
                          />
                        ) : (
                          <div className="bg-muted/50 px-3 py-2 flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">{message.attachment.name}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Message Text */}
                    <div
                      className={cn(
                        "rounded-2xl px-4 py-3 shadow-sm",
                        message.sender === 'user'
                          ? 'bg-primary text-primary-foreground rounded-br-md'
                          : 'bg-muted/80 backdrop-blur-sm rounded-bl-md'
                      )}
                    >
                      {message.text.includes('[Generated Image]') ? (
                        <div className="space-y-2">
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">
                            {message.text.split('[Generated Image]')[0]}
                          </p>
                          <img 
                            src={message.text.split('[Generated Image]')[1].trim()} 
                            alt="Generated by Artie"
                            className="rounded-lg max-w-full h-auto border border-border/50"
                          />
                        </div>
                      ) : (
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.text}</p>
                      )}
                    </div>

                    {/* Action Chips */}
                    {message.actionChips && message.actionChips.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {message.actionChips.map((chip, idx) => (
                          <Button
                            key={idx}
                            variant="outline"
                            size="sm"
                            onClick={() => handleChipAction(chip.action)}
                            className="text-xs h-7 hover:bg-primary/10 hover:border-primary/50"
                          >
                            {chip.label}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start animate-fade-in">
                <div className="flex items-end gap-2">
                  <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center flex-shrink-0 mb-1">
                    <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                  </div>
                  <div className="bg-muted/80 backdrop-blur-sm rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-2 shadow-sm">
                    <div className="flex gap-1">
                      <div className="h-2 w-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="h-2 w-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="h-2 w-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-xs text-muted-foreground ml-1">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="p-5 border-t border-border/50 bg-muted/10">
          {/* File Upload Preview */}
          {uploadedFiles.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {uploadedFiles.map((file, index) => (
                <div 
                  key={index}
                  className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2 text-xs border border-border/50"
                >
                  {file.type.startsWith('image/') ? (
                    <ImagePlus className="h-4 w-4 text-primary" />
                  ) : (
                    <FileCheck className="h-4 w-4 text-primary" />
                  )}
                  <span className="max-w-[120px] truncate">{file.name}</span>
                  <button
                    onClick={() => removeFile(index)}
                    className="ml-1 hover:text-destructive transition-colors"
                  >
                    <X className="h-3 w-3" />
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
              accept="image/*,.pdf,.doc,.docx"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              className="h-11 w-11 flex-shrink-0"
              disabled={isLoading}
            >
              <Paperclip className="h-5 w-5" />
            </Button>

            <div className="relative flex-1">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={isUploading ? "Processing files..." : "Type your idea or ask for feedback..."}
                className="pr-12 h-11 bg-background border-border/50 focus-visible:ring-primary/50"
                disabled={isLoading || isUploading}
              />
              {inputValue && (
                <Badge 
                  variant="secondary" 
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs px-2 py-0.5"
                >
                  ↵ Send
                </Badge>
              )}
            </div>
            <Button 
              type="submit" 
              size="icon"
              className="h-11 w-11 shadow-sm flex-shrink-0"
              disabled={(!inputValue.trim() && uploadedFiles.length === 0) || isLoading || isUploading}
            >
              {isLoading || isUploading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </form>
        </div>
      </div>
    </>
  );
};
