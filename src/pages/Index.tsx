import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { UploadSection } from "@/components/UploadSection";
import { ProgressiveAnalysisFeedback } from "@/components/ProgressiveAnalysisFeedback";
import { ResultsSection } from "@/components/ResultsSectionEnhanced";
import { OnboardingPopup } from "@/components/OnboardingPopup";
import { Footer } from "@/components/Footer";
import { CreditCostIndicator } from "@/components/CreditCostIndicator";
import { PullToRefreshIndicator } from "@/components/PullToRefreshIndicator";
import { KeyboardShortcutsGuide } from "@/components/KeyboardShortcutsGuide";
import { FeaturedPresetsCarousel } from "@/components/FeaturedPresetsCarousel";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Sparkles, Wand2, Upload, ArrowRight, Keyboard } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { useKeyboardShortcuts, KeyboardShortcut, getModifierKey } from "@/hooks/useKeyboardShortcuts";
import { useToolsModal } from "@/contexts/ToolsModalContext";
import { ImageGenerationDialog, type GenerationOptions } from "@/components/ImageGenerationDialog";
import { LandingFeaturedInspire } from "@/components/LandingFeaturedInspire";

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
  const { openGenerateDialog } = useToolsModal();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showProgressiveFeedback, setShowProgressiveFeedback] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [showShortcutsGuide, setShowShortcutsGuide] = useState(false);
  const [studioPrefill, setStudioPrefill] = useState<{ prompt: string; imageUrl?: string } | null>(null);
  const [showStudioPrefillDialog, setShowStudioPrefillDialog] = useState(false);

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

  // Fetch featured testimonials
  const { data: testimonials } = useQuery({
    queryKey: ["testimonials"],
    queryFn: async () => {
      const { data } = await supabase
        .from("testimonials")
        .select("*")
        .eq("featured", true)
        .order("display_order", { ascending: true });
      return data;
    },
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
    if (state?.studioPrefill) {
      setStudioPrefill(state.studioPrefill);
      setShowStudioPrefillDialog(true);
      navigate(location.pathname, { replace: true });
    }
  }, [location, navigate]);

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
          openGenerateDialog({ prompt: result.full_regeneration_prompt, mode: 'generate' });
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

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
          toast.error("Failed to analyze image. Please try again.");
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
          toast.success("Image analyzed successfully!");
        }, 3000);
      };

      reader.onerror = () => {
        toast.error("Failed to read image file.");
        setIsAnalyzing(false);
        setShowProgressiveFeedback(false);
      };
    } catch (error) {
      console.error("Error during analysis:", error);
      const errorMsg = error instanceof Error ? error.message : "An error occurred during analysis.";
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

  const handleGenerateImage = async (prompt: string, options: GenerationOptions, retryCount = 0): Promise<string | null> => {
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
        toast.error("Failed to generate image. Please try again.");
        return null;
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
  };

  const handleDeleteImage = (id: string) => {
    setGeneratedImages(prev => prev.filter(img => img.id !== id));
  };

  const handleResultUpdate = (updatedResult: AnalysisResult) => {
    setResult(updatedResult);
  };

  return (
    <div className="min-h-screen bg-background">
      <PullToRefreshIndicator
        pullDistance={pullDistance}
        isRefreshing={isRefreshing}
        threshold={80}
      />
      <Header />
      
      {/* Hero Section */}
      <section className="pt-20 pb-16 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/5 border border-primary/10 mb-4">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">AI-Powered Creative Director</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            <span className="text-primary">Art Director Studio</span>
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Upload any image and get instant expert feedback on composition, lighting, 
            color theory, and more. Perfect for designers, photographers, and creatives.
          </p>

          {!user && (
            <div className="flex items-center justify-center gap-4 mt-8">
              <Button size="lg" onClick={() => navigate("/auth")}>
                Get Started Free
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate("/auth")}>
                Sign In
              </Button>
            </div>
          )}
        </div>
      </section>

      <section className="px-6 lg:px-8">
        <div className="mx-auto w-full max-w-7xl">
          <LandingFeaturedInspire />
        </div>
      </section>

      {/* What You Can Do Section - Only for non-authenticated users */}
      {!user && (
        <section className="py-16 px-6 lg:px-8 bg-secondary/30">
          <div className="max-w-7xl mx-auto">
            <div className="text-center space-y-4 mb-12">
              <h2 className="text-3xl md:text-4xl font-bold">Get Started in 3 Simple Steps</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                No experience required. Upload, analyze, and create stunning visuals in seconds.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="text-center hover-lift">
                <CardContent className="pt-6">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Upload className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">1. Upload Your Image</h3>
                  <p className="text-muted-foreground">
                    Drop any image to get started. We support all common formats including JPG, PNG, and WebP.
                  </p>
                </CardContent>
              </Card>
              <Card className="text-center hover-lift">
                <CardContent className="pt-6">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">2. Get AI Analysis</h3>
                  <p className="text-muted-foreground">
                    Our AI analyzes composition, lighting, colors, and provides professional insights instantly.
                  </p>
                </CardContent>
              </Card>
              <Card className="text-center hover-lift">
                <CardContent className="pt-6">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Wand2 className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">3. Generate Variations</h3>
                  <p className="text-muted-foreground">
                    Create stunning variations, apply tweaks, and refine until you achieve perfection.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      )}

      {/* Testimonials Section - Only for non-authenticated users */}
      {!user && testimonials && testimonials.length > 0 && (
        <section className="py-16 px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center space-y-4 mb-12">
              <h2 className="text-3xl md:text-4xl font-bold">Loved by Creatives Worldwide</h2>
              <p className="text-lg text-muted-foreground">
                See what our users say about ArtDirector Studio
              </p>
            </div>
            <Carousel
              opts={{
                align: "start",
                loop: true,
              }}
              className="w-full"
            >
              <CarouselContent className="-ml-4">
                {testimonials.map((testimonial) => (
                  <CarouselItem key={testimonial.id} className="pl-4 md:basis-1/2 lg:basis-1/3">
                    <Card className="h-full hover-lift">
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4 mb-4">
                          <Avatar className="w-12 h-12">
                            <AvatarImage src={testimonial.avatar_url || undefined} alt={testimonial.name} />
                            <AvatarFallback>{testimonial.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="font-semibold">{testimonial.name}</div>
                            <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                          </div>
                        </div>
                        <p className="text-muted-foreground leading-relaxed">{testimonial.content}</p>
                      </CardContent>
                    </Card>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="hidden md:flex" />
              <CarouselNext className="hidden md:flex" />
            </Carousel>
          </div>
        </section>
      )}

      {/* Featured Presets Carousel */}
      <FeaturedPresetsCarousel />

      {/* Studio Section - Only for authenticated users */}
      {user && (
        <div id="studio-section" className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6 md:pb-16 space-y-6 md:space-y-8">
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

      {/* How It Works - Only show when no results */}
      {!result && (
        <section className="py-24 px-6 lg:px-8 bg-secondary/30">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
              How It Works
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  title: "Analyze",
                  description: "Upload your image and let AI understand its composition, style, and elements",
                  icon: (
                    <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8"/>
                      <path d="m21 21-4.35-4.35"/>
                    </svg>
                  ),
                },
                {
                  title: "Generate",
                  description: "Create new visuals based on your prompt and refined parameters",
                  icon: (
                    <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
                      <path d="M5 3v4"/>
                      <path d="M19 17v4"/>
                      <path d="M3 5h4"/>
                      <path d="M17 19h4"/>
                    </svg>
                  ),
                },
                {
                  title: "Refine",
                  description: "Iterate and enhance with precision controls until it's perfect",
                  icon: (
                    <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 19l7-7 3 3-7 7-3-3z"/>
                      <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/>
                      <path d="M2 2l7.586 7.586"/>
                      <circle cx="11" cy="11" r="2"/>
                    </svg>
                  ),
                },
              ].map((step, index) => (
                <div key={index} className="glass rounded-2xl p-8 text-center hover-lift transition-all duration-300">
                  <div className="flex items-center justify-center mb-4 text-foreground">{step.icon}</div>
                  <h3 className="text-2xl font-display font-semibold mb-3">{step.title}</h3>
                  <p className="text-muted-foreground">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Trust Section - Only show when no results */}
      {!result && (
        <section className="py-24 px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center space-y-6 mb-16">
              <h2 className="text-3xl md:text-4xl font-bold">
                Trusted by Creative Professionals
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Join thousands of designers and photographers who use ArtDirector Studio
                to elevate their creative work.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
              <div className="glass rounded-2xl p-8">
                <div className="text-4xl font-bold mb-2">10K+</div>
                <div className="text-muted-foreground">Active Users</div>
              </div>
              <div className="glass rounded-2xl p-8">
                <div className="text-4xl font-bold mb-2">100K+</div>
                <div className="text-muted-foreground">Images Analyzed</div>
              </div>
              <div className="glass rounded-2xl p-8">
                <div className="text-4xl font-bold mb-2">4.9★</div>
                <div className="text-muted-foreground">User Rating</div>
              </div>
            </div>

            <div className="text-center mt-12">
              {user ? (
                <Button size="lg" className="gap-2" onClick={() => {
                  const studioSection = document.getElementById("studio-section");
                  if (studioSection) {
                    studioSection.scrollIntoView({ behavior: "smooth" });
                  }
                }}>
                  <Sparkles className="w-5 h-5" />
                  Start Analyzing Now
                </Button>
              ) : (
                <Button size="lg" className="gap-2" onClick={() => navigate("/auth")}>
                  <Sparkles className="w-5 h-5" />
                  Start Analyzing for Free
                </Button>
              )}
            </div>
          </div>
        </section>
      )}

      <ImageGenerationDialog
        open={showStudioPrefillDialog}
        onOpenChange={(open) => {
          setShowStudioPrefillDialog(open);
          if (!open) {
            setStudioPrefill(null);
          }
        }}
        initialPrompt={studioPrefill?.prompt ?? ""}
        initialReferenceImage={studioPrefill?.imageUrl}
        onGenerate={handleGenerateImage}
      />

      <Footer />
      
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
  );
};

export default Index;
