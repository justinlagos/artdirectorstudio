import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { X, Sparkles, Lightbulb, Wand2, Image as ImageIcon, ImagePlus, FileText, Edit, Minimize2, RefreshCw, FileCheck, Paperclip, Send, Loader2, Zap } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToolsModal } from "@/contexts/ToolsModalContext";
import { useCredits } from "@/hooks/useCredits";
import { useIsMobile } from "@/hooks/use-mobile";
import { useRetryWithBackoff } from "@/hooks/useRetryWithBackoff";
import { ImageEditor } from "./ImageEditor";
import { extractTextFromBriefFile } from "@/lib/documentParser";
import { openStudioWithPrompt } from "@/lib/studio";
import type {
  Message,
  BriefAnalysis,
  ContextImage,
  ContextDocument,
  ContextMemory,
  QuickAction,
  PendingAction,
  GenerationOptions,
  ChatAttachment,
  ToolCall,
  ToolCallDelta,
  StreamDelta,
  StreamChoice,
  StreamResponse,
  GenerateImageResponse,
  EditImageResponse,
  RetryPayload,
  ImageAnalysis,
} from "./artie/types";
import { ArtieMessage } from "./artie/ArtieMessage";
import { ArtieFloatingIcon } from "./artie/ArtieFloatingIcon";
import { ArtieChatInput } from "./artie/ArtieChatInput";
import { ArtieQuickActions } from "./artie/ArtieQuickActions";
import { ArtieGenerationDialog } from "./artie/ArtieGenerationDialog";

const SUPABASE_IMAGE_REGEX = /(https:\/\/[^\s]+\.supabase\.co\/storage\/v1\/object\/[^\s]+\.(?:jpg|jpeg|png|gif|webp))/gi;

const quickActions: QuickAction[] = [
  { icon: Lightbulb, label: "Brainstorm ideas", prompt: "Help me brainstorm creative concepts" },
  { icon: Wand2, label: "Refine my visual brief", prompt: "Can you help refine my visual direction?" },
  { icon: Sparkles, label: "Suggest social post", prompt: "Give me ideas for a compelling social media post" },
  { icon: ImageIcon, label: "Analyze my image", prompt: "Help me analyze and improve my uploaded image" },
  { icon: ImagePlus, label: "Edit my image", prompt: "Create variations of my uploaded image" },
];

