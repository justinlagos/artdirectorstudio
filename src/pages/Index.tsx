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
      
      <main className="flex-1 container mx-auto px-4 py-12 max-w-5xl">
        <div className="mb-8 text-center">
          <p className="text-sm text-muted-foreground">
            Welcome back! Upload an image to get started.
          </p>
        </div>
        <div className="space-y-12 animate-fade-in">
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
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Index;
