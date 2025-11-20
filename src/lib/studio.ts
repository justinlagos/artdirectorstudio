import { useModalStore } from "@/store/modalStore";
import { useStudioStore } from "@/store/studioStore";
import { useVisualContextStore } from "@/store/visualContextStore";
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

export async function openStudioWithPrompt({
  basePrompt,
  imageUrl,
  meta,
}: OpenStudioOptions): Promise<void> {
  const studioState = useStudioStore.getState();
  const modalState = useModalStore.getState();
  const visualContext = useVisualContextStore.getState();

  // Update visual context for cross-tool continuity
  if (imageUrl) {
    visualContext.updateImage(imageUrl);
    visualContext.addOperation({
      tool: 'artie',
      prompt: basePrompt,
      imageUrl,
    });
  }
  if (basePrompt) {
    visualContext.updatePrompt(basePrompt);
  }

  // If an image is provided, generate Creative Director analysis FIRST before opening modal
  // This prevents context drift by ensuring prompt is ready immediately
  let initialPrompt = basePrompt || "";
  
  if (imageUrl) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Get image understanding (cached or fresh) - do this BEFORE opening modal
          let understanding = await getCachedUnderstanding(imageUrl);
          if (!understanding) {
            // Show loading state while analyzing
            toast.loading("Analyzing image for Creative Director insights...", { id: 'studio-analysis' });
            understanding = await analyzeImageDeep(imageUrl);
            toast.dismiss('studio-analysis');
          }

          // Get user preferences for personalization
          const userPreferences = await getUserPreferences(user.id);

          // Generate Creative Director-level prompt IMMEDIATELY
          const { generateCreativeDirectorPrompt } = await import('@/lib/intelligence/promptIntelligence');
          const creativePrompt = await generateCreativeDirectorPrompt({
            userPrompt: basePrompt || "Refine this image",
            imageUrl,
            imageUnderstanding: understanding,
            userPreferences,
            meta,
          });

          initialPrompt = creativePrompt.prompt;
          
          // Set enhanced metadata
          if (meta) {
            studioState.setMeta({
              ...meta,
              ...creativePrompt.metadata,
              source: meta.source || 'studio',
            });
            visualContext.setContext({
              analysisData: creativePrompt.metadata,
            });
          } else {
            studioState.setMeta({
              ...creativePrompt.metadata,
              source: 'studio',
            });
            visualContext.setContext({
              analysisData: creativePrompt.metadata,
            });
          }

          toast.success("Creative Director analysis complete", {
            description: creativePrompt.reasoning || "Context-aware prompt ready"
          });
        }
      }
    } catch (error) {
      console.error('[Studio] Intelligence Framework error:', error);
      // Fallback: use expert prompt generator
      try {
        const { generateExpertStudioPrompt } = await import('@/lib/artie/expertPromptGenerator');
        const expertAnalysis = await generateExpertStudioPrompt(imageUrl, basePrompt);
        initialPrompt = expertAnalysis.prompt;
        
        if (meta) {
          studioState.setMeta({
            ...meta,
            suggestedEdits: expertAnalysis.suggestedEdits,
            analysis: expertAnalysis.analysis,
          });
        }
      } catch (fallbackError) {
        console.error('[Studio] Fallback analysis error:', fallbackError);
        // Use base prompt as-is - better than nothing
      }
    }
  }

  // NOW set the prompt and open modal - prompt is already enhanced
  studioState.setPrompt(initialPrompt);
  studioState.setImage(imageUrl || "");
  
  // Open modal with pre-filled intelligent prompt
  modalState.openGenerateModal();

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
  // Note: visualContextStore persists across modal closes for continuity
}
