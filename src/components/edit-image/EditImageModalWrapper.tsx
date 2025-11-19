import { ArtieModal } from "@/components/artie/ArtieModal";
import { UniversalImageWorkspace } from "@/components/UniversalImageWorkspace";
import { Edit } from "lucide-react";

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
  return (
    <ArtieModal
      open={open}
      onOpenChange={onOpenChange}
      title={
        <div className="flex items-center gap-2">
          <Edit className="h-5 w-5" />
          Edit Image
        </div>
      }
      description="Adjust, select regions, apply colors, and make advanced edits to your image."
      maxWidth="full"
      contentClassName="p-0"
      preventBodyScroll={true}
    >
      <div className="h-[calc(90vh-200px)] min-h-[600px] max-h-[800px] overflow-hidden">
        <UniversalImageWorkspace
          open={open}
          onOpenChange={onOpenChange}
          imageUrl={imageUrl}
          initialInstruction={initialInstruction}
          onImageEdited={onImageEdited}
          sourceType="edit"
        />
      </div>
    </ArtieModal>
  );
};

