import { useModalStore } from "@/store/modalStore";
import { useStudioStore } from "@/store/studioStore";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { analyzeImageDeep, getCachedUnderstanding } from "@/lib/intelligence/imageUnderstanding";
import { synthesizeContextLockedPrompt, generateArtDirectorPrompt } from "@/lib/intelligence/promptIntelligence";
import { getUserPreferences } from "@/lib/intelligence/userBehavior";

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

  // If an image is provided, use Intelligence Framework to enhance the prompt
  if (imageUrl) {
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Get image understanding (cached or fresh)
        let understanding = await getCachedUnderstanding(imageUrl);
        if (!understanding) {
          // Analyze image deeply
          understanding = await analyzeImageDeep(imageUrl);
        }

        // Get user preferences for personalization
        const userPreferences = await getUserPreferences(user.id);

        // Synthesize context-locked prompt
        const intent = basePrompt && basePrompt !== "Refine this image" 
          ? 'enhancement' 
          : 'variation';

        const synthesized = synthesizeContextLockedPrompt({
          userPrompt: basePrompt || "Refine this image",
          imageUnderstanding: understanding,
          userPreferences,
          intent,
          metadata: meta,
        });

        // Update Studio with intelligent prompt
        studioState.setPrompt(synthesized.prompt);
        
        toast.success("Intelligent prompt generated", {
          description: synthesized.reasoning || "Context-locked prompt created"
        });
      } catch (error) {
        console.error('[Studio] Intelligence Framework error:', error);
        // Fallback to basic analysis
        try {
          const { data: existingAsset } = await supabase
            .from('generated_assets')
            .select('analysis_data')
            .eq('image_url', imageUrl)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (existingAsset?.analysis_data) {
            const analysis = existingAsset.analysis_data as Record<string, any>;
            const imageOverview = analysis.image_overview || analysis.summary || '';
            
            if (imageOverview) {
              const contextPrompt = basePrompt && basePrompt !== "Refine this image"
                ? `${basePrompt}. ${imageOverview}`
                : imageOverview;
              
              studioState.setPrompt(contextPrompt);
            }
          }
        } catch (fallbackError) {
          console.error('[Studio] Fallback analysis error:', fallbackError);
          // Silently fail - user can still use the base prompt
        }
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
