// Re-export the new EditImageModal as ImageEditor for backward compatibility
export { EditImageModal as ImageEditor } from "./edit-image/EditImageModal";

// Keep the old interface for compatibility
export interface ImageEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  initialInstruction?: string;
  onImageEdited?: (newImageUrl: string) => void;
}
