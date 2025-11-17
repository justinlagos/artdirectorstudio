import { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { analytics } from "@/lib/analytics";
import { Header } from "@/components/Header";
import { UploadSection } from "@/components/UploadSection";
import { ProgressiveAnalysisFeedback } from "@/components/ProgressiveAnalysisFeedback";
import { ResultsSection } from "@/components/ResultsSectionEnhanced";
import { OnboardingPopup } from "@/components/OnboardingPopup";
import { Footer } from "@/components/Footer";
import { CreditCostIndicator } from "@/components/CreditCostIndicator";
import { PullToRefreshIndicator } from "@/components/PullToRefreshIndicator";
import { KeyboardShortcutsGuide } from "@/components/KeyboardShortcutsGuide";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Keyboard } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { useKeyboardShortcuts, KeyboardShortcut, getModifierKey } from "@/hooks/useKeyboardShortcuts";
import type { GenerationOptions } from "@/components/ImageGenerationDialog";
import { openStudioWithPrompt } from "@/lib/studio";
import { useStudioStore } from "@/store/studioStore";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PageSkeleton } from "@/components/skeletons/PageSkeleton";
// Premium Landing Page Components
import { HeroSection } from "@/components/landing/HeroSection";
import { EmotionalValueSection } from "@/components/landing/EmotionalValueSection";
import { CoreFeaturesSection } from "@/components/landing/CoreFeaturesSection";
import { ShowcaseSection } from "@/components/landing/ShowcaseSection";
import { ProofSection } from "@/components/landing/ProofSection";
import { PricingSection } from "@/components/landing/PricingSection";
import { FinalCTASection } from "@/components/landing/FinalCTASection";

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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showProgressiveFeedback, setShowProgressiveFeedback] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [showShortcutsGuide, setShowShortcutsGuide] = useState(false);
  
  // Debug logging
  useEffect(() => {
    console.log('[Index] Component mounted/updated', { user: !!user, loading });
  }, [user, loading]);

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
    if (user && !loading) {
      const studioSection = document.getElementById("studio-section");
      if (studioSection) {
        studioSection.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, [user, loading]);

  useEffect(() => {
    const state = location.state as { studioPrefill?: { prompt: string; imageUrl?: string } } | null;
    if (state?.studioPrefill && user) {
      openStudioWithPrompt({
        basePrompt: state.studioPrefill.prompt,
        imageUrl: state.studioPrefill.imageUrl,
      });
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.pathname, user]);

  // Cleanup on unmount - MUST be before early returns
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      // Defensive cleanup: ensure body overflow is reset
      if (document.body) {
        console.log('[Index] Cleanup: resetting body overflow on unmount');
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
  };

  const handleAnalyze = async (retryCount = 0) => {
    if (!selectedFile) return;

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
      
      reader.onload = async () => {
        const base64Image = reader.result as string;
        
        const { data, error } = await supabase.functions.invoke("analyze-image", {
          body: { image: base64Image },
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (error) {
          console.error("Analysis error:", error);
          
          // Extract error details
          let errorMessage = "Failed to analyze image. Please try again.";
          let errorData: any = error;
          
          // Try to parse error context if available
          if (error.context) {
            try {
              errorData = typeof error.context === 'string' 
                ? JSON.parse(error.context) 
                : error.context;
            } catch {
              errorData = error;
            }
          }
          
          // Check for 402 (credits exhausted) or specific error messages
          if (errorData?.details?.aiStatus === 402 || 
              errorData?.errorType === 'ai_error' && errorData?.details?.aiStatus === 402 ||
              error.message?.includes('402') ||
              error.message?.includes('Credits exhausted') ||
              error.message?.includes('credits exhausted')) {
            errorMessage = "Your credits are used up. Choose a plan to continue.";
          } else if (errorData?.error) {
            errorMessage = errorData.error;
          } else if (error.message) {
            errorMessage = error.message;
          }
          
          analytics.track("Image Analysis", {
            tool: "analyze",
            action: "analyze",
            success: false,
            error_type: errorData?.errorType || error.message?.substring(0, 50) || "unknown",
            status_code: errorData?.details?.aiStatus || errorData?.status,
          });
          
          toast.error(errorMessage);
          setIsAnalyzing(false);
          setShowProgressiveFeedback(false);
          return;
        }

        // Wait for progressive feedback to complete (min 3 seconds)
        setTimeout(() => {
          setResult(data as AnalysisResult);
          setAnalysisComplete(true);
          setIsAnalyzing(false);
          setShowProgressiveFeedback(false);
          
          // Track successful analysis
          const duration = Date.now() - startTime;
          analytics.track("Image Analysis", {
            tool: "analyze",
            action: "analyze",
            success: true,
            duration_ms: duration,
            asset_id: data?.assetId || undefined,
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
        toast.error("Failed to regenerate prompt. Please try again.");
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

      // Call generate-image edge function
      const { data, error } = await supabase.functions.invoke("generate-image", {
        body: { 
          prompt,
          quality: options.quality,
          size: options.size,
          background: options.background
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error("Generation error:", error);
        
        // Track generation failure
        analytics.track("Image Generation", {
          tool: "generate",
          action: "generate",
          success: false,
          has_reference: false,
          error_type: error.message?.substring(0, 50) || "unknown",
        });
        
        if (error.message?.includes("Rate limit")) {
          toast.error("Too many requests. Please wait a moment and try again.");
        } else if (error.message?.includes("credits exhausted")) {
          toast.error("AI service temporarily unavailable. Please try again later.");
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
        
        // Fallback: Try to save from client side
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: savedAsset, error: saveError } = await supabase
              .from('generated_assets')
              .insert({
                user_id: user.id,
                type: 'image',
                action: 'generate',
                prompt: prompt,
                image_url: data.image,
                params: {
                  quality: options.quality,
                  size: options.size,
                  background: options.background,
                  fallback_save: true
                }
              })
              .select()
              .single();

            if (saveError) {
              console.error("[Index] Fallback save failed:", saveError);
              toast.warning("Image generated but may not appear in My Projects. Please refresh if needed.");
            } else {
              console.log("[Index] Fallback save successful:", savedAsset?.id);
              // Update the assetId in the response
              if (savedAsset?.id) {
                data.assetId = savedAsset.id;
              }
            }
          }
        } catch (fallbackError) {
          console.error("[Index] Fallback save exception:", fallbackError);
          toast.warning("Image generated but may not appear in My Projects. Please refresh if needed.");
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
      const errorMsg = error instanceof Error ? error.message : "An error occurred during image generation.";
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
  
  // Show skeleton only if loading and not timed out
  if (loading && !loadingTimeout) {
    return <PageSkeleton />;
  }
  
  // Log render state
  console.log('[Index] Rendering page', { user: !!user, loading, loadingTimeout });

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
              <HeroSection user={user} />
            </ErrorBoundary>
            <ErrorBoundary fallback={null}>
              <EmotionalValueSection />
            </ErrorBoundary>
            <ErrorBoundary fallback={null}>
              <CoreFeaturesSection />
            </ErrorBoundary>
            <ErrorBoundary fallback={<div className="py-20 text-center">Showcase unavailable</div>}>
              <ShowcaseSection />
            </ErrorBoundary>
            <ErrorBoundary fallback={null}>
              <ProofSection />
            </ErrorBoundary>
            <ErrorBoundary fallback={null}>
              <PricingSection />
            </ErrorBoundary>
            <ErrorBoundary fallback={null}>
              <FinalCTASection />
            </ErrorBoundary>
          </>
        )}

      {/* Studio Section - Only for authenticated users */}
      {user && (
        <div id="studio-section" className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-6 md:pb-16 space-y-6 md:space-y-8">
          <OnboardingPopup />
          
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
              <ResultsSection 
                result={result} 
                onRegenerate={handleRegenerate}
                isRegenerating={isAnalyzing}
                onGenerateImage={handleGenerateImage}
                generatedImages={generatedImages}
                onDeleteImage={handleDeleteImage}
                onResultUpdate={handleResultUpdate}
                imagePreviewUrl={previewUrl || undefined}
              />
            </div>
          )}
        </div>
      )}


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
