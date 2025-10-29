import { useState } from "react";
import { Header } from "@/components/Header";
import { UploadSection } from "@/components/UploadSection";
import { LoadingState } from "@/components/LoadingState";
import { ResultsSection } from "@/components/ResultsSection";
import { Footer } from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AnalysisResult {
  prompt: string;
  breakdown: {
    subject: string;
    camera_lens: string;
    composition: string;
    lighting: string;
    color_palette: string;
    design_style: string;
    aesthetic_mood: string;
    texture: string;
    environment: string;
    background: string;
    artistic_medium: string;
    light_source_behavior: string;
    typography: string;
    aspect_ratio: string;
    focal_emotion_or_posture: string;
    visual_hierarchy: string;
    detail_density: string;
    art_direction: string;
    cultural_influence: string;
    intended_use: string;
  };
}

const Index = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const handleFileSelect = (file: File) => {
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
      
      reader.onload = async () => {
        const base64Image = reader.result as string;
        
        const { data, error } = await supabase.functions.invoke("analyze-image", {
          body: { image: base64Image },
        });

        if (error) {
          console.error("Analysis error:", error);
          toast.error("Failed to analyze image. Please try again.");
          setIsAnalyzing(false);
          return;
        }

        setResult(data as AnalysisResult);
        setIsAnalyzing(false);
        toast.success("Image analyzed successfully!");
      };

      reader.onerror = () => {
        toast.error("Failed to read image file.");
        setIsAnalyzing(false);
      };
    } catch (error) {
      console.error("Error during analysis:", error);
      toast.error("An error occurred during analysis.");
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-12 max-w-5xl">
        <div className="space-y-12 animate-fade-in">
          <UploadSection 
            onFileSelect={handleFileSelect}
            previewUrl={previewUrl}
            onAnalyze={handleAnalyze}
            disabled={!selectedFile || isAnalyzing}
          />
          
          {isAnalyzing && <LoadingState />}
          
          {result && <ResultsSection result={result} />}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Index;
