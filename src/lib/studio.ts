import { useModalStore } from "@/store/modalStore";
import { useStudioStore } from "@/store/studioStore";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface OpenStudioOptions {
  basePrompt: string;
  imageUrl?: string;
  meta?: Record<string, unknown>;
}

export function openStudioWithPrompt({
  basePrompt,
  imageUrl,
  meta,
}: OpenStudioOptions): void {
  const studioState = useStudioStore.getState();
  const modalState = useModalStore.getState();

  // Set initial prompt - will be enhanced with analysis if image is provided
  studioState.setPrompt(basePrompt || "");
  studioState.setImage(imageUrl || "");
  if (meta) {
    studioState.setMeta(meta);
  } else {
    studioState.setMeta(undefined);
  }

  modalState.openGenerateModal();

  // If an image is provided, analyze it in the background to enhance the prompt
  if (imageUrl) {
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        // Check if we already have analysis for this image in the database
        const { data: existingAsset } = await supabase
          .from('generated_assets')
          .select('analysis_data, prompt')
          .eq('image_url', imageUrl)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (existingAsset?.analysis_data) {
          const analysis = existingAsset.analysis_data as Record<string, any>;
          const imageOverview = analysis.image_overview || analysis.summary || '';
          
          if (imageOverview) {
            // Create an art-director-level prompt from the analysis
            const contextPrompt = basePrompt && basePrompt !== "Refine this image"
              ? `${basePrompt}. ${imageOverview}`
              : imageOverview;
            
            studioState.setPrompt(contextPrompt);
            toast.success("Image context loaded", {
              description: "Prompt enhanced with image analysis"
            });
          }
        } else {
          // Try to analyze the image in the background
          try {
            const response = await fetch(imageUrl);
            if (!response.ok) return;
            
            const blob = await response.blob();
            const reader = new FileReader();
            
            reader.onloadend = async () => {
              const base64Image = reader.result as string;
              
              try {
                const { data: analysisData, error: analysisError } = await supabase.functions.invoke("analyze-image", {
                  body: { image: base64Image },
                  headers: { Authorization: `Bearer ${session.access_token}` },
                });

                if (!analysisError && analysisData?.analysis_data) {
                  const analysis = analysisData.analysis_data as Record<string, any>;
                  const imageOverview = analysis.image_overview || analysis.summary || '';
                  
                  if (imageOverview) {
                    const contextPrompt = basePrompt && basePrompt !== "Refine this image"
                      ? `${basePrompt}. ${imageOverview}`
                      : imageOverview;
                    
                    studioState.setPrompt(contextPrompt);
                    toast.success("Image analyzed", {
                      description: "Prompt enhanced with image context"
                    });
                  }
                }
              } catch (err) {
                console.error('[Studio] Analysis error:', err);
                // Silently fail - user can still use the base prompt
              }
            };
            
            reader.readAsDataURL(blob);
          } catch (fetchError) {
            console.error('[Studio] Image fetch error:', fetchError);
            // Silently fail
          }
        }
      } catch (error) {
        console.error('[Studio] Error analyzing image:', error);
        // Silently fail - user can still use the base prompt
      }
    })();
  }

  requestAnimationFrame(() => {
    const modalBody = document.querySelector<HTMLElement>(".studio-modal-body");
    if (modalBody) {
      modalBody.scrollTop = 0;
    }
  });
}

export function closeStudioModal(): void {
  const modalState = useModalStore.getState();
  const studioState = useStudioStore.getState();
  modalState.closeGenerateModal();
  studioState.reset();
}
