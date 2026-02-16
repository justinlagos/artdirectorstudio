import { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useRef } from "react";
import { analytics } from "@/lib/analytics";
import { Header } from "@/components/Header";
import { UploadSection } from "@/components/UploadSection";
import { ProgressiveAnalysisFeedback } from "@/components/ProgressiveAnalysisFeedback";
import { PromptDisplay } from "@/components/PromptDisplay";
import { OnboardingPopup } from "@/components/OnboardingPopup";
import { Footer } from "@/components/Footer";
import { CreditCostIndicator } from "@/components/CreditCostIndicator";
import { PullToRefreshIndicator } from "@/components/PullToRefreshIndicator";
import { KeyboardShortcutsGuide } from "@/components/KeyboardShortcutsGuide";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Keyboard, Lightbulb, Sparkles, ArrowRight } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { useKeyboardShortcuts, KeyboardShortcut, getModifierKey } from "@/hooks/useKeyboardShortcuts";
import type { GenerationOptions } from "@/components/ImageGenerationDialog";
import { openStudioWithPrompt } from "@/lib/studio";
import { useStudioStore } from "@/store/studioStore";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PageSkeleton } from "@/components/skeletons/PageSkeleton";
import { AnalysisLayout } from "@/components/AnalysisLayout";
import { AnalysisOverview } from "@/components/AnalysisOverview";
// Premium Landing Page Components
import { PremiumHero } from "@/components/landing/PremiumHero";
import { PremiumFeatures } from "@/components/landing/PremiumFeatures";
import { PremiumValue } from "@/components/landing/PremiumValue";
import { ProofSection } from "@/components/landing/ProofSection";
import { PricingSection } from "@/components/landing/PricingSection";
import { FeaturedCommunitySection } from "@/components/landing/FeaturedCommunitySection";
import { FunLabSection } from "@/components/landing/FunLabSection";
import { ImageComparisonView } from "@/components/ImageComparisonView";
import { Card } from "@/components/ui/card";
import { FUN_LAB_TOOLS } from "@/components/landing/FunLabSection";
import { resizeImageForAnalysis } from "@/lib/imageOptimization";
import { parseEdgeFunctionError } from "@/lib/edgeFunctionErrors";

export interface Analysis {
  image_overview: string;
  subject_description: string;
  camera_composition: string;
  lighting: string;
  color_palette: string;
  design_style: string;
  texture_material: string;
  mood_emotion: string;
  background_environment: string;
  artistic_medium: string;
  art_direction_influence: string;
  intended_use: string;
}

export interface AnalysisResult {
  full_regeneration_prompt: string;
  analysis: Analysis;
}

export interface UserEdits {
  subject_gender?: string;
  subject_ethnicity?: string;
  camera_type?: string;
  lighting_type?: string;
  dominant_color_1?: string;
  dominant_color_2?: string;
  art_style?: string;
  background_type?: string;
  intended_platform?: string;
}

