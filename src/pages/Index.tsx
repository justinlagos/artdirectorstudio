import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/Header";
import { UploadSection } from "@/components/UploadSection";
import { LoadingState } from "@/components/LoadingState";
import { ResultsSection } from "@/components/ResultsSectionEnhanced";
import { Tutorial } from "@/components/Tutorial";
import { Footer } from "@/components/Footer";
import { CreditCostIndicator } from "@/components/CreditCostIndicator";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ImageGenerationDialog, GenerationOptions } from "@/components/ImageGenerationDialog";

// Testimonials component
const TestimonialsSection = () => {
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [showHint, setShowHint] = useState(true);

  useEffect(() => {
    const fetchTestimonials = async () => {
      const { data } = await supabase
        .from('testimonials')
        .select('*')
        .eq('featured', true)
        .order('display_order', { ascending: true })
        .limit(6);

      if (data) setTestimonials(data);
    };

    fetchTestimonials();

    // Hide hint after first interaction
    const hasSeenHint = sessionStorage.getItem('testimonials_hint_seen');
    if (hasSeenHint) setShowHint(false);
  }, []);

  const handleInteraction = () => {
    if (showHint) {
      setShowHint(false);
      sessionStorage.setItem('testimonials_hint_seen', 'true');
    }
  };

  if (testimonials.length === 0) return null;

  return (
    <section id="testimonials" className="py-20 border-t border-border/40 scroll-mt-14">
      <div className="text-center space-y-4 mb-16">
        <h2 className="text-4xl sm:text-5xl font-display font-bold tracking-tight">
          Loved by Creatives
        </h2>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          See what our users are saying
        </p>
        {showHint && (
          <p className="text-sm text-muted-foreground/70 animate-fade-in">
            Drag or swipe to see more →
          </p>
        )}
      </div>
      <div className="relative">
        {/* Gradient fade edges */}
        <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
        
        <div 
          className="overflow-x-auto pb-6 scrollbar-hide px-4 scroll-smooth"
          onScroll={handleInteraction}
          onTouchStart={handleInteraction}
        >
          <div className="flex gap-6 min-w-max">
            {testimonials.map((testimonial) => (
              <div 
                key={testimonial.id}
                className="group relative w-[380px] flex-shrink-0"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative h-full glass border border-border/50 hover:border-primary/30 rounded-2xl p-8 transition-all duration-300">
                  <p className="text-muted-foreground mb-6 leading-relaxed text-base">
                    "{testimonial.content}"
                  </p>
                  <div className="flex items-center gap-4">
                    {testimonial.avatar_url ? (
                      <img 
                        src={testimonial.avatar_url} 
                        alt={testimonial.name}
                        className="w-14 h-14 rounded-full object-cover ring-2 ring-border"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary via-primary/80 to-primary/60 flex items-center justify-center text-primary-foreground text-lg font-bold ring-2 ring-border">
                        {testimonial.name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-lg">{testimonial.name}</p>
                      <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Progress indicators */}
        <div className="flex justify-center gap-2 mt-6">
          {testimonials.map((_, index) => (
            <div 
              key={index}
              className="w-2 h-2 rounded-full bg-muted-foreground/30"
            />
          ))}
        </div>
      </div>
      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </section>
  );
};

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
  image_type?: string;
  detection_confidence?: number;
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [remixedPrompt, setRemixedPrompt] = useState<string | null>(null);
  const [showRemixDialog, setShowRemixDialog] = useState(false);

  // Check for remixed prompt from Inspire on mount
  useEffect(() => {
    const remixPrompt = sessionStorage.getItem("remix_prompt");
    if (remixPrompt) {
      setRemixedPrompt(remixPrompt);
      setShowRemixDialog(true);
      sessionStorage.removeItem("remix_prompt");
      // Show a toast to let user know the prompt is loaded
      toast.success("Prompt loaded from Inspire! Ready to create.", {
        duration: 4000,
      });
    }
  }, []);

  // Landing page is now public - no redirect needed

  // Cleanup on unmount - MUST be before early returns
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Cmd/Ctrl + U - Upload
      if ((e.metaKey || e.ctrlKey) && e.key === 'u') {
        e.preventDefault();
        document.querySelector<HTMLInputElement>('input[type="file"]')?.click();
      }
      
      // Cmd/Ctrl + Enter - Analyze (if image is selected)
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && selectedFile && !isAnalyzing) {
        e.preventDefault();
        handleAnalyze();
      }
      
      // Cmd/Ctrl + K - Copy prompt (if result exists)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k' && result) {
        e.preventDefault();
        navigator.clipboard.writeText(result.full_regeneration_prompt);
        toast.success("Prompt copied!");
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [selectedFile, isAnalyzing, result]);

  if (loading) {
    return <LoadingState />;
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

  const handleAnalyze = async () => {
    if (!selectedFile) return;

    setIsAnalyzing(true);
    
    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.readAsDataURL(selectedFile);
      
      await new Promise<void>((resolve, reject) => {
        reader.onload = async () => {
          try {
            const base64Image = reader.result as string;
            const { analyzeImage } = await import("@/lib/services/generationService");
            
            const result = await analyzeImage(base64Image);

            if (!result.success) {
              toast.error(result.error || "Failed to analyze image");
              setIsAnalyzing(false);
              return;
            }

            setResult(result.data);
            toast.success("Image analyzed successfully!");
            resolve();
          } catch (error) {
            reject(error);
          } finally {
            setIsAnalyzing(false);
          }
        };

        reader.onerror = () => {
          reject(new Error("Failed to read image file"));
        };
      });
    } catch (error) {
      console.error("Error during analysis:", error);
      toast.error("An error occurred during analysis.");
      setIsAnalyzing(false);
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

      // First deduct credits
      const { data: deductData, error: deductError } = await supabase.functions.invoke("deduct-credits", {
        body: { action: "refine", provider: "lovable" },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (deductError || !deductData?.success) {
        if (deductError?.message?.includes("Insufficient credits")) {
          toast.error("Insufficient credits. Please purchase more credits.");
        } else {
          toast.error("Failed to process payment. Please try again.");
        }
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
      toast.success(`Prompt regenerated! ${deductData.remaining_balance} credits remaining.`);
    } catch (error) {
      console.error("Error during regeneration:", error);
      toast.error("An error occurred during regeneration.");
      setIsAnalyzing(false);
    }
  };

  const handleGenerateImage = async (prompt: string, options: GenerationOptions): Promise<string | null> => {
    try {
      const { generateImage } = await import("@/lib/services/generationService");
      
      const result = await generateImage(prompt, options);

      if (!result.success) {
        toast.error(result.error || "Failed to generate image");
        return null;
      }

      if (result.imageUrl) {
        // Add to generated images list
        const newImage: GeneratedImage = {
          id: result.assetId || crypto.randomUUID(),
          imageUrl: result.imageUrl,
          prompt: prompt,
          timestamp: new Date()
        };
        
        setGeneratedImages(prev => [newImage, ...prev]);
        toast.success("Image generated successfully!");
        return result.imageUrl;
      }

      return null;
    } catch (error) {
      console.error("Error during image generation:", error);
      toast.error("An error occurred during image generation.");
      return null;
    }
  };

  const handleDeleteImage = (id: string) => {
    setGeneratedImages(prev => prev.filter(img => img.id !== id));
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Tutorial />
      <Header />
      
      {/* Hero Section */}
      <section id="hero" className="relative overflow-hidden border-b border-border/40 bg-gradient-to-b from-background via-background to-surface-1/30">
        <div className="container mx-auto px-4 py-20 md:py-32">
          <div className="max-w-4xl mx-auto text-center space-y-8 animate-fade-in">
            <h1 className="text-5xl md:text-7xl font-display font-bold leading-tight tracking-tight">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-900 via-zinc-600 to-zinc-900 dark:from-white dark:via-zinc-300 dark:to-white">
                ArtDirector Studio
              </span>
            </h1>
            <p className="text-2xl md:text-3xl font-light text-muted-foreground">
              Reconstruct. Refine. Reimagine.
            </p>
          </div>
        </div>
      </section>
      
      <main id="studio" className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
        <div className="space-y-16 animate-fade-in">
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
          
          {isAnalyzing && <LoadingState />}
          
          {result && (
            <ResultsSection 
              result={result} 
              onRegenerate={handleRegenerate}
              isRegenerating={isAnalyzing}
              onGenerateImage={handleGenerateImage}
              generatedImages={generatedImages}
              onDeleteImage={handleDeleteImage}
            />
          )}
          
          {/* Remix Dialog - Opens directly from Inspire */}
          {showRemixDialog && remixedPrompt && (
            <ImageGenerationDialog
              open={showRemixDialog}
              onOpenChange={setShowRemixDialog}
              initialPrompt={remixedPrompt}
              onGenerate={handleGenerateImage}
            />
          )}

          {/* How It Works Section */}
          <section id="how-it-works" className="py-20 border-t border-border/40 scroll-mt-14">
            <div className="text-center space-y-4 mb-16">
              <h2 className="text-4xl font-display font-bold tracking-tight">
                How It Works
              </h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  Three simple steps to transform your creative vision
                </p>
            </div>
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
          </section>

          {/* Testimonials Section */}
          <TestimonialsSection />

          {/* Trust Section */}
          <section id="trust" className="py-20 border-t border-border/40 scroll-mt-14">
            <div className="glass rounded-2xl overflow-hidden">
              <div className="p-12 md:p-16">
                <div className="max-w-3xl mx-auto text-center space-y-6">
                  <h2 className="text-3xl md:text-4xl font-display font-bold tracking-tight">
                    Built for Creators, Privacy First
                  </h2>
                  <p className="text-lg text-muted-foreground">
                    Your images and prompts are processed securely. We use industry-standard encryption
                    and never share your creative work. Start with 50 free credits, no card required.
                  </p>
                  <div className="pt-6">
                    <Button size="lg" onClick={() => document.getElementById('studio')?.scrollIntoView({ behavior: 'smooth' })}>
                      Start Creating Free
                    </Button>
                    <p className="text-sm text-muted-foreground mt-3">
                      50 credits included, No credit card needed
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Index;
