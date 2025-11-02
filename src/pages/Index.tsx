import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/Header";
import { UploadSection } from "@/components/UploadSection";
import { LoadingState } from "@/components/LoadingState";
import { ResultsSection } from "@/components/ResultsSection";
import { Tutorial } from "@/components/Tutorial";
import { Footer } from "@/components/Footer";
import { CreditCostIndicator } from "@/components/CreditCostIndicator";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { GenerationOptions } from "@/components/ImageGenerationDialog";

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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

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

  if (!user) {
    return null;
  }

  const handleFileSelect = (file: File) => {
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
        body: { action: "analyze", provider: "lovable" },
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
          return;
        }

        setResult(data as AnalysisResult);
        setIsAnalyzing(false);
        toast.success(`Image analyzed! ${deductData.remaining_balance} credits remaining.`);
      };

      reader.onerror = () => {
        toast.error("Failed to read image file.");
        setIsAnalyzing(false);
      };
    } catch (error) {
      console.error("Error during analysis:", error);
      const errorMsg = error instanceof Error ? error.message : "An error occurred during analysis.";
      toast.error(errorMsg);
      setIsAnalyzing(false);
      
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

  const handleGenerateImage = async (prompt: string, options: GenerationOptions, retryCount = 0): Promise<string | null> => {
    try {
      // Get session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please log in to continue.");
        return null;
      }

      // First deduct credits
      const { data: deductData, error: deductError } = await supabase.functions.invoke("deduct-credits", {
        body: { action: "generate", provider: "lovable" },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (deductError || !deductData?.success) {
        if (deductError?.message?.includes("Insufficient credits")) {
          toast.error("Insufficient credits. You need 3 credits to generate an image.");
        } else {
          toast.error("Failed to process payment. Please try again.");
        }
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
      toast.success(`Image generated! ${deductData.remaining_balance} credits remaining.`);
      
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Tutorial />
      <Header />
      
      {/* Hero Section */}
      <section id="hero" className="relative overflow-hidden border-b border-border/40 bg-gradient-to-b from-background via-background to-surface-1/30">
        <div className="container mx-auto px-4 py-20 md:py-32">
          <div className="max-w-4xl mx-auto text-center space-y-8 animate-fade-in">
            <h1 className="text-5xl md:text-7xl font-display font-bold leading-tight">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-900 via-zinc-600 to-zinc-900 dark:from-white dark:via-zinc-300 dark:to-white" style={{ letterSpacing: '0.02em' }}>
                ArtDirector Studio
              </span>
            </h1>
            <p className="text-2xl md:text-3xl font-light tracking-[0.15em] leading-loose text-muted-foreground">
              Reconstruct. Refine. Reimagine.
            </p>
          </div>
        </div>
      </section>
      
      <main id="studio" className="flex-1 container mx-auto px-4 py-16 max-w-7xl">
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

          {/* How It Works Section */}
          <section id="how-it-works" className="py-20 border-t border-border/40 scroll-mt-14">
            <div className="text-center space-y-4 mb-16">
              <h2 className="text-4xl font-display font-bold tracking-tight">
                How It Works
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Three simple steps to transform your creative vision
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  title: "Analyze",
                  description: "Upload your image and let AI understand its composition, style, and elements",
                  icon: "🔍",
                },
                {
                  title: "Generate",
                  description: "Create new visuals based on your prompt and refined parameters",
                  icon: "✨",
                },
                {
                  title: "Refine",
                  description: "Iterate and enhance with precision controls until it's perfect",
                  icon: "🎨",
                },
              ].map((step, index) => (
                <div key={index} className="glass rounded-2xl p-8 text-center hover-lift transition-all duration-300">
                  <div className="text-5xl mb-4">{step.icon}</div>
                  <h3 className="text-2xl font-display font-semibold mb-3">{step.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{step.description}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Trust Section */}
          <section id="trust" className="py-20 border-t border-border/40 scroll-mt-14">
            <div className="glass rounded-2xl overflow-hidden">
              <div className="p-12 md:p-16">
                <div className="max-w-3xl mx-auto text-center space-y-6">
                  <h2 className="text-3xl md:text-4xl font-display font-bold tracking-tight">
                    Built for Creators, Privacy First
                  </h2>
                  <p className="text-lg text-muted-foreground leading-relaxed">
                    Your images and prompts are processed securely. We use industry-standard encryption
                    and never share your creative work. Start with 50 free credits—no card required.
                  </p>
                  <div className="pt-6">
                    <Button size="lg" onClick={() => document.getElementById('studio')?.scrollIntoView({ behavior: 'smooth' })}>
                      Start Creating Free
                    </Button>
                    <p className="text-sm text-muted-foreground mt-3">
                      50 credits included • No credit card needed
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