export interface GeneratedImage {
  id: string;
  imageUrl: string;
  prompt: string;
  timestamp: Date;
}

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { preferences, isLoading: preferencesLoading } = useUserPreferences();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // Use ref to track stable workspace mode and prevent flickering during refetches
  // Initialize from localStorage to persist across page refreshes
  const stableWorkspaceModeRef = useRef<'classic' | 'auto' | null>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('workspaceMode');
      if (stored === 'classic' || stored === 'auto') {
        return stored;
      }
    }
    return null;
  });
  
  // Get generation count for Auto mode
  const { data: generationCount } = useQuery({
    queryKey: ['generationCount', user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count } = await supabase
        .from('generated_assets')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('action', 'generate');
      return count || 0;
    },
    enabled: !!user && (preferences?.workspaceMode === 'auto' || !preferences),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Update ref synchronously when preferences change (not just in useEffect)
  // This ensures the ref is always up-to-date even during refetches
  // CRITICAL: Update ref BEFORE computing workspaceMode to prevent fallback issues
  // Also update ref from the hook's safePreferences to ensure we capture optimistic updates
  // Persist to localStorage to survive page refreshes
  const currentWorkspaceMode = preferences?.workspaceMode;
  if (currentWorkspaceMode) {
    if (stableWorkspaceModeRef.current !== currentWorkspaceMode) {
      stableWorkspaceModeRef.current = currentWorkspaceMode;
      // Persist to localStorage for resilience across refreshes
      if (typeof window !== 'undefined') {
        localStorage.setItem('workspaceMode', currentWorkspaceMode);
      }
    }
  }
  
  // Determine which view to show
  // PRIORITY: Use preferences first, then ref (which is always up-to-date), then localStorage, then default
  // The ref acts as a stable fallback during refetches when preferences might be undefined
  // CRITICAL: Use nullish coalescing (??) not logical OR (||) to properly handle falsy values
  const workspaceMode = currentWorkspaceMode ?? stableWorkspaceModeRef.current ?? 
    (typeof window !== 'undefined' ? (localStorage.getItem('workspaceMode') as 'classic' | 'auto' | null) : null) ?? 
    'classic';

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showProgressiveFeedback, setShowProgressiveFeedback] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [showShortcutsGuide, setShowShortcutsGuide] = useState(false);
  const [editedPrompt, setEditedPrompt] = useState<string | null>(null);

  // Pull-to-refresh functionality
  const handleRefresh = async () => {
    if (selectedFile && result) {
      await handleAnalyze();
    }
  };

  const { isRefreshing, pullDistance, isPulling } = usePullToRefresh({
    onRefresh: handleRefresh,
    threshold: 80,
    enabled: !!user && !!selectedFile && !!result,
  });


  // Scroll to studio section when authenticated user arrives
  useEffect(() => {
    if (user && !loading && !preferencesLoading) {
      const studioSection = document.getElementById("studio-section");
      if (studioSection) {
        // Use requestAnimationFrame to ensure DOM is ready
        requestAnimationFrame(() => {
          studioSection.scrollIntoView({ behavior: "smooth" });
        });
      }
    }
  }, [user, loading, preferencesLoading]);

  // One-time guard to prevent repeated processing of the same studioPrefill state
  const hasProcessedPrefillRef = useRef(false);

  // Process studioPrefill state once per navigation state
  useEffect(() => {
    const state = location.state as { studioPrefill?: { prompt: string; imageUrl?: string } } | null;

    if (!user) return;
    if (!state?.studioPrefill) return;
    if (hasProcessedPrefillRef.current) return;

    hasProcessedPrefillRef.current = true;

    openStudioWithPrompt({
      basePrompt: state.studioPrefill.prompt,
      imageUrl: state.studioPrefill.imageUrl,
    });

    navigate(location.pathname, { replace: true, state: {} });
  }, [location.state, user, navigate, location.pathname]);

  // Reset guard when studioPrefill is no longer in state, so future prefill navigations still work
  useEffect(() => {
    const state = location.state as { studioPrefill?: unknown } | null;
    if (!state?.studioPrefill) {
      hasProcessedPrefillRef.current = false;
    }
  }, [location.state]);

  // Cleanup on unmount - MUST be before early returns
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      // Defensive cleanup: ensure body overflow is reset
      if (document.body) {
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
      }
    };
  }, [previewUrl]);

  // Keyboard shortcuts
  const modKey = getModifierKey();
  const shortcuts: KeyboardShortcut[] = [
    {
      key: 'u',
      ctrl: true,
      callback: () => {
        if (!user) {
          navigate("/auth");
          return;
        }
        document.querySelector<HTMLInputElement>('input[type="file"]')?.click();
      },
      description: 'Upload new image',
      category: 'Upload & Analysis'
    },
    {
      key: 'Enter',
      ctrl: true,
      callback: () => {
        if (selectedFile && !isAnalyzing) {
          handleAnalyze();
        }
      },
      description: 'Analyze image',
      category: 'Upload & Analysis'
    },
    {
      key: 'g',
      ctrl: true,
      callback: () => {
        if (result && user) {
          openStudioWithPrompt({
            basePrompt: result.full_regeneration_prompt,
            imageUrl: previewUrl ?? undefined,
            meta: { source: 'analysis-shortcut' },
          });
        } else if (user) {
          // Open studio even without analysis result
          openStudioWithPrompt({
            basePrompt: '',
            meta: { source: 'keyboard-shortcut' },
          });
        }
      },
      description: 'Generate image',
      category: 'Generation'
    },
    {
      key: 'k',
      ctrl: true,
      callback: () => {
        if (result) {
          navigator.clipboard.writeText(result.full_regeneration_prompt);
          toast.success("Prompt copied!");
        }
      },
      description: 'Copy prompt',
      category: 'Generation'
    },
    {
      key: 'r',
      ctrl: true,
      callback: () => {
        if (result && selectedFile && !isAnalyzing) {
          handleAnalyze();
        }
      },
      description: 'Regenerate analysis',
      category: 'Generation'
    },
    {
      key: 'Escape',
      callback: () => {
        // Close any open modals/dialogs
        const closeButtons = document.querySelectorAll('[aria-label="Close"]');
        if (closeButtons.length > 0) {
          (closeButtons[0] as HTMLButtonElement).click();
        }
      },
      description: 'Close modal/dialog',
      category: 'Navigation'
    },
    {
      key: '?',
      ctrl: true,
      callback: () => {
        setShowShortcutsGuide(true);
      },
      description: 'Show keyboard shortcuts',
      category: 'Navigation'
    }
  ];

  useKeyboardShortcuts({
    shortcuts,
    enabled: !loading
  });


  const handleFileSelect = (file: File) => {
    if (!user) {
      navigate("/auth");
      return;
    }
    // Revoke previous URL to prevent memory leak
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setResult(null);
    setEditedPrompt(null);
  };

  const handleAnalyze = async (retryCount = 0) => {
    if (!selectedFile) {
      toast.error("Add an image to analyze", {
        description: "Drop a JPG or PNG first, then run Artie's analysis."
      });
      return;
    }

    const startTime = Date.now();
    setIsAnalyzing(true);
    setShowProgressiveFeedback(true);
    setAnalysisComplete(false);

    try {
      // Get session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please log in to continue.");
        setIsAnalyzing(false);
        return;
      }

      // Convert file to base64
      const reader = new FileReader();
      reader.readAsDataURL(selectedFile);

      const ANALYSIS_TIMEOUT_MS = 120_000; // 2 min: allows for large images + slow AI; under Supabase 150s limit
      const resetAnalyzingState = () => {
        setIsAnalyzing(false);
        setShowProgressiveFeedback(false);
      };

      reader.onload = async () => {
        let base64Image = reader.result as string;
        try {
          base64Image = await resizeImageForAnalysis(base64Image);
        } catch (resizeErr) {
          console.warn("Image resize skipped, using original:", resizeErr);
        }
        let data: unknown;
        let error: unknown;
        try {
          const invokePromise = supabase.functions.invoke("analyze-image", {
            body: { image: base64Image },
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          });
          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error("Analysis is taking too long. Please try again.")), ANALYSIS_TIMEOUT_MS);
          });
          const result = await Promise.race([invokePromise, timeoutPromise]);
          data = result.data;
          error = result.error;
        } catch (raceError) {
          const err = raceError instanceof Error ? raceError : new Error("Analysis failed");
          console.error("Analysis error:", err);
          analytics.track("Image Analysis", {
            tool: "analyze",
            action: "analyze",
            success: false,
            error_type: err.message?.substring(0, 50) || "unknown",
          });
          toast.error(err.message);
          resetAnalyzingState();
          return;
        }

        if (error) {
          console.error("Analysis error:", error);
          let errorMessage = "Failed to analyze image. Please try again.";
          const parsedError = await parseEdgeFunctionError(error);
          const errMsg = parsedError.rawMessage || '';
          const msgLower = parsedError.message.toLowerCase();
          if (parsedError.errorType === 'insufficient_credits' ||
            parsedError.details?.aiStatus === 402 ||
            parsedError.status === 402 ||
            errMsg?.includes('402') ||
            msgLower.includes('credits exhausted')) {
            errorMessage = "Your credits are used up. Choose a plan to continue.";
          } else if (parsedError.errorType === 'invalid_reservation' || msgLower.includes('invalid_reservation')) {
            errorMessage = "Your reservation expired. Please try again.";
          } else if (parsedError.message && parsedError.message !== 'Edge Function returned a non-2xx status code') {
            errorMessage = parsedError.message;
          } else if (errMsg) {
            errorMessage = errMsg;
          }
          analytics.track("Image Analysis", {
            tool: "analyze",
            action: "analyze",
            success: false,
            error_type: parsedError.errorType || errMsg?.substring(0, 50) || "unknown",
            status_code: parsedError.details?.aiStatus || parsedError.status,
          });
          toast.error(errorMessage);
          resetAnalyzingState();
          return;
        }

        const valid = data && typeof data === 'object' && data !== null &&
          'full_regeneration_prompt' in data && 'analysis' in data;
        if (!valid) {
          console.error("Analysis returned invalid shape:", data);
          toast.error("Analysis returned unexpected data. Please try again.");
          resetAnalyzingState();
          return;
        }

        // Wait for progressive feedback to complete (min 3 seconds)
        setTimeout(() => {
          setResult(data as AnalysisResult);
          setAnalysisComplete(true);
          resetAnalyzingState();
          const duration = Date.now() - startTime;
          analytics.track("Image Analysis", {
            tool: "analyze",
            action: "analyze",
            success: true,
            duration_ms: duration,
            asset_id: (data as any)?.assetId || undefined,
          });
          toast.success("Image analyzed successfully!");
        }, 3000);
      };

      reader.onerror = () => {
        analytics.track("Image Analysis", {
          tool: "analyze",
          action: "analyze",
          success: false,
          error_type: "file_read_error",
        });
        toast.error("Failed to read image file.");
        setIsAnalyzing(false);
        setShowProgressiveFeedback(false);
      };
    } catch (error) {
      console.error("Error during analysis:", error);
      const errorMsg = error instanceof Error ? error.message : "An error occurred during analysis.";
      analytics.track("Image Analysis", {
        tool: "analyze",
        action: "analyze",
        success: false,
        error_type: errorMsg.substring(0, 50),
      });
      toast.error(errorMsg);
      setIsAnalyzing(false);
      setShowProgressiveFeedback(false);

      // Retry logic for network errors
      if (retryCount < 2 && errorMsg.toLowerCase().includes('network')) {
        toast.info("Retrying analysis...");
        setTimeout(() => handleAnalyze(retryCount + 1), 1000);
        return;
      }
    }
  };

  const handleRegenerate = async (userEdits: UserEdits) => {
    if (!result) return;

    setIsAnalyzing(true);

    try {
      // Get session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please log in to continue.");
        setIsAnalyzing(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke("regenerate-prompt", {
        body: {
          base_analysis: result.analysis,
          user_edits: userEdits
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error("Regeneration error:", error);
        const parsedError = await parseEdgeFunctionError(error);
        const message =
          parsedError.message && parsedError.message !== "Edge Function returned a non-2xx status code"
            ? parsedError.message
            : "Failed to regenerate prompt. Please try again.";
        toast.error(message);
        setIsAnalyzing(false);
        return;
      }

      setResult(data as AnalysisResult);
      setIsAnalyzing(false);
      toast.success("Prompt regenerated successfully!");
    } catch (error) {
      console.error("Error during regeneration:", error);
      toast.error("An error occurred during regeneration.");
      setIsAnalyzing(false);
    }
  };

  const handleGenerateImage = useCallback(async (
    prompt: string,
    options: GenerationOptions,
    retryCount = 0
  ): Promise<string | null> => {
    const startTime = Date.now();
    try {
      // Get session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please log in to continue.");
        return null;
      }

      // Convert to new backend format
      const { convertToBackendFormat } = await import("@/lib/generationParams");
      const backendParams = convertToBackendFormat(options);

      // Call generate-image edge function
      const { data, error } = await supabase.functions.invoke("generate-image", {
        body: {
          prompt,
          ...backendParams,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error("Generation error:", error);
        const parsedError = await parseEdgeFunctionError(error);
        const parsedMessage =
          parsedError.message && parsedError.message !== "Edge Function returned a non-2xx status code"
            ? parsedError.message
            : error.message;
        const messageLower = (parsedMessage || "").toLowerCase();

        // Track generation failure
        analytics.track("Image Generation", {
          tool: "generate",
          action: "generate",
          success: false,
          has_reference: false,
          error_type: parsedError.errorType || parsedMessage?.substring(0, 50) || "unknown",
        });

        if (parsedError.status === 429 || parsedError.errorType === 'rate_limit' || messageLower.includes("rate limit")) {
          toast.error("Too many requests. Please wait a moment and try again.");
        } else if (
          parsedError.status === 402 ||
          parsedError.errorType === "insufficient_credits" ||
          messageLower.includes("credits exhausted") ||
          messageLower.includes("insufficient credits")
        ) {
          toast.error(parsedMessage || "Your credits are used up. Choose a plan to continue.");
        } else if (parsedMessage) {
          toast.error(parsedMessage);
        } else {
          toast.error("Failed to generate image. Please try again.");
        }
        return null;
      }

      if (!data?.image) {
        analytics.track("Image Generation", {
          tool: "generate",
          action: "generate",
          success: false,
          has_reference: false,
          error_type: "no_image_data",
        });
        toast.error("Failed to generate image. Please try again.");
        return null;
      }

      // Verify the image was saved to database
      if (!data.assetId) {
        console.warn("[Index] Image generated but not saved to My Projects. Attempting fallback save...");

        // Fallback: Use the improved saveAsset utility instead of raw Supabase calls
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            // Use the unified saveAsset utility for consistency and better error handling
            const { saveAsset } = await import('@/lib/saveAsset');

            const assetId = await saveAsset({
              imageUrl: data.image,
              action: 'generate',
              prompt: prompt,
              params: {
                quality: options.quality,
                size: options.size,
                background: options.background,
                fallback_save: true
              },
              // Note: queryClient not available in this context, but saveAsset will still work
              skipToast: false, // Show toast even for fallback saves
            });

            if (assetId) {
              console.log("[Index] Fallback save successful:", assetId);
              // Update the assetId in the response
              data.assetId = assetId;
            } else {
              console.warn("[Index] Fallback save returned null - save may have failed");
              // Still continue - image is available even if not saved
            }
          } else {
            console.warn("[Index] Fallback save skipped - no user found");
          }
        } catch (fallbackError) {
          console.error("[Index] Fallback save exception:", {
            error: fallbackError instanceof Error ? fallbackError.message : 'Unknown error',
            stack: fallbackError instanceof Error ? fallbackError.stack : undefined
          });
          // Still continue - image is available even if save failed
        }
      } else {
        console.log("[Index] Image saved to My Projects:", data.assetId);
      }

      // Add to generated images list
      const newImage: GeneratedImage = {
        id: data.assetId || crypto.randomUUID(),
        imageUrl: data.image,
        prompt: prompt,
        timestamp: new Date()
      };

      setGeneratedImages(prev => [newImage, ...prev]);
      toast.success("Image generated successfully!");

      // Track successful generation
      const duration = Date.now() - startTime;
      analytics.track("Image Generation", {
        tool: "generate",
        action: "generate",
        success: true,
        has_reference: false,
        duration_ms: duration,
        asset_id: data.assetId || undefined,
      });

      return data.image;
    } catch (error) {
      console.error("Error during image generation:", error);
      const parsedError = await parseEdgeFunctionError(error);
      const errorMsg =
        parsedError.message && parsedError.message !== "Edge Function returned a non-2xx status code"
          ? parsedError.message
          : error instanceof Error
            ? error.message
            : "An error occurred during image generation.";
      toast.error(errorMsg);

      // Retry logic for network errors
      if (retryCount < 2 && errorMsg.toLowerCase().includes('network')) {
        toast.info("Retrying generation...");
        return new Promise(resolve => {
          setTimeout(() => {
            resolve(handleGenerateImage(prompt, options, retryCount + 1));
          }, 1000);
        });
      }

      return null;
    }
  }, [setGeneratedImages]);

  const setGenerator = useStudioStore((state) => state.setGenerator);

  useEffect(() => {
    setGenerator(handleGenerateImage);
    return () => setGenerator(null);
  }, [handleGenerateImage, setGenerator]);

  const handleDeleteImage = (id: string) => {
    setGeneratedImages(prev => prev.filter(img => img.id !== id));
  };

  const handleResultUpdate = (updatedResult: AnalysisResult) => {
    setResult(updatedResult);
  };

  const handlePromptUpdate = (updatedPrompt: string) => {
    setEditedPrompt(updatedPrompt);
  };

  // Add timeout fallback for loading state to prevent infinite loading
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => {
        console.warn('[Index] Loading timeout - forcing render');
        setLoadingTimeout(true);
      }, 3000); // 3 second timeout

      return () => clearTimeout(timer);
    } else {
      setLoadingTimeout(false);
    }
  }, [loading]);


  // Gate rendering to prevent UI instability during async state changes
  // Show skeleton with Header when loading or preferences are loading
  if (loading || preferencesLoading) {
    return (
      <div className="min-h-screen">
        <Header />
        <PageSkeleton />
      </div>
    );
  }

  // Redirect authenticated users to canvas (the new primary workspace)
  // Skip redirect if coming from a specific studio prefill or explicit navigation
  const hasPrefill = location.state && (location.state as any).prefill;
  if (user && !hasPrefill) {
    return <Navigate to="/canvas" replace />;
  }

  // Log render state
  console.log('[Index] Rendering page', {
    user: !!user,
    loading,
    loadingTimeout,
    workspaceMode,
    preferencesLoading
  });

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background pb-20 md:pb-0">
        <PullToRefreshIndicator
          pullDistance={pullDistance}
          isRefreshing={isRefreshing}
          threshold={80}
        />
        <ErrorBoundary>
          <Header />
        </ErrorBoundary>

        {/* Premium Landing Page - Only for non-authenticated users */}
        {!user && (
          <>
            <ErrorBoundary fallback={<div className="py-20 text-center">Hero section unavailable</div>}>
              <PremiumHero user={user} />
            </ErrorBoundary>

            <ErrorBoundary fallback={null}>
              <FunLabSection />
            </ErrorBoundary>

            <ErrorBoundary fallback={null}>
              <PremiumValue />
            </ErrorBoundary>

            <ErrorBoundary fallback={null}>
              <PremiumFeatures />
            </ErrorBoundary>
          </>
        )}

        {/* Studio Section - Only for authenticated users */}
        {user && (
          <div id="studio-section" className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-6 md:pb-16 space-y-6 md:space-y-10">
            <OnboardingPopup />

            {/* Studio Onboarding Copy - Centered with breathing room */}
            <div className="space-y-3 animate-fade-in text-center py-8 md:py-12">
              <h2 className="text-2xl md:text-4xl font-display font-bold tracking-tight">Studio</h2>
              <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
                Upload a visual, layout, or campaign asset. Artie will analyse it, highlight what matters, and help you generate next-step visuals, variations, and refinements.
              </p>
              <div className="max-w-2xl mx-auto grid gap-2 text-sm text-muted-foreground md:grid-cols-3">
                <div className="rounded-xl border border-border/60 bg-background/80 px-4 py-3 shadow-sm">
                  <p className="font-medium text-foreground">1. Drop your image</p>
                  <p className="text-xs text-muted-foreground">Supports JPG/PNG up to 15MB.</p>
                </div>
                <div className="rounded-xl border border-border/60 bg-background/80 px-4 py-3 shadow-sm">
                  <p className="font-medium text-foreground">2. Run Analysis</p>
                  <p className="text-xs text-muted-foreground">Artie reviews composition, color, and opportunities.</p>
                </div>
                <div className="rounded-xl border border-border/60 bg-background/80 px-4 py-3 shadow-sm">
                  <p className="font-medium text-foreground">3. Act on insights</p>
                  <p className="text-xs text-muted-foreground">Use the prompts and regions to generate or edit.</p>
                </div>
              </div>
            </div>

            <UploadSection
              onFileSelect={handleFileSelect}
              previewUrl={previewUrl}
              onAnalyze={handleAnalyze}
              disabled={!selectedFile || isAnalyzing}
            />

            {selectedFile && !isAnalyzing && !result && (
              <div className="flex justify-center">
                <CreditCostIndicator cost={1} action="analysis" />
              </div>
            )}

            {showProgressiveFeedback && <ProgressiveAnalysisFeedback />}

            {result && analysisComplete && (
              <div className="w-full animate-fade-in" style={{ animationDelay: '200ms' }}>
                <AnalysisLayout
                  imageUrl={previewUrl || undefined}
                  analysisContent={
                    <div className="space-y-6">
                      <PromptDisplay
                        prompt={editedPrompt || result.full_regeneration_prompt}
                        onPromptUpdate={handlePromptUpdate}
                      />

                      {generatedImages.length > 0 && previewUrl && (
                        <div className="animate-fade-in">
                          <ImageComparisonView
                            originalImage={previewUrl}
                            generatedImages={generatedImages}
                          />
                        </div>
                      )}

                      <AnalysisOverview
                        analysis={result.analysis}
                        fullPrompt={editedPrompt || result.full_regeneration_prompt}
                        imageUrl={previewUrl || undefined}
                      />
                    </div>
                  }
                />
              </div>
            )}

            {/* Fun Box strip for logged-in users */}
            <section className="mt-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
                    Fun Box
                  </h3>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs gap-1"
                  onClick={() => navigate("/funbox")}
                >
                  Explore all tools
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {FUN_LAB_TOOLS.slice(0, 4).map((tool) => (
                  <Card
                    key={tool.id}
                    className="p-3 cursor-pointer border-border/60 hover:border-primary/40 transition-all duration-200 hover:shadow-sm bg-card/80"
                    onClick={() => navigate(tool.route)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">
                        {tool.icon}
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium leading-tight">
                          {tool.name}
                        </p>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {tool.description}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          </div>
        )}


        <ErrorBoundary>
          <FeaturedCommunitySection />
        </ErrorBoundary>

        <ErrorBoundary>
          <Footer />
        </ErrorBoundary>

        {/* Keyboard Shortcuts Guide */}
        <KeyboardShortcutsGuide
          open={showShortcutsGuide}
          onOpenChange={setShowShortcutsGuide}
        />

        {/* Floating Keyboard Shortcuts Button - Desktop Only */}
        {user && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowShortcutsGuide(true)}
                className="hidden md:flex fixed bottom-6 right-6 w-12 h-12 rounded-full shadow-lg hover:shadow-xl transition-all z-30 bg-background/95 backdrop-blur border-border/50"
              >
                <Keyboard className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>Keyboard Shortcuts ({modKey}+?)</p>
            </TooltipContent>
          </Tooltip>
        )}

      </div>
    </ErrorBoundary>
  );
};

export default Index;
