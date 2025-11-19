// Export EditImageModalWrapper as ImageEditor for standardized modal experience
export { EditImageModalWrapper as ImageEditor } from "./edit-image/EditImageModalWrapper";

// Keep the old interface for compatibility
export interface ImageEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  initialInstruction?: string;
  onImageEdited?: (newImageUrl: string) => void;
}
