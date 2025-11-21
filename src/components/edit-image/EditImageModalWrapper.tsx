import { useEffect } from "react";
import { ArtieModal } from "@/components/artie/ArtieModal";
import { UniversalImageWorkspace } from "@/components/UniversalImageWorkspace";
import { Edit } from "lucide-react";
import { useVisualContextStore } from "@/store/visualContextStore";

interface EditImageModalWrapperProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  initialInstruction?: string;
  onImageEdited?: (newImageUrl: string) => void;
}

export const EditImageModalWrapper = ({
  open,
  onOpenChange,
  imageUrl,
  initialInstruction = "",
  onImageEdited,
}: EditImageModalWrapperProps) => {
  const basePrompt = useVisualContextStore((state) => state.basePrompt);
  const analysisData = useVisualContextStore((state) => state.analysisData);
  const hasVisualContext = !!(basePrompt || analysisData);

  // Debug: Log modal state changes
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('[EditImageModalWrapper] Modal state:', {
        open,
        hasImageUrl: !!imageUrl,
        imageUrl: imageUrl ? `${imageUrl.substring(0, 50)}...` : 'empty',
        hasVisualContext,
      });
    }
  }, [open, imageUrl, hasVisualContext]);

  // Don't render if no image URL
  if (!imageUrl && !open) {
    return null;
  }

  return (
    <ArtieModal
      open={open}
      onOpenChange={onOpenChange}
      title={
        <div className="flex items-center gap-3">
          <Edit className="h-5 w-5" />
          Edit Image
        </div>
      }
      description="Adjust, select regions, apply colors, and make advanced edits to your image."
      maxWidth="full"
      contentClassName="p-0 h-full flex flex-col min-h-0"
      preventBodyScroll={true}
    >
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <UniversalImageWorkspace
          open={open}
          onOpenChange={onOpenChange}
          imageUrl={imageUrl}
          initialInstruction={initialInstruction || basePrompt || ""}
          onImageEdited={onImageEdited}
          sourceType="edit"
        />
      </div>
    </ArtieModal>
  );
};