export const ArtieChat = () => {
  const location = useLocation();
  const { openTool } = useToolsModal();
  const { balance, refetch: refetchCredits } = useCredits();
  const isMobile = useIsMobile();
  const { fetchWithRetry, retryState } = useRetryWithBackoff();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [hasSeenTooltip, setHasSeenTooltip] = useState(false);
  const [contextualPrompt, setContextualPrompt] = useState("");
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
  const [showGenerationDialog, setShowGenerationDialog] = useState(false);
  const [generationPrompt, setGenerationPrompt] = useState("");
  const [generationOptions, setGenerationOptions] = useState<GenerationOptions>({});
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [showCreditConfirm, setShowCreditConfirm] = useState(false);
  const [messages, setMessages] = useState<Message[]>(() => {
    // Try to restore from sessionStorage
    const saved = sessionStorage.getItem('artie-conversation');
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
      text: "Hi! I'm Artie — Your Creative Collaborator.\n\nI can help you brainstorm ideas, refine visual concepts, analyze images, or guide you through any creative challenge. You can also upload images or creative briefs for me to review, and I can create variations of your images.\n\nWhat are we working on today?",
      sender: 'artie',
      timestamp: new Date()
    }];
  });
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatBodyRef = useRef<HTMLDivElement>(null);
  const inactivityTimer = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingImageUrl, setEditingImageUrl] = useState<string>("");
  const [editorInstruction, setEditorInstruction] = useState<string>("");

  const registerContextImage = useCallback(
    (image: {
      url: string;
      messageId: string;
      name?: string;
      source: ContextImage['source'];
      timestamp?: string;
    }): ContextImage | null => {
      if (!image.url) return null;

      let createdImage: ContextImage | null = null;
      setContextMemory((prev) => {
        if (prev.images.some((img) => img.url === image.url && img.messageId === image.messageId)) {
          return prev;
        }
        createdImage = {
          url: image.url,
          messageId: image.messageId,
          name: image.name,
          source: image.source,
          timestamp: image.timestamp || new Date().toISOString(),
        };
        return {
          ...prev,
          images: [...prev.images, createdImage],
        };
      });
      return createdImage;
    },
    []
  );

  const registerDocumentContext = useCallback(
    (doc: {
      name: string;
      summary: string;
      keyInsights: string[];
      targetAudience?: string;
      deliverables?: string[];
      tonalKeywords?: string[];
      textExcerpt?: string;
    }): ContextDocument | null => {
      if (!doc.summary) return null;

      const docId =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `doc-${Date.now()}`;
      const createdDocument: ContextDocument = {
        id: docId,
        name: doc.name,
        summary: doc.summary,
        keyInsights: doc.keyInsights,
        targetAudience: doc.targetAudience,
        deliverables: doc.deliverables,
        tonalKeywords: doc.tonalKeywords,
        textExcerpt: doc.textExcerpt,
        createdAt: new Date().toISOString(),
      };

      setContextMemory((prev) => ({
        ...prev,
        documents: [...prev.documents, createdDocument],
        briefSummary: doc.summary || prev.briefSummary,
      }));

      return createdDocument;
    },
    []
  );

  const latestContextImage = useMemo(
    () => contextMemory.images[contextMemory.images.length - 1],
    [contextMemory.images]
  );

  const handleOpenLatestImage = useCallback(() => {
    if (!latestContextImage) {
      toast.error("No recent image to open");
      return;
    }

    try {
      // Minimize Artie on desktop to avoid covering Studio
      if (!isMobile) {
        setIsOpen(false);
        setIsMinimized(true);
      }
      openStudioWithPrompt({
        basePrompt: "Refine this image",
        imageUrl: latestContextImage.url,
      });
      toast.success("Opening latest image in Studio");
    } catch (error) {
      console.error('[ARTIE] Failed to open Studio:', error);
      toast.error("Unable to open image in Studio");
    }
  }, [latestContextImage, isMobile]);

  const extractSupabaseImageUrls = useCallback((text: string) => {
    if (!text) return [];
    const matches = text.match(SUPABASE_IMAGE_REGEX) || [];
    return Array.from(new Set(matches));
  }, []);

  const analyzeBriefDocument = useCallback(
    async (fileName: string, text: string): Promise<BriefAnalysis> => {
      const trimmedText = text.length > 20000 ? text.slice(0, 20000) : text;
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-brief`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          filename: fileName,
          text: trimmedText,
        }),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to analyze brief';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // ignore
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      return {
        summary: result.summary,
        keyInsights: result.key_insights || result.keyInsights || [],
        targetAudience: result.target_audience || result.targetAudience,
        deliverables: result.deliverables,
        tonalKeywords: result.tonal_keywords || result.tonalKeywords,
        suggestedActions: result.suggested_actions || result.suggestedActions,
      };
    },
    []
  );

  // Save conversation to sessionStorage
  useEffect(() => {
    if (messages.length > 1) {
      sessionStorage.setItem('artie-conversation', JSON.stringify(messages));
    }
  }, [messages]);

  useEffect(() => {
    sessionStorage.setItem('artie-context-memory', JSON.stringify(contextMemory));
  }, [contextMemory]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '40px';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = Math.min(scrollHeight, 120) + 'px';
    }
  }, [inputValue]);

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success("You're back online");
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast.error("You're offline");
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const scrollToBottom = () => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    setContextMemory((prev) => {
      const existingKeys = new Set(prev.images.map((img) => `${img.messageId}|${img.url}`));
      const additions: ContextImage[] = [];

      messages.forEach((message) => {
        if (message.attachment?.type === 'image') {
          const key = `${message.id}|${message.attachment.url}`;
          if (!existingKeys.has(key)) {
            additions.push({
              url: message.attachment.url,
              messageId: message.id,
              name: message.attachment.name,
              source: message.sender === 'user' ? 'user' : 'artie',
              timestamp: message.timestamp.toISOString(),
            });
            existingKeys.add(key);
          }
        }

        const embeddedUrls = extractSupabaseImageUrls(message.text);
        embeddedUrls.forEach((url, index) => {
          const key = `${message.id}|${url}`;
          if (!existingKeys.has(key)) {
            additions.push({
              url,
              messageId: `${message.id}-link-${index}`,
              name: 'Referenced Image',
              source: 'link',
              timestamp: message.timestamp.toISOString(),
            });
            existingKeys.add(key);
          }
        });
      });

      if (additions.length === 0) {
        return prev;
      }

      return {
        ...prev,
        images: [...prev.images, ...additions],
      };
    });
  }, [messages, extractSupabaseImageUrls]);

  // Custom event listener for mobile bottom nav
  useEffect(() => {
    const handleOpenArtie = () => {
      setIsOpen(true);
      setIsMinimized(false);
    };
    
    window.addEventListener('openArtieChat', handleOpenArtie);
    return () => window.removeEventListener('openArtieChat', handleOpenArtie);
  }, []);

  // Emergency escape handler - force close everything on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showGenerationDialog) {
          setShowGenerationDialog(false);
          setGenerationPrompt("");
        } else if (isOpen) {
          setIsOpen(false);
        } else if (isMinimized) {
          setIsMinimized(false);
        }
      }
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, isMinimized, showGenerationDialog]);

  // Prevent body scroll when chat is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

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
    if (isOpen || isMinimized) return;

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
  }, [location.pathname, isOpen, isMinimized]);

  const handleQuickAction = (action: QuickAction) => {
    setInputValue(action.prompt);
    setIsMinimized(false);
    setIsOpen(true);
  };

  const handleMinimize = () => {
    setIsMinimized(true);
    setIsOpen(false);
    toast.success("Artie minimized", {
      description: "Click the icon to restore",
    });
  };

  const handleRestore = () => {
    setIsMinimized(false);
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

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleChipAction = (action: string, messageId?: string) => {
    if (action === "OPEN_STUDIO") {
      // Find the image from this message or the most recent one
      const targetImage = messageId 
        ? contextMemory.images.find(img => img.messageId === messageId)
        : contextMemory.images[contextMemory.images.length - 1];
      
      if (targetImage) {
        // Minimize Artie on desktop to avoid covering Studio
        if (!isMobile) {
          setIsOpen(false);
          setIsMinimized(true);
        }
        openStudioWithPrompt({
          basePrompt: "Refine this image",
          imageUrl: targetImage.url,
        });
        toast.success("Opening in Studio", {
          description: "Your image has been loaded into the Studio editor",
        });
      } else {
        toast.error("No image found", {
          description: "Couldn't find the image to open in Studio",
        });
      }
      return;
    }
    
    if (action === "EDIT_IMAGE") {
      // Find the image from this message or the most recent one
      const targetImage = messageId 
        ? contextMemory.images.find(img => img.messageId === messageId)
        : contextMemory.images[contextMemory.images.length - 1];
      
      if (targetImage) {
        // Close Artie completely on desktop to avoid covering Edit modal
        // On mobile, ToolDrawer handles the modal properly, so we can keep Artie open
        if (!isMobile) {
          setIsOpen(false);
          setIsMinimized(false);
          // Use setTimeout to ensure Artie closes before modal opens
          setTimeout(() => {
            setEditingImageUrl(targetImage.url);
            setEditorInstruction("");
            setEditorOpen(true);
          }, 100);
        } else {
          // On mobile, open immediately - ToolDrawer handles z-index properly
          setEditingImageUrl(targetImage.url);
          setEditorInstruction("");
          setEditorOpen(true);
        }
      } else {
        toast.error("No image found", {
          description: "Couldn't find the image to edit",
        });
      }
      return;
    }
    
    setInputValue(action);
    setTimeout(() => handleSend(), 100);
  };

  const handleSend = async (contextData?: RetryPayload) => {
    if ((!inputValue.trim() && uploadedFiles.length === 0) || isLoading) return;

    setIsLoading(true);
    setIsUploading(true);

    try {
      const attachments: ChatAttachment[] = [];
      const trackedImages: ContextImage[] = [];
      const trackedDocuments: ContextDocument[] = [];
      const userMessageId =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : Date.now().toString();

      const embeddedImageUrls = extractSupabaseImageUrls(inputValue);
      embeddedImageUrls.forEach((imageUrl, index) => {
        attachments.push({
          type: 'image',
          url: imageUrl,
          name: 'Referenced Image',
        });
        const registered = registerContextImage({
          url: imageUrl,
          messageId: `${userMessageId}-link-${index}`,
          name: 'Referenced Image',
          source: 'link',
          timestamp: new Date().toISOString(),
        });
        if (registered) {
          trackedImages.push(registered);
        }
      });

      for (const file of uploadedFiles) {
        if (file.type.startsWith('image/')) {
          const fileExt = file.name.split('.').pop();
          const randomPart =
            typeof crypto !== 'undefined' && 'randomUUID' in crypto
              ? crypto.randomUUID()
              : Math.random().toString(36).slice(2);
          const fileName = `${randomPart}.${fileExt}`;
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
              const registered = registerContextImage({
                url: publicUrl,
                messageId: userMessageId,
                name: file.name,
                source: 'user',
                timestamp: new Date().toISOString(),
              });
              if (registered) {
                trackedImages.push(registered);
              }
            }
          }
        } else if (file.type === 'application/pdf' || file.type.includes('word')) {
          const reader = new FileReader();
          const fileData = await new Promise<string>((resolve, reject) => {
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.onerror = () => reject(new Error('Failed to read document'));
            reader.readAsDataURL(file);
          });

          try {
            const extractedText = await extractTextFromBriefFile(file);
            if (!extractedText) {
              throw new Error('Unable to extract text from document');
            }
            const briefAnalysis = await analyzeBriefDocument(file.name, extractedText);
            const registered = registerDocumentContext({
              name: file.name,
              summary: briefAnalysis.summary,
              keyInsights: briefAnalysis.keyInsights || [],
              targetAudience: briefAnalysis.targetAudience,
              deliverables: briefAnalysis.deliverables,
              tonalKeywords: briefAnalysis.tonalKeywords,
              textExcerpt: extractedText.slice(0, 1200),
            });
            if (registered) {
              trackedDocuments.push(registered);
            }

            attachments.push({
              type: 'document',
              url: fileData,
              name: file.name,
              analysis: briefAnalysis,
              excerpt: extractedText.slice(0, 2000),
            });

            toast.success("Brief processed", {
              description: `I've summarized ${file.name}.`,
            });
          } catch (docError) {
            const errorMessage = docError instanceof Error ? docError.message : 'Document analysis failed';
            console.error('[ARTIE] Brief analysis error:', docError);
            toast.error("Brief analysis failed", {
              description: errorMessage,
            });

            attachments.push({
              type: 'document',
              url: fileData,
              name: file.name,
            });
          }
        }
      }

      const userMessage: Message = {
        id: userMessageId,
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

      const assistantMessageId = (Date.now() + 1).toString();
      
      try {
        const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/artie-chat`;
        
        // Build context-aware message with attachments
        let contextualInput = inputValue || "Please review these files";
        const contextParts: string[] = [];
        
        if (attachments.length > 0) {
          for (const att of attachments) {
            if (att.type === 'image') {
              contextParts.push(`[User uploaded image: ${att.name}]`);
            } else if (att.type === 'document') {
              if (att.analysis?.summary) {
                contextParts.push(`[Brief summary (${att.name}): ${att.analysis.summary}]`);
              } else {
                contextParts.push(`[User uploaded document: ${att.name} - analyzing for creative brief content]`);
              }
            }
          }
        }
        
        const combinedDocuments = [
          ...contextMemory.documents,
          ...trackedDocuments,
        ];
        const recentDocuments = combinedDocuments.slice(-3);
        recentDocuments.forEach((doc) => {
          const keyInsightSnippet = doc.keyInsights?.slice(0, 3).join('; ');
          contextParts.push(
            `Brief "${doc.name}" summary: ${doc.summary}` +
              (keyInsightSnippet ? ` | Key points: ${keyInsightSnippet}` : '')
          );
        });

        if (contextMemory.briefSummary && combinedDocuments.length === 0) {
          contextParts.push(`Previous brief context: ${contextMemory.briefSummary}`);
        }

        const combinedImages = [
          ...contextMemory.images,
          ...trackedImages,
        ];
        const uniqueImages: ContextImage[] = [];
        const seenImageUrls = new Set<string>();
        combinedImages.forEach((img) => {
          if (!seenImageUrls.has(img.url)) {
            seenImageUrls.add(img.url);
            uniqueImages.push(img);
          }
        });
        const recentImages = uniqueImages.slice(-4);
        recentImages.forEach((img, index) => {
          contextParts.push(
            `Image reference ${index + 1} (${img.source}): ${img.url}`
          );
        });

        if (trackedDocuments.length === 0 && contextMemory.briefSummary) {
          contextParts.push(`Retained brief context: ${contextMemory.briefSummary}`);
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
        
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          throw new Error('No active session. Please sign in.');
        }

        const response = await fetch(CHAT_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            messages: messages
              .filter(m => m.sender === 'user' || m.sender === 'artie')
              .slice(-10)
              .map(m => {
                // Include image attachments in message content for multimodal understanding
                if (m.attachment?.type === 'image') {
                  return {
                    role: m.sender === 'user' ? 'user' : 'assistant',
                    content: [
                      { type: 'text', text: m.text },
                      { type: 'image_url', image_url: { url: m.attachment.url } }
                    ] as Array<{ type: 'text' | 'image_url'; text?: string; image_url?: { url: string } }>
                  };
                }
                return {
                  role: m.sender === 'user' ? 'user' : 'assistant',
                  content: m.text
                };
              })
              .concat([
                attachments.length > 0 && attachments[0].type === 'image'
                  ? {
                      role: 'user' as const,
                      content: [
                        { type: 'text' as const, text: contextualInput },
                        { type: 'image_url' as const, image_url: { url: attachments[0].url } }
                      ]
                    }
                  : {
                      role: 'user' as const,
                      content: contextualInput
                    }
              ]),
            attachments: attachments,
            contextMemory: {
              ...contextMemory,
              images: combinedImages,
              documents: combinedDocuments,
              briefSummary: trackedDocuments[trackedDocuments.length - 1]?.summary || contextMemory.briefSummary,
            }
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to get response from Artie');
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let accumulatedText = '';
        let textBuffer = '';
        const toolCalls: ToolCall[] = [];

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
                  delta.tool_calls.forEach((tc: ToolCallDelta) => {
                    if (tc.index !== undefined) {
                      if (!toolCalls[tc.index]) {
                        toolCalls[tc.index] = {
                          id: tc.id || '',
                          type: tc.type || '',
                          function: { name: tc.function?.name || '', arguments: '' }
                        };
                      }
                      if (tc.function?.arguments) {
                        toolCalls[tc.index].function.arguments += tc.function.arguments;
                      }
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
              const args = JSON.parse(toolCall.function.arguments);
              
              if (toolCall.function.name === 'open_studio') {
                accumulatedText += `\n\n✨ Opening Studio with your refined prompt...`;
                setMessages(prev => 
                  prev.map(m => 
                    m.id === assistantMessageId 
                      ? { ...m, text: accumulatedText }
                      : m
                  )
                );
                
                // Set generation dialog data
                setGenerationPrompt(args.prompt);
                setGenerationOptions({
                  quality: args.quality || 'auto',
                  size: args.size || '1024x1024'
                });
                setShowGenerationDialog(true);
                
              } else if (toolCall.function.name === 'open_upscale') {
                accumulatedText += `\n\n🔍 Opening Upscale tool...`;
                setMessages(prev => 
                  prev.map(m => 
                    m.id === assistantMessageId 
                      ? { ...m, text: accumulatedText }
                      : m
                  )
                );
                
                openTool('upscale', {
                  scaleFactor: args.scaleFactor || '2',
                  ...(args.imageUrl && { imageUrl: args.imageUrl })
                });
                
              } else if (toolCall.function.name === 'open_blend') {
                accumulatedText += `\n\n🎨 Opening Blend tool...`;
                setMessages(prev => 
                  prev.map(m => 
                    m.id === assistantMessageId 
                      ? { ...m, text: accumulatedText }
                      : m
                  )
                );
                
                openTool('blend', {
                  mode: args.mode || 'merge',
                  ratio: args.ratio || 50
                });
                
              } else if (toolCall.function.name === 'generate_image') {
                accumulatedText += '\n\n✨ Generating image...';
                setMessages(prev => 
                  prev.map(m => 
                    m.id === assistantMessageId 
                      ? { ...m, text: accumulatedText }
                      : m
                  )
                );

                try {
                  console.log('[ARTIE] Generating image with prompt:', args.prompt);
                  const { data: { session } } = await supabase.auth.getSession();
                  
                  if (!session?.access_token) {
                    throw new Error('No active session');
                  }

                  // Use retry with exponential backoff
                  const genData = await fetchWithRetry<GenerateImageResponse>(
                    () => fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-image`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.access_token}`,
                      },
                      body: JSON.stringify({ 
                        prompt: args.prompt,
                        quality: args.quality || 'auto',
                        size: args.size || '1024x1024'
                      })
                    }),
                    {
                      maxRetries: 3,
                      baseDelayMs: 2000,
                      onRetry: (attempt, error) => {
                        console.log(`[ARTIE] Generate retry attempt ${attempt}:`, error.message);
                        // Update UI to show retry status
                        const retryText = `\n\n⏳ Retrying (attempt ${attempt}/3)...`;
                        setMessages(prev => 
                          prev.map(m => 
                            m.id === assistantMessageId 
                              ? { ...m, text: accumulatedText + retryText }
                              : m
                          )
                        );
                      }
                    }
                  );
                  console.log('[ARTIE] Generated image data:', genData);
                  
                  if (genData.image) {
                    // Verify the image was saved to database
                    if (!genData.assetId) {
                      console.warn('[ARTIE] Image generated but not saved to My Projects. Attempting fallback save...');
                      try {
                        const { data: { user } } = await supabase.auth.getUser();
                        if (user) {
                          const { data: savedAsset, error: saveError } = await supabase
                            .from('generated_assets')
                            .insert({
                              user_id: user.id,
                              type: 'image',
                              action: 'generate',
                              prompt: args.prompt,
                              image_url: genData.image,
                              params: {
                                quality: args.quality || 'auto',
                                size: args.size || '1024x1024',
                                fallback_save: true
                              }
                            })
                            .select()
                            .single();

                          if (saveError) {
                            console.error('[ARTIE] Fallback save failed:', saveError);
                          } else {
                            console.log('[ARTIE] Fallback save successful:', savedAsset?.id);
                          }
                        }
                      } catch (fallbackError) {
                        console.error('[ARTIE] Fallback save exception:', fallbackError);
                      }
                    } else {
                      console.log('[ARTIE] Image saved to My Projects:', genData.assetId);
                    }

                    accumulatedText = accumulatedText.replace(/✨ Generating image\.\.\.|⏳ Retrying \(attempt \d\/3\)\.\.\./g, '').trim();
                    accumulatedText += `\n\n✅ Image generated!`;
                    await refetchCredits();
                    setMessages(prev => 
                      prev.map(m => 
                        m.id === assistantMessageId 
                          ? { 
                              ...m, 
                              text: accumulatedText,
                              attachment: {
                                type: 'image',
                                url: genData.image,
                                name: 'Generated Image'
                              }
                            }
                          : m
                      )
                    );
                  } else {
                    throw new Error('No image URL in response');
                  }
                } catch (imgError) {
                  console.error('[ARTIE] Image generation error:', imgError);
                  const errorMessage = imgError instanceof Error ? imgError.message : 'Unknown error';
                  accumulatedText = accumulatedText.replace(/✨ Generating image\.\.\.|⏳ Retrying \(attempt \d\/3\)\.\.\./g, '').trim();
                  accumulatedText += `\n\n❌ Failed to generate image: ${errorMessage}`;
                  setMessages(prev => 
                    prev.map(m => 
                      m.id === assistantMessageId 
                        ? { ...m, text: accumulatedText }
                        : m
                    )
                  );
                  
                  toast.error("Image generation failed", {
                    description: errorMessage,
                  });
                }
              } else if (toolCall.function.name === 'edit_image') {
                if (!args.instruction || typeof args.instruction !== 'string' || !args.instruction.trim()) {
                  accumulatedText += '\n\n⚠️ I need a clear edit instruction before I can modify this image. Try something like “brighten the lighting and lean into a cinematic teal-orange palette.”';
                  setMessages(prev => 
                    prev.map(m => 
                      m.id === assistantMessageId 
                        ? { ...m, text: accumulatedText }
                        : m
                    )
                  );
                  continue;
                }

                // Validate instruction
                if (!args.instruction || !args.instruction.trim() || args.instruction.trim().length < 3) {
                  accumulatedText += '\n\n❌ Please provide a clear editing instruction (at least 3 characters). For example: "brighten the image", "remove the background", or "change colors to blue".';
                  setMessages(prev => 
                    prev.map(m => 
                      m.id === assistantMessageId 
                        ? { ...m, text: accumulatedText }
                        : m
                    )
                  );
                  continue;
                }

                const instruction = args.instruction.trim();

                const lastImage = contextMemory.images?.[contextMemory.images.length - 1];
                const imageUrl = args.imageUrl || lastImage?.url;
                if (!imageUrl) {
                  accumulatedText += '\n\n❌ No image provided. Please upload or reference an image first.';
                  setMessages(prev => 
                    prev.map(m => 
                      m.id === assistantMessageId 
                        ? { ...m, text: accumulatedText }
                        : m
                    )
                  );
                  continue;
                }

                // Open Edit Image Modal with pre-filled instruction
                // Close Artie completely on desktop to avoid covering Edit modal
                // On mobile, ToolDrawer handles the modal properly, so we can keep Artie open
                if (!isMobile) {
                  setIsOpen(false);
                  setIsMinimized(false);
                  // Use setTimeout to ensure Artie closes before modal opens
                  setTimeout(() => {
                    setEditingImageUrl(imageUrl);
                    setEditorInstruction(instruction);
                    setEditorOpen(true);
                  }, 100);
                } else {
                  // On mobile, open immediately - ToolDrawer handles z-index properly
                  setEditingImageUrl(imageUrl);
                  setEditorInstruction(instruction);
                  setEditorOpen(true);
                }
                
                accumulatedText += `\n\n✅ Opening Edit Image tool with instruction: "${instruction}"\n\nYou can review and adjust the settings before applying the changes.`;
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
      } catch (error) {
        console.error('[ARTIE] Chat error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        // Add error message with retry capability
        const errorMsg: Message = {
          id: (Date.now() + 2).toString(),
          text: `❌ ${errorMessage === 'Failed to get response from Artie' 
            ? 'Temporary issue connecting to Artie. Please retry.' 
            : `Error: ${errorMessage}`}`,
          sender: 'artie',
          timestamp: new Date(),
          error: true,
          retryPayload: contextData
        };
        
        setMessages(prev => {
          // Remove temporary loading message
          const filtered = prev.filter(m => m.id !== assistantMessageId);
          return [...filtered, errorMsg];
        });
        
        toast.error("Connection Error", {
          description: "Couldn't reach Artie. Check your connection and retry.",
          action: {
            label: "Retry",
            onClick: () => handleSend(contextData)
          }
        });
      }
    } catch (uploadError) {
      console.error('[ARTIE] Upload error:', uploadError);
      const errorMessage = uploadError instanceof Error ? uploadError.message : 'Unknown error';
      
      toast.error("Upload Failed", {
        description: errorMessage.includes('storage') 
          ? "Storage error. Check file size and format." 
          : "Failed to process files. Please try again.",
      });
      
      setIsUploading(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Persistent floating icon (always visible)
  const FloatingIcon = () => (
    <div className="fixed bottom-6 right-4 md:bottom-8 md:right-6 z-40 pointer-events-auto">
      {/* Contextual prompt bubble */}
      {showPrompt && contextualPrompt && !isMinimized && (
        <div 
          className="absolute bottom-full right-0 mb-3 animate-slide-up pointer-events-auto"
          onClick={() => {
            setIsOpen(true);
            setShowPrompt(false);
          }}
        >
          <div className="bg-card border border-border rounded-xl px-4 py-3 shadow-lg max-w-[240px] md:max-w-[280px] cursor-pointer hover:shadow-xl transition-shadow">
            <p className="text-sm font-medium">{contextualPrompt}</p>
            <div className="absolute bottom-0 right-6 transform translate-y-1/2 rotate-45 w-3 h-3 bg-card border-r border-b border-border" />
          </div>
        </div>
      )}

      {/* Animated Artie icon */}
      <Tooltip open={!hasSeenTooltip && !isOpen && !isMinimized} delayDuration={300}>
        <TooltipTrigger asChild>
          <button
            onClick={() => isMinimized ? handleRestore() : setIsOpen(true)}
            aria-label="Chat with Artie"
            className={cn(
              "relative h-14 w-14 md:h-16 md:w-16 rounded-full shadow-strong transition-all duration-300",
              "bg-gradient-to-br from-primary to-primary/80",
              "hover:scale-110 hover:shadow-2xl",
              "flex items-center justify-center group",
              !isOpen && !isMinimized && "animate-glow-pulse",
              isMinimized && "ring-2 ring-primary ring-offset-2 ring-offset-background"
            )}
          >
            {/* Glow ring */}
            <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse pointer-events-none" />
            
            {/* Icon with subtle animation */}
            <div className="relative">
              <Sparkles className="h-6 w-6 md:h-7 md:w-7 text-primary-foreground transition-transform group-hover:rotate-12" />
            </div>

            {/* Status indicator */}
            <div className={cn(
              "absolute -top-1 -right-1 h-3 w-3 md:h-4 md:w-4 rounded-full border-2 border-background",
              isMinimized ? "bg-amber-500 animate-bounce" : "bg-green-500 animate-pulse"
            )} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="left" className="text-sm max-w-[180px] md:max-w-[200px] mr-2" sideOffset={8}>
          <p className="font-medium">{isMinimized ? "Click to restore Artie" : "Need creative help? Try Artie."}</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );

  // Show floating button on mobile only when closed
  if (!isOpen && isMobile) {
    return <FloatingIcon />;
  }

  if (!isOpen) {
    return <FloatingIcon />;
  }

  // Side panel drawer
  return (
    <>
      {!isMobile && <FloatingIcon />}
      
      {/* Backdrop - Click to close */}
      <button 
        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 animate-fade-in cursor-default"
        onClick={() => setIsOpen(false)}
        aria-label="Close chat"
        type="button"
      />

      {/* Side Panel Drawer */}
      <div className="fixed top-0 right-0 h-[100dvh] h-[100svh] w-[90vw] sm:w-[460px] md:w-[520px] bg-background border-l border-border shadow-strong z-[60] flex flex-col animate-slide-in-right pointer-events-auto safe-bottom">
        {/* Header - Fixed 56-64px */}
        <div className="h-14 md:h-16 flex-shrink-0 flex items-center justify-between px-4 md:px-6 border-b border-border bg-surface-1">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="h-9 w-9 md:h-10 md:w-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-subtle">
                <Sparkles className="h-4 w-4 md:h-5 md:w-5 text-primary-foreground" />
              </div>
              <div className={cn(
                "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 md:h-3 md:w-3 rounded-full border-2 border-background",
                isOnline ? "bg-green-500" : "bg-destructive"
              )} />
            </div>
            <div>
              <h3 className="font-semibold text-base md:text-lg">Artie</h3>
              <p className="text-[10px] md:text-xs text-muted-foreground">
                {isOnline ? "Creative Collaborator" : "Offline"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {latestContextImage && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleOpenLatestImage}
                    className="h-8 w-8 hover:bg-muted"
                    aria-label="Open latest image in Studio"
                  >
                    <ImageIcon className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Open latest image in Studio</TooltipContent>
              </Tooltip>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleMinimize}
                  className="h-8 w-8 hover:bg-muted"
                >
                  <Minimize2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Minimize</TooltipContent>
            </Tooltip>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="h-8 w-8 hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Quick Actions - Collapsible */}
        <div className="flex-shrink-0 px-4 md:px-6 py-3 md:py-4 border-b border-border bg-surface-2">
          <p className="text-[10px] md:text-xs font-medium text-muted-foreground mb-2 md:mb-3">Quick Actions</p>
          {/* Desktop: 2-row grid, Mobile: horizontal scroll */}
          <div className="hidden md:grid md:grid-cols-2 md:gap-2">
            {quickActions.map((action) => (
              <Button
                key={action.label}
                variant="outline"
                size="sm"
                onClick={() => handleQuickAction(action)}
                className="justify-start gap-2 text-xs h-10 hover:bg-accent transition-colors"
                disabled={!isOnline}
              >
                <action.icon className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{action.label}</span>
              </Button>
            ))}
          </div>
          <div className="flex md:hidden gap-2 overflow-x-auto scrollbar-hide snap-x snap-mandatory">
            {quickActions.map((action) => (
              <Button
                key={action.label}
                variant="outline"
                size="sm"
                onClick={() => handleQuickAction(action)}
                className="flex-shrink-0 snap-start gap-2 text-xs h-9 hover:bg-accent"
                disabled={!isOnline}
              >
                <action.icon className="h-3.5 w-3.5" />
                {action.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Chat Body - Scrollable with proper spacing */}
        <div 
          ref={chatBodyRef}
          className="flex-1 overflow-y-auto px-4 md:px-6 py-4 md:py-5 space-y-3 md:space-y-4 overscroll-contain"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {messages.map((message) => {
            const inlineImageUrls = extractSupabaseImageUrls(message.text);
            return (
            <div
              key={message.id}
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
                                // Minimize Artie on desktop to avoid covering Studio
                                if (!isMobile) {
                                  setIsOpen(false);
                                  setIsMinimized(true);
                                }
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
                                // Close Artie completely on desktop to avoid covering Edit modal
                                // On mobile, ToolDrawer handles the modal properly, so we can keep Artie open
                                if (!isMobile) {
                                  setIsOpen(false);
                                  setIsMinimized(false);
                                  // Use setTimeout to ensure Artie closes before modal opens
                                  setTimeout(() => {
                                    setEditingImageUrl(message.attachment?.url || "");
                                    setEditorInstruction("");
                                    setEditorOpen(true);
                                  }, 100);
                                } else {
                                  // On mobile, open immediately - ToolDrawer handles z-index properly
                                  setEditingImageUrl(message.attachment?.url || "");
                                  setEditorInstruction("");
                                  setEditorOpen(true);
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
                            <FileText className="h-4 w-4 text-muted-foreground" />
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
                                // Minimize Artie on desktop to avoid covering Studio
                                if (!isMobile) {
                                  setIsOpen(false);
                                  setIsMinimized(true);
                                }
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
                              onClick={() => {
                                // Close Artie completely on desktop to avoid covering Edit modal
                                // On mobile, ToolDrawer handles the modal properly, so we can keep Artie open
                                if (!isMobile) {
                                  setIsOpen(false);
                                  setIsMinimized(false);
                                  // Use setTimeout to ensure Artie closes before modal opens
                                  setTimeout(() => {
                                    setEditingImageUrl(url);
                                    setEditorInstruction("");
                                    setEditorOpen(true);
                                  }, 100);
                                } else {
                                  // On mobile, open immediately - ToolDrawer handles z-index properly
                                  setEditingImageUrl(url);
                                  setEditorInstruction("");
                                  setEditorOpen(true);
                                }
                              }}
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
                      onClick={() => handleSend(message.retryPayload)}
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
                          onClick={() => handleChipAction(chip.action)}
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
          )})}
          
          {/* Typing Indicator */}
          {isLoading && (
            <div className="flex justify-start animate-fade-in">
              <div className="flex items-end gap-2">
                <div className="h-6 w-6 md:h-7 md:w-7 rounded-lg bg-surface-3 flex items-center justify-center flex-shrink-0 mb-1">
                  <Sparkles className="h-3 w-3 md:h-3.5 md:w-3.5 text-primary animate-pulse" />
                </div>
                <div className="bg-surface-3 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2 shadow-xs">
                  <div className="flex gap-1">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar - Sticky bottom with elevation */}
        <div className="flex-shrink-0 relative z-[70] px-4 md:px-6 py-2 md:py-2.5 pb-[calc(0.5rem+env(safe-area-inset-bottom))] md:pb-2.5 border-t border-border bg-surface-1 shadow-[0_-1px_8px_rgba(0,0,0,0.08)] safe-bottom" style={{ position: 'sticky', bottom: 0 }}>
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
                    onClick={() => removeFile(index)}
                    className="ml-0.5 hover:text-destructive transition-colors"
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
              className="h-10 w-10 flex-shrink-0 hover:bg-accent"
              disabled={isLoading || !isOnline}
            >
              <Paperclip className="h-5 w-5" />
            </Button>

            <Textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
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
              className="flex-1 min-h-[40px] max-h-[120px] py-2.5 px-3 resize-none bg-background border-input focus-visible:ring-ring text-sm leading-relaxed text-foreground"
              style={{
                color: 'hsl(var(--foreground)) !important',
                WebkitTextFillColor: 'hsl(var(--foreground)) !important',
                WebkitTapHighlightColor: 'transparent',
                caretColor: 'hsl(var(--foreground)) !important',
                opacity: 1,
                visibility: 'visible'
              }}
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
      </div>

      {/* Image Generation Dialog */}
      {showGenerationDialog && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm pointer-events-auto">
          <div className="bg-card border border-border rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-auto p-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Generate Image</h3>
                <p className="text-sm text-muted-foreground">Artie has prepared this prompt for you.</p>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Prompt</label>
                <textarea
                  value={generationPrompt}
                  onChange={(e) => setGenerationPrompt(e.target.value)}
                  className="w-full min-h-[120px] p-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none resize-y"
                  placeholder="Describe the image you want to generate..."
                />
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowGenerationDialog(false);
                    setGenerationPrompt("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    if (!generationPrompt.trim()) {
                      toast.error("Please enter a prompt");
                      return;
                    }

                    try {
                      setShowGenerationDialog(false);
                      
                      // Add a message showing generation started
                      const genMessageId = Date.now().toString();
                      setMessages(prev => [...prev, {
                        id: genMessageId,
                        text: `Generating: "${generationPrompt.slice(0, 100)}..." ✨`,
                        sender: 'artie',
                        timestamp: new Date()
                      }]);

                      const { data: { session } } = await supabase.auth.getSession();
                      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-image`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${session?.access_token}`,
                        },
                        body: JSON.stringify({ 
                          prompt: generationPrompt,
                          ...generationOptions
                        })
                      });

                      const data = await response.json();
                      if (data.image || data.imageUrl) {
                        const imageUrl = data.image || data.imageUrl;
                        
                        // Verify the image was saved to database
                        if (!data.assetId) {
                          console.warn('[ARTIE] Image generated but not saved to My Projects. Attempting fallback save...');
                          try {
                            const { data: { user } } = await supabase.auth.getUser();
                            if (user) {
                              const { data: savedAsset, error: saveError } = await supabase
                                .from('generated_assets')
                                .insert({
                                  user_id: user.id,
                                  type: 'image',
                                  action: 'generate',
                                  prompt: generationPrompt,
                                  image_url: imageUrl,
                                  params: {
                                    ...generationOptions,
                                    fallback_save: true
                                  }
                                })
                                .select()
                                .single();

                              if (saveError) {
                                console.error('[ARTIE] Fallback save failed:', saveError);
                              } else {
                                console.log('[ARTIE] Fallback save successful:', savedAsset?.id);
                              }
                            }
                          } catch (fallbackError) {
                            console.error('[ARTIE] Fallback save exception:', fallbackError);
                          }
                        } else {
                          console.log('[ARTIE] Image saved to My Projects:', data.assetId);
                        }

                        setMessages(prev => prev.map(m => 
                          m.id === genMessageId
                            ? { ...m, text: `Generated successfully! 🎨\n\n![Generated Image](${imageUrl})`, attachment: { type: 'image' as const, url: imageUrl, name: 'Generated' } }
                            : m
                        ));
                        toast.success("Image generated successfully!");
                        refetchCredits();
                      } else {
                        throw new Error(data.error || 'Generation failed');
                      }
                    } catch (error: unknown) {
                      console.error('Generation error:', error);
                      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                      toast.error("Generation failed", {
                        description: errorMessage,
                      });
                    }
                    
                    setGenerationPrompt("");
                  }}
                  className="gap-2"
                >
                  <Zap className="h-4 w-4" />
                  Generate (1 credit)
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ImageEditor
        open={editorOpen}
        onOpenChange={(open) => {
          setEditorOpen(open);
          if (!open) {
            setEditorInstruction("");
          }
        }}
        imageUrl={editingImageUrl}
        initialInstruction={editorInstruction}
        onImageEdited={async (newImageUrl) => {
          // Verify the edited image was saved
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              // Check if this image exists in generated_assets
              const { data: existingAsset } = await supabase
                .from('generated_assets')
                .select('id')
                .eq('image_url', newImageUrl)
                .single();

              if (!existingAsset) {
                console.warn('[ARTIE] Edited image not found in My Projects. Attempting save...');
                const { data: savedAsset, error: saveError } = await supabase
                  .from('generated_assets')
                  .insert({
                    user_id: user.id,
                    type: 'image',
                    action: 'edit',
                    image_url: newImageUrl,
                    source_urls: [editingImageUrl],
                    params: { source: 'artie_edit' }
                  })
                  .select()
                  .single();

                if (saveError) {
                  console.error('[ARTIE] Failed to save edited image:', saveError);
                } else {
                  console.log('[ARTIE] Edited image saved to My Projects:', savedAsset?.id);
                }
              } else {
                console.log('[ARTIE] Edited image already in My Projects:', existingAsset.id);
              }
            }
          } catch (error) {
            console.error('[ARTIE] Error verifying/saving edited image:', error);
          }

          // Add the edited image to context memory
        const imageMessageId =
          typeof crypto !== 'undefined' && 'randomUUID' in crypto
            ? crypto.randomUUID()
            : `artie-image-${Date.now()}`;
          registerContextImage({
            url: newImageUrl,
            messageId: imageMessageId,
            name: 'Edited Image',
            source: 'artie',
            timestamp: new Date().toISOString()
          });
        
          // Add a message showing the edited result
          const editedMessage: Message = {
            id: imageMessageId,
            text: '✨ Image edited successfully!',
            sender: 'artie',
            timestamp: new Date(),
            attachment: { type: 'image', url: newImageUrl, name: 'Edited Image' },
            actionChips: [
              { label: '🎨 Open in Studio', action: 'OPEN_STUDIO' },
              { label: '✏️ Edit Again', action: 'EDIT_IMAGE' }
            ]
          };
          setMessages(prev => [...prev, editedMessage]);
          toast.success("Your edited image is ready and saved to My Projects!");
          setEditorOpen(false);
        }}
      />
    </>
  );
};
