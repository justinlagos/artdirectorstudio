import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Paperclip, Send, Loader2, FileCheck, Sparkles, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToolsModal } from "@/contexts/ToolsModalContext";
import { useCredits } from "@/hooks/useCredits";
import { extractTextFromBriefFile } from "@/lib/documentParser";
import { openStudioWithPrompt } from "@/lib/studio";
import type { Message, ContextMemory, ChatAttachment } from "@/components/artie/types";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Import the chat hook/logic from ArtieChat - we'll create a simplified version
// For now, we'll reuse core message handling from ArtieChat component

export default function ArtiePage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { openTool } = useToolsModal();
  const { balance, refetch: refetchCredits } = useCredits();
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = sessionStorage.getItem('artie-page-conversation');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Array<Omit<Message, 'timestamp'> & { timestamp: string }>;
        return parsed.map((m) => ({ ...m, timestamp: new Date(m.timestamp) }));
      } catch {
        // Fallback to welcome message
      }
    }
    return [{
      id: '1',
      text: "Hi! I'm Artie — Your Creative Intelligent System.\n\nI can help you brainstorm concepts, refine visual briefs, analyze images, generate visuals, and guide you through any creative challenge. You can also upload creative briefs (PDF/Word) for me to analyze.\n\nWhat creative project are we working on today?",
      sender: 'artie',
      timestamp: new Date()
    }];
  });
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [contextMemory, setContextMemory] = useState<ContextMemory>(() => {
    const saved = sessionStorage.getItem('artie-context-memory');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          images: Array.isArray(parsed.images) ? parsed.images : [],
          documents: Array.isArray(parsed.documents) ? parsed.documents : [],
          briefSummary: typeof parsed.briefSummary === 'string' ? parsed.briefSummary : undefined
        } as ContextMemory;
      } catch {
        // ignore parsing errors
      }
    }
    return { images: [], documents: [] };
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", {
        state: { message: "Please sign in to use Artie." }
      });
    }
  }, [user, authLoading, navigate]);

  // Save messages to sessionStorage
  useEffect(() => {
    if (messages.length > 0) {
      sessionStorage.setItem('artie-page-conversation', JSON.stringify(messages));
    }
  }, [messages]);

  // Save context memory to sessionStorage
  useEffect(() => {
    sessionStorage.setItem('artie-context-memory', JSON.stringify(contextMemory));
  }, [contextMemory]);

  // Scroll to bottom when messages change
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const validFiles = files.filter(file => {
      const isValidType =
        file.type.startsWith('image/') ||
        file.type === 'application/pdf' ||
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.type === 'application/msword';
      
      const isValidSize = file.size <= 20 * 1024 * 1024; // 20MB

      if (!isValidType) {
        toast.error("Invalid file type", {
          description: `${file.name} is not supported. Please upload images, PDFs, or Word documents.`,
        });
      }
      if (!isValidSize) {
        toast.error("File too large", {
          description: `${file.name} exceeds 20MB limit.`,
        });
      }

      return isValidType && isValidSize;
    });

    if (validFiles.length > 0) {
      setUploadedFiles(prev => [...prev, ...validFiles]);
      toast.success("Files added", {
        description: `${validFiles.length} file(s) ready to upload`,
      });
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (!inputValue.trim() && uploadedFiles.length === 0) return;
    if (isLoading) return;

    const userMessageText = inputValue.trim();
    const filesToProcess = [...uploadedFiles];
    
    // Clear input and files immediately
    setInputValue("");
    setUploadedFiles([]);
    setIsLoading(true);

    // Add user message
    const userMessageId = Date.now().toString();
    const userMessage: Message = {
      id: userMessageId,
      text: userMessageText || filesToProcess.map(f => f.name).join(', '),
      sender: 'user',
      timestamp: new Date(),
      ...(filesToProcess.length > 0 && filesToProcess[0].type.startsWith('image/') ? {
        attachment: {
          type: 'image',
          url: URL.createObjectURL(filesToProcess[0]),
          name: filesToProcess[0].name
        } as ChatAttachment
      } : {})
    };

    setMessages(prev => [...prev, userMessage]);

    // Create loading message
    const assistantMessageId = (Date.now() + 1).toString();
    const loadingMessage: Message = {
      id: assistantMessageId,
      text: "",
      sender: 'artie',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, loadingMessage]);

    try {
      // Process files first
      const attachments: ChatAttachment[] = [];
      let briefSummary: string | undefined;

      for (const file of filesToProcess) {
        if (file.type.startsWith('image/')) {
          // Upload image to storage
          setIsUploading(true);
          try {
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (!authUser) throw new Error('Not authenticated');

            const fileExt = file.name.split('.').pop() || 'png';
            const fileName = `${authUser.id}/artie/${Date.now()}-${file.name}`;
            
            const { error: uploadError } = await supabase.storage
              .from('generated-images')
              .upload(fileName, file, {
                contentType: file.type,
                upsert: false
              });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
              .from('generated-images')
              .getPublicUrl(fileName);

            attachments.push({
              type: 'image',
              url: publicUrl,
              name: file.name
            });

            setContextMemory(prev => ({
              ...prev,
              images: [...prev.images, {
                url: publicUrl,
                messageId: userMessageId,
                name: file.name,
                source: 'user',
                timestamp: new Date().toISOString()
              }]
            }));
          } catch (imgError) {
            console.error('[ArtiePage] Image upload error:', imgError);
            toast.error("Failed to upload image", {
              description: "Please try again.",
            });
          } finally {
            setIsUploading(false);
          }
        } else if (file.type === 'application/pdf' || 
                   file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                   file.type === 'application/msword') {
          // Process document/brief
          setIsUploading(true);
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Not authenticated');

            const extractedText = await extractTextFromBriefFile(file);
            
            // Send to process-brief edge function for analysis
            try {
              const { data: briefAnalysis, error: briefError } = await supabase.functions.invoke('process-brief', {
                body: {
                  text: extractedText,
                  filename: file.name
                },
                headers: {
                  Authorization: `Bearer ${session.access_token}`,
                },
              });

              if (!briefError && briefAnalysis) {
                briefSummary = briefAnalysis.summary || `Brief: ${file.name}`;
                
                // Store full analysis in context
                setContextMemory(prev => ({
                  ...prev,
                  documents: [...prev.documents, {
                    name: file.name,
                    summary: briefAnalysis.summary,
                    keyInsights: briefAnalysis.key_insights || [],
                    targetAudience: briefAnalysis.target_audience,
                    deliverables: briefAnalysis.deliverables,
                    tonalKeywords: briefAnalysis.tonal_keywords || [],
                    timestamp: new Date().toISOString()
                  }],
                  briefSummary
                }));

                attachments.push({
                  type: 'document',
                  url: URL.createObjectURL(file),
                  name: file.name,
                  analysis: briefAnalysis,
                  excerpt: extractedText.slice(0, 2000)
                } as ChatAttachment);

                toast.success("Brief analyzed", {
                  description: `I've analyzed ${file.name} and extracted key insights.`,
                });
              } else {
                // Fallback to simple summary if analysis fails
                briefSummary = `Brief: ${file.name} (${extractedText.slice(0, 200)}...)`;
                attachments.push({
                  type: 'document',
                  url: URL.createObjectURL(file),
                  name: file.name
                });
              }
            } catch (analysisError) {
              console.error('[ArtiePage] Brief analysis error:', analysisError);
              // Fallback: use extracted text
              briefSummary = `Brief: ${file.name} (${extractedText.slice(0, 200)}...)`;
              attachments.push({
                type: 'document',
                url: URL.createObjectURL(file),
                name: file.name
              });
              toast.info("Brief uploaded", {
                description: "Processing brief analysis...",
              });
            }
          } catch (docError) {
            console.error('[ArtiePage] Document processing error:', docError);
            toast.error("Failed to process document", {
              description: "Please try again.",
            });
          } finally {
            setIsUploading(false);
          }
        }
      }

      // Prepare messages for Artie API with context
      const messagesForAPI = messages
        .filter(m => m.text) // Only include messages with text
        .map(m => ({
          role: m.sender === 'user' ? 'user' : 'assistant',
          content: m.text || ''
        }));

      // Build contextual user message
      let contextualUserMessage = userMessageText || briefSummary || 'Uploaded files';
      
      // Add context about uploaded files
      if (attachments.length > 0) {
        const contextParts: string[] = [];
        attachments.forEach(att => {
          if (att.type === 'image') {
            contextParts.push(`[Uploaded image: ${att.name}]`);
          } else if (att.type === 'document') {
            if (att.analysis?.summary) {
              contextParts.push(`[Brief (${att.name}): ${att.analysis.summary}]`);
            } else {
              contextParts.push(`[Uploaded document: ${att.name}]`);
            }
          }
        });
        if (contextParts.length > 0) {
          contextualUserMessage = `${contextualUserMessage}\n\n${contextParts.join('\n')}`;
        }
      }

      // Add user's current message
      messagesForAPI.push({
        role: 'user',
        content: contextualUserMessage
      });

      // Call Artie chat API
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const { data, error } = await supabase.functions.invoke('artie-chat', {
        body: {
          messages: messagesForAPI,
          attachments: attachments.length > 0 ? attachments : undefined,
          contextMemory
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      // Process streaming response (simplified - Artie API returns full response)
      let accumulatedText = '';
      if (data?.choices?.[0]?.message?.content) {
        accumulatedText = data.choices[0].message.content;
      }

      // Handle tool calls if present
      const toolCalls = data?.choices?.[0]?.message?.tool_calls || [];
      for (const toolCall of toolCalls) {
        let args: any = {};
        try {
          args = toolCall.function.arguments ? 
            (typeof toolCall.function.arguments === 'string' ? 
              JSON.parse(toolCall.function.arguments) : 
              toolCall.function.arguments) : {};
        } catch (e) {
          console.error('[ArtiePage] Failed to parse tool call arguments:', e);
          continue;
        }

        if (toolCall.function.name === 'open_studio') {
          accumulatedText += '\n\n✨ Opening Studio with your refined prompt...';
          const recentImage = contextMemory.images[contextMemory.images.length - 1];
          await openStudioWithPrompt({
            basePrompt: args.prompt || userMessageText,
            imageUrl: recentImage?.url || args.referenceImage,
            meta: {
              source: 'artie',
              conversationContext: messages.slice(-5).map(m => m.text).join('\n'),
              quality: args.quality || 'auto',
              size: args.size || '1024x1024'
            }
          });
        } else if (toolCall.function.name === 'open_upscale') {
          accumulatedText += '\n\n🔍 Opening Upscale tool...';
          const imageUrl = args.imageUrl || contextMemory.images[contextMemory.images.length - 1]?.url;
          if (imageUrl) {
            openTool('upscale', { 
              imageUrl,
              scaleFactor: args.scaleFactor || '2'
            });
          } else {
            accumulatedText += '\n\n⚠️ Please upload an image first.';
          }
        } else if (toolCall.function.name === 'open_blend') {
          accumulatedText += '\n\n🎨 Opening Blend tool...';
          const recentImages = contextMemory.images.slice(-2);
          if (recentImages.length >= 2) {
            openTool('blend', {
              image1Url: recentImages[0]?.url,
              image2Url: recentImages[1]?.url,
              mode: args.mode || 'merge',
              ratio: args.ratio || 50
            });
          } else {
            accumulatedText += '\n\n⚠️ Please upload at least 2 images to blend.';
          }
        } else if (toolCall.function.name === 'generate_image') {
          // Generate image inline - handled by edge function
          accumulatedText += '\n\n✨ Generating image...';
          // The edge function should handle generation and saving
          // This is typically done via open_studio instead, but support it here too
        } else if (toolCall.function.name === 'edit_image') {
          // Edit image - should open edit modal
          accumulatedText += '\n\n🖼️ Opening Edit Image tool...';
          const imageUrl = args.imageUrl || contextMemory.images[contextMemory.images.length - 1]?.url;
          const instruction = args.instruction;
          
          if (!imageUrl) {
            accumulatedText += '\n\n⚠️ Please upload an image first.';
          } else if (!instruction) {
            accumulatedText += '\n\n⚠️ Please provide an editing instruction.';
          } else {
            // Note: Edit image tool opening would require ImageEditor component
            // For now, just acknowledge the request
            accumulatedText += `\n\nI'll help you edit the image with: "${instruction}".`;
            toast.info("Edit Image feature coming soon in ArtiePage", {
              description: "Use the floating Artie chat or Studio for now.",
            });
          }
        }
      }

      // Update assistant message with response
      setMessages(prev => 
        prev.map(m => 
          m.id === assistantMessageId
            ? { ...m, text: accumulatedText || 'I received your message. How can I help?' }
            : m
        )
      );

      await refetchCredits();
    } catch (error) {
      console.error('[ArtiePage] Chat error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      setMessages(prev => 
        prev.map(m => 
          m.id === assistantMessageId
            ? { ...m, text: `❌ ${errorMessage}`, error: true }
            : m
        )
      );
      
      toast.error("Error", {
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

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
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-4",
                    message.sender === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {message.sender === 'artie' && (
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="h-4 w-4 text-primary-foreground" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[80%] rounded-2xl px-4 py-3",
                      message.sender === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground',
                      message.error && 'bg-destructive/10 text-destructive border border-destructive/20'
                    )}
                  >
                    {message.text && (
                      <p className="whitespace-pre-wrap text-sm md:text-base leading-relaxed">
                        {message.text}
                      </p>
                    )}
                    {message.attachment?.type === 'image' && (
                      <div className="mt-2 rounded-lg overflow-hidden">
                        <img
                          src={message.attachment.url}
                          alt={message.attachment.name}
                          className="max-w-full max-h-64 object-contain"
                        />
                      </div>
                    )}
                  </div>
                  {message.sender === 'user' && (
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      <ImageIcon className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-4 justify-start">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <div className="bg-muted rounded-2xl px-4 py-3">
                    <Loader2 className="h-4 w-4 animate-spin" />
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
                      <FileCheck className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{file.name}</span>
                      <button
                        onClick={() => {
                          setUploadedFiles(prev => prev.filter((_, i) => i !== index));
                        }}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <form onSubmit={handleSend} className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,application/pdf,.doc,.docx"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading || isUploading}
                  className="flex-shrink-0"
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Textarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Ask Artie anything about your campaign, visual, or brief..."
                  className="min-h-[60px] max-h-[200px] resize-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  disabled={isLoading || isUploading}
                />
                <Button
                  type="submit"
                  disabled={(!inputValue.trim() && uploadedFiles.length === 0) || isLoading || isUploading}
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
      </div>
    </ErrorBoundary>
  );
}

