import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useToolsModal } from "@/contexts/ToolsModalContext";
import { useCredits } from "@/hooks/useCredits";
import { useRetryWithBackoff } from "@/hooks/useRetryWithBackoff";
import { extractTextFromBriefFile } from "@/lib/documentParser";
import { openStudioWithPrompt } from "@/lib/studio";
import { 
  addImageToMemory, 
  getAllImagesFromMemory, 
  findImageByReference,
  analyzeAndStoreImage 
} from "@/lib/artie/imageMemory";
import type {
  Message,
  BriefAnalysis,
  ContextImage,
  ContextDocument,
  ContextMemory,
  ChatAttachment,
  ToolCall,
  ToolCallDelta,
  RetryPayload,
  GenerateImageResponse,
} from "@/components/artie/types";

const SUPABASE_IMAGE_REGEX = /(https:\/\/[^\s]+\.supabase\.co\/storage\/v1\/object\/[^\s]+\.(?:jpg|jpeg|png|gif|webp))/gi;

export function useArtieCore() {
  const { openTool } = useToolsModal();
  const { balance, refetch: refetchCredits } = useCredits();
  const { fetchWithRetry } = useRetryWithBackoff();
  const isMountedRef = useRef(true);
  const processedImagesRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);
  const sessionStartTime = useRef<Date>(new Date());
  const recentActions = useRef<string[]>([]);

  const [messages, setMessages] = useState<Message[]>(() => {
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
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
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

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingImageUrl, setEditingImageUrl] = useState<string>("");
  const [editorInstruction, setEditorInstruction] = useState<string>("");
  const [userPreferences, setUserPreferences] = useState<any>(null);
  const [currentWorkflowAction, setCurrentWorkflowAction] = useState<'analyzing' | 'generating' | 'editing' | 'blending' | 'upscaling' | 'browsing' | undefined>();

  // Set mounted flag and cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Load user preferences on mount
  useEffect(() => {
    const loadUserPreferences = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { getUserPreferences } = await import('@/lib/intelligence/userBehavior');
          const preferences = await getUserPreferences(user.id);
          if (isMountedRef.current) {
            setUserPreferences(preferences);
          }
        }
      } catch (error) {
        console.error('[useArtieCore] Error loading user preferences:', error);
      }
    };
    loadUserPreferences();
  }, []);

  // Track workflow actions
  const trackWorkflowAction = useCallback((action: 'analyzing' | 'generating' | 'editing' | 'blending' | 'upscaling' | 'browsing') => {
    setCurrentWorkflowAction(action);
    recentActions.current = [...recentActions.current.slice(-9), action];
  }, []);

  // Learn from user action
  const learnFromAction = useCallback(async (
    action: 'upscale' | 'blend' | 'edit' | 'save' | 'reject',
    imageUrl?: string,
    metadata?: Record<string, unknown>
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { learnFromUserAction } = await import('@/lib/intelligence/userBehavior');
        await learnFromUserAction(user.id, action, imageUrl, metadata);
        const { getUserPreferences } = await import('@/lib/intelligence/userBehavior');
        const updatedPreferences = await getUserPreferences(user.id);
        setUserPreferences(updatedPreferences);
      }
    } catch (error) {
      console.error('[useArtieCore] Error learning from action:', error);
    }
  }, []);

  // Save conversation to sessionStorage
  useEffect(() => {
    if (messages.length > 1) {
      sessionStorage.setItem('artie-conversation', JSON.stringify(messages));
    }
  }, [messages]);

  // Save context memory to sessionStorage
  useEffect(() => {
    sessionStorage.setItem('artie-context-memory', JSON.stringify(contextMemory));
  }, [contextMemory]);

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

  // Initialize processed images ref with images already in contextMemory on first mount
  useEffect(() => {
    if (!initializedRef.current) {
      contextMemory.images.forEach((img) => {
        processedImagesRef.current.add(`${img.messageId}|${img.url}`);
      });
      initializedRef.current = true;
    }
  }, [contextMemory.images]);

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

  const extractSupabaseImageUrls = useCallback((text: string) => {
    if (!text) return [];
    const matches = text.match(SUPABASE_IMAGE_REGEX) || [];
    return Array.from(new Set(matches));
  }, []);

  const analyzeBriefDocument = useCallback(
    async (fileName: string, text: string): Promise<BriefAnalysis> => {
      const { analyzeCreativeBrief } = await import('@/lib/artie/creativeBriefIntelligence');
      const enhancedAnalysis = await analyzeCreativeBrief(fileName, text);
      
      const result: BriefAnalysis = {
        summary: enhancedAnalysis.summary,
        keyInsights: enhancedAnalysis.keyInsights,
        targetAudience: enhancedAnalysis.targetAudience,
        deliverables: enhancedAnalysis.deliverables,
        tonalKeywords: enhancedAnalysis.tonalKeywords,
        suggestedActions: [
          ...(enhancedAnalysis.conceptIdeas?.slice(0, 2) || []),
          ...(enhancedAnalysis.moodboardDirections?.slice(0, 1) || []),
        ],
        enhancedAnalysis: {
          summary: enhancedAnalysis.summary,
          keyInsights: enhancedAnalysis.keyInsights,
          targetAudience: enhancedAnalysis.targetAudience,
          deliverables: enhancedAnalysis.deliverables,
          tonalKeywords: enhancedAnalysis.tonalKeywords,
          brandTone: enhancedAnalysis.brandTone,
          visualDirection: enhancedAnalysis.visualDirection,
          colorPalette: enhancedAnalysis.colorPalette,
          styleKeywords: enhancedAnalysis.styleKeywords,
          moodboardDirections: enhancedAnalysis.moodboardDirections,
          conceptIdeas: enhancedAnalysis.conceptIdeas,
          firstPostDrafts: enhancedAnalysis.firstPostDrafts,
          brandStories: enhancedAnalysis.brandStories,
          visualReferences: enhancedAnalysis.visualReferences,
          constraints: enhancedAnalysis.constraints,
          goals: enhancedAnalysis.goals,
        },
      };
      return result;
    },
    []
  );

  // Process messages and update contextMemory
  useEffect(() => {
    if (!isMountedRef.current) return;
    if (messages.length === 0) return;

    const additions: ContextImage[] = [];
    const imagesToProcess: Array<{ url: string; messageId: string; name?: string; source: ContextImage['source']; text?: string }> = [];
    const existingKeys = new Set<string>();

    messages.forEach((message) => {
      if (message.attachment?.type === 'image') {
        const key = `${message.id}|${message.attachment.url}`;
        if (!processedImagesRef.current.has(key) && !existingKeys.has(key)) {
          existingKeys.add(key);
          processedImagesRef.current.add(key);
          const imageData: ContextImage = {
            url: message.attachment.url,
            messageId: message.id,
            name: message.attachment.name,
            source: (message.sender === 'user' ? 'user' : 'artie') as 'user' | 'artie' | 'link',
            timestamp: message.timestamp.toISOString(),
          };
          additions.push(imageData);
          imagesToProcess.push({
            url: message.attachment.url,
            messageId: message.id,
            name: message.attachment.name,
            source: message.sender === 'user' ? 'user' : 'artie',
            text: message.text,
          });
        }
      }

      const embeddedUrls = extractSupabaseImageUrls(message.text);
      embeddedUrls.forEach((url, index) => {
        const key = `${message.id}|${url}`;
        if (!processedImagesRef.current.has(key) && !existingKeys.has(key)) {
          existingKeys.add(key);
          processedImagesRef.current.add(key);
          const imageData: ContextImage = {
            url,
            messageId: `${message.id}-link-${index}`,
            name: 'Referenced Image',
            source: 'link' as const,
            timestamp: message.timestamp.toISOString(),
          };
          additions.push(imageData);
          imagesToProcess.push({
            url,
            messageId: `${message.id}-link-${index}`,
            name: 'Referenced Image',
            source: 'link',
            text: message.text,
          });
        }
      });
    });

    if (additions.length === 0) return;

    if (isMountedRef.current) {
      setContextMemory((prev) => {
        const prevKeys = new Set(prev.images.map((img) => `${img.messageId}|${img.url}`));
        const newAdditions = additions.filter((img) => !prevKeys.has(`${img.messageId}|${img.url}`));
        
        if (newAdditions.length === 0) {
          return prev;
        }

        return {
          ...prev,
          images: [...prev.images, ...newAdditions],
        };
      });

      imagesToProcess.forEach(({ url, messageId, name, source, text }) => {
        addImageToMemory({
          url,
          type: source === 'user' ? 'uploaded' : 'generated',
          context_notes: text || undefined,
          messageId,
          source,
          name,
        });
        
        analyzeAndStoreImage(url).catch(err => 
          console.error('[useArtieCore] Background image analysis failed:', err)
        );
      });
    }
  }, [messages, extractSupabaseImageUrls]);

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
  };

  const handleRemoveFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleOpenStudioFromImage = useCallback(async (imageUrl: string) => {
    try {
      await openStudioWithPrompt({
        basePrompt: "Refine this image",
        imageUrl,
      });
      toast.success("Opening in Studio");
    } catch (error) {
      console.error('[useArtieCore] Error opening Studio:', error);
      toast.error("Unable to open Studio");
    }
  }, []);

  const handleEditImageFromMessage = useCallback((imageUrl: string, instruction?: string) => {
    setEditingImageUrl(imageUrl);
    setEditorInstruction(instruction || "");
    setEditorOpen(true);
  }, []);

  // Handle tool intent JSON parsing from <tool> tags in responses
  const handleToolIntent = useCallback(async (toolAction: any) => {
    if (!toolAction || !toolAction.action) return;
    
    try {
      const action = toolAction;
      console.log('[useArtieCore] Parsed tool intent:', action);

      switch (action.action) {
        case "OPEN_STUDIO":
          await openStudioWithPrompt({
            basePrompt: action.prompt || "Create image",
            imageUrl: action.imageUrl || null,
            meta: {
              source: 'artie',
              mode: action.mode || 'GENERATE',
            }
          });
          break;

        case "EDIT_IMAGE":
          if (action.imageUrl && action.instruction) {
            handleEditImageFromMessage(action.imageUrl, action.instruction);
          } else {
            const lastImage = contextMemory.images[contextMemory.images.length - 1];
            if (lastImage && action.instruction) {
              handleEditImageFromMessage(lastImage.url, action.instruction);
            }
          }
          break;

        case "BLEND_IMAGES":
          openTool('blend', {
            image1Url: action.image1Url || contextMemory.images[contextMemory.images.length - 2]?.url,
            image2Url: action.image2Url || contextMemory.images[contextMemory.images.length - 1]?.url,
            mode: action.mode || 'merge',
            ratio: action.ratio || 50,
          });
          break;

        case "UPSCALE_IMAGE":
          const upscaleImageUrl = action.imageUrl || contextMemory.images[contextMemory.images.length - 1]?.url;
          if (upscaleImageUrl) {
            openTool('upscale', {
              imageUrl: upscaleImageUrl,
              scaleFactor: action.scaleFactor || '2',
            });
          }
          break;

        case "OPEN_INSPIRE":
          // Navigate to Inspire page
          if (typeof window !== 'undefined') {
            const query = action.query ? `?q=${encodeURIComponent(action.query)}` : '';
            window.location.href = `/inspire${query}`;
          }
          break;

        default:
          console.warn('[useArtieCore] Unknown tool intent:', action);
      }
    } catch (err) {
      console.error('[useArtieCore] Failed to parse tool intent:', err);
    }
  }, [openTool, handleEditImageFromMessage, contextMemory]);

  const handleChipAction = useCallback((action: string, messageId?: string) => {
    if (action === "OPEN_STUDIO") {
      const targetImage = messageId 
        ? contextMemory.images.find(img => img.messageId === messageId)
        : contextMemory.images[contextMemory.images.length - 1];
      
      if (targetImage) {
        handleOpenStudioFromImage(targetImage.url);
      } else {
        toast.error("No image found", {
          description: "Couldn't find the image to open in Studio",
        });
      }
      return;
    }
    
    if (action === "EDIT_IMAGE") {
      let targetImageUrl: string | null = null;
      
      if (messageId) {
        const targetMessage = messages.find(m => m.id === messageId);
        if (targetMessage?.attachment?.type === 'image' && targetMessage.attachment.url) {
          targetImageUrl = targetMessage.attachment.url;
        }
      }
      
      if (!targetImageUrl) {
        const targetImage = messageId 
          ? contextMemory.images.find(img => img.messageId === messageId)
          : contextMemory.images[contextMemory.images.length - 1];
        
        if (targetImage?.url) {
          targetImageUrl = targetImage.url;
        }
      }
      
      if (!targetImageUrl) {
        toast.error("No image found", {
          description: "Couldn't find the image to edit. Please try uploading the image again.",
        });
        return;
      }
      
      handleEditImageFromMessage(targetImageUrl);
      return;
    }
    
    setInputValue(action);
  }, [contextMemory, messages, handleOpenStudioFromImage, handleEditImageFromMessage]);

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
            console.error('[useArtieCore] Brief analysis error:', docError);
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

      // Store input value before clearing it - ensure message always has text
      const trimmedInput = inputValue.trim();
      const messageText = trimmedInput || (attachments.length > 0 ? "Please review these files" : "Message");
      
      const userMessage: Message = {
        id: userMessageId,
        text: messageText,
        sender: 'user',
        timestamp: new Date(),
        ...(attachments.length > 0 && { 
          attachment: attachments[0]
        })
      };

      setMessages(prev => [...prev, userMessage]);
      setInputValue("");
      setUploadedFiles([]);
      setIsUploading(false);

      const assistantMessageId = (Date.now() + 1).toString();
      
      try {
        const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/artie-chat`;
        
        let contextualInput = messageText || "Please review these files";
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
        
        if (userPreferences) {
          const prefParts: string[] = [];
          if (userPreferences.preferredStyles?.length > 0) {
            prefParts.push(`User prefers ${userPreferences.preferredStyles.slice(0, 2).join(' and ')} styles`);
          }
          if (userPreferences.preferredColors?.length > 0) {
            prefParts.push(`User prefers ${userPreferences.preferredColors.slice(0, 2).join(' and ')} colors`);
          }
          if (userPreferences.qualityPreferences) {
            if (userPreferences.qualityPreferences.upscaleFrequency > 0.3) {
              prefParts.push('User frequently upscales images');
            }
            if (userPreferences.qualityPreferences.editFrequency > 0.3) {
              prefParts.push('User frequently edits images');
            }
            if (userPreferences.qualityPreferences.blendFrequency > 0.3) {
              prefParts.push('User frequently blends images');
            }
          }
          if (prefParts.length > 0) {
            contextParts.push(`User preferences: ${prefParts.join('; ')}`);
          }
        }

        if (currentWorkflowAction) {
          contextParts.push(`Current workflow: ${currentWorkflowAction}`);
        }
        if (recentActions.current.length > 0) {
          const recentPattern = recentActions.current.slice(-3).join(' → ');
          contextParts.push(`Recent workflow pattern: ${recentPattern}`);
        }
        const sessionDuration = Math.round((Date.now() - sessionStartTime.current.getTime()) / 1000 / 60);
        if (sessionDuration > 0) {
          contextParts.push(`Session duration: ${sessionDuration} minutes`);
        }
        if (contextMemory.images.length > 0) {
          contextParts.push(`Images in session: ${contextMemory.images.length}`);
        }
        
        if (contextParts.length > 0) {
          contextualInput = `Context: ${contextParts.join(' | ')}\n\nUser message: ${contextualInput}`;
        }
        
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          console.error('[useArtieCore] Session error:', sessionError);
          throw new Error('Authentication error. Please sign in again.');
        }
        if (!session?.access_token) {
          throw new Error('No active session. Please sign in.');
        }

        if (!import.meta.env.VITE_SUPABASE_URL) {
          throw new Error('Configuration error: VITE_SUPABASE_URL is not set');
        }

        // Build dynamic Artie context package
        const dynamicContext = {
          page: typeof window !== 'undefined' ? window.location.pathname : '/',
          timestamp: Date.now(),
          recentImages: combinedImages.slice(-4).map(img => ({ url: img.url, name: img.name })),
          uploadedFiles: uploadedFiles.map(f => f.name),
          activeProject: sessionStorage.getItem("active-project") || null,
          userPreferences: JSON.parse(localStorage.getItem("user-preferences") || "{}"),
          lastToolAction: sessionStorage.getItem("last-tool-action") || null,
        };

        console.log('[useArtieCore] Sending dynamic context:', dynamicContext);

        const response = await fetch(CHAT_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '',
          },
          body: JSON.stringify({
            messages: messages
              .filter(m => m.sender === 'user' || m.sender === 'artie')
              .slice(-10)
              .map(m => {
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
            },
            environmentContext: dynamicContext
          }),
        });

        if (!response.ok) {
          let errorMessage = 'Failed to get response from Artie';
          const contentType = response.headers.get('content-type');
          
          try {
            const clonedResponse = response.clone();
            
            if (contentType?.includes('application/json')) {
              const errorData = await clonedResponse.json();
              errorMessage = errorData.error || errorData.message || errorData.details || errorMessage;
            } else {
              const errorText = await clonedResponse.text();
              if (errorText) {
                try {
                  const parsed = JSON.parse(errorText);
                  errorMessage = parsed.error || parsed.message || errorMessage;
                } catch {
                  errorMessage = errorText.length > 200 ? errorText.substring(0, 200) + '...' : errorText;
                }
              }
            }
          } catch (readError) {
            if (response.status === 401) {
              errorMessage = 'Authentication failed. Please sign in again.';
            } else if (response.status === 403) {
              errorMessage = 'Access denied. Please check your permissions.';
            } else if (response.status === 404) {
              errorMessage = 'Artie service not found. Please contact support.';
            } else if (response.status === 500) {
              errorMessage = 'Server error. Please try again later.';
            } else if (response.status === 503) {
              errorMessage = 'Service temporarily unavailable. Please try again.';
            }
          }
          throw new Error(errorMessage);
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

          // Check for tool intent in accumulated text (<tool> tags)
          const toolTagRegex = /<tool>([\s\S]*?)<\/tool>/g;
          let toolMatch;
          while ((toolMatch = toolTagRegex.exec(accumulatedText)) !== null) {
            try {
              const toolJson = JSON.parse(toolMatch[1].trim());
              console.log('[useArtieCore] Found tool intent in response:', toolJson);
              
              // Remove the tool tag from the displayed text
              accumulatedText = accumulatedText.replace(toolMatch[0], '').trim();
              
              // Update message without tool tag
              setMessages(prev => 
                prev.map(m => 
                  m.id === assistantMessageId 
                    ? { ...m, text: accumulatedText }
                    : m
                )
              );

              // Handle the tool action
              console.log('[useArtieCore] AI raw response tool intent:', toolJson);
              await handleToolIntent(toolJson);
            } catch (parseErr) {
              console.error('[useArtieCore] Failed to parse tool tag JSON:', parseErr);
            }
          }

          if (toolCalls.length > 0) {
            for (const toolCall of toolCalls) {
              const args = JSON.parse(toolCall.function.arguments);
              
              if (toolCall.function.name === 'open_studio') {
                trackWorkflowAction('generating');
                accumulatedText += `\n\n✨ Opening Studio with your refined prompt...`;
                setMessages(prev => 
                  prev.map(m => 
                    m.id === assistantMessageId 
                      ? { ...m, text: accumulatedText }
                      : m
                  )
                );
                
                const recentImage = contextMemory.images[contextMemory.images.length - 1];
                
                await openStudioWithPrompt({
                  basePrompt: args.prompt,
                  imageUrl: recentImage?.url || args.referenceImage,
                  meta: {
                    source: 'artie',
                    conversationContext: messages.slice(-5).map(m => m.text).join('\n'),
                    styleTags: [],
                    quality: args.quality || 'auto',
                    size: args.size || '1024x1024'
                  }
                });
                
              } else if (toolCall.function.name === 'open_upscale') {
                trackWorkflowAction('upscaling');
                accumulatedText += `\n\n🔍 Opening Upscale tool...`;
                setMessages(prev => 
                  prev.map(m => 
                    m.id === assistantMessageId 
                      ? { ...m, text: accumulatedText }
                      : m
                  )
                );
                
                const imageUrl = args.imageUrl || contextMemory.images[contextMemory.images.length - 1]?.url;
                const recentImage = contextMemory.images[contextMemory.images.length - 1];
                
                if (imageUrl) {
                  const { useVisualContextStore } = await import('@/store/visualContextStore');
                  const visualContext = useVisualContextStore.getState();
                  visualContext.updateImage(imageUrl);
                  visualContext.addOperation({
                    tool: 'upscale',
                    imageUrl,
                    params: { scaleFactor: args.scaleFactor || '2' }
                  });
                  
                  openTool('upscale', {
                    scaleFactor: args.scaleFactor || '2',
                    imageUrl,
                    contextPrompt: visualContext.basePrompt
                  });
                }
                
              } else if (toolCall.function.name === 'open_blend') {
                trackWorkflowAction('blending');
                accumulatedText += `\n\n🎨 Opening Blend tool...`;
                setMessages(prev => 
                  prev.map(m => 
                    m.id === assistantMessageId 
                      ? { ...m, text: accumulatedText }
                      : m
                  )
                );
                
                const recentImages = contextMemory.images.slice(-2);
                
                const { useVisualContextStore } = await import('@/store/visualContextStore');
                const visualContext = useVisualContextStore.getState();
                if (recentImages.length > 0) {
                  visualContext.updateImage(recentImages[0].url);
                  visualContext.addOperation({
                    tool: 'blend',
                    params: { mode: args.mode || 'merge', ratio: args.ratio || 50 }
                  });
                }
                
                openTool('blend', {
                  mode: args.mode || 'merge',
                  ratio: args.ratio || 50,
                  image1Url: recentImages[0]?.url,
                  image2Url: recentImages[1]?.url
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
                  const { data: { session } } = await supabase.auth.getSession();
                  
                  if (!session?.access_token) {
                    throw new Error('No active session');
                  }

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
                  
                  if (genData.image) {
                    const { ensureAssetSaved } = await import('@/lib/saveAsset');
                    await ensureAssetSaved({
                      imageUrl: genData.image,
                      action: 'generate',
                      prompt: args.prompt,
                      params: {
                        quality: args.quality || 'auto',
                        size: args.size || '1024x1024',
                        source: 'artie_chat',
                      },
                      skipToast: true,
                    });

                    await learnFromAction('save', genData.image, {
                      prompt: args.prompt,
                      quality: args.quality || 'auto',
                      size: args.size || '1024x1024',
                    });
                    trackWorkflowAction('generating');

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
                  console.error('[useArtieCore] Image generation error:', imgError);
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
                  accumulatedText += '\n\n⚠️ I need a clear edit instruction before I can modify this image. Try something like "brighten the lighting and lean into a cinematic teal-orange palette."';
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

                trackWorkflowAction('editing');
                
                handleEditImageFromMessage(imageUrl, instruction);
                
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
        console.error('[useArtieCore] Chat error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        let userFriendlyMessage = errorMessage;
        if (errorMessage.includes('LOVABLE_API_KEY')) {
          userFriendlyMessage = 'Server configuration error. Please contact support.';
        } else if (errorMessage.includes('No active session') || errorMessage.includes('Authentication')) {
          userFriendlyMessage = 'Please sign in to use Artie.';
        } else if (errorMessage.includes('VITE_SUPABASE_URL')) {
          userFriendlyMessage = 'Configuration error. Please contact support.';
        } else if (errorMessage.includes('AI service unavailable') || errorMessage.includes('AI gateway')) {
          userFriendlyMessage = 'AI service is temporarily unavailable. Please try again in a moment.';
        } else if (errorMessage === 'Failed to get response from Artie') {
          userFriendlyMessage = 'Temporary issue connecting to Artie. Please retry.';
        }
        
        const errorMsg: Message = {
          id: (Date.now() + 2).toString(),
          text: `❌ ${userFriendlyMessage}`,
          sender: 'artie',
          timestamp: new Date(),
          error: true,
          retryPayload: contextData
        };
        
        setMessages(prev => {
          const filtered = prev.filter(m => m.id !== assistantMessageId);
          return [...filtered, errorMsg];
        });
        
        toast.error("Artie Error", {
          description: userFriendlyMessage,
          action: {
            label: "Retry",
            onClick: () => handleSend(contextData)
          }
        });
      }
    } catch (uploadError) {
      console.error('[useArtieCore] Upload error:', uploadError);
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

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const latestContextImage = useMemo(
    () => contextMemory.images[contextMemory.images.length - 1],
    [contextMemory.images]
  );

  return {
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
    latestContextImage,
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
    refetchCredits,
  };
}

