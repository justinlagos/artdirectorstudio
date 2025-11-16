// Export UniversalImageWorkspace as ImageEditor for backward compatibility
// This provides the new full-screen workspace experience
export { UniversalImageWorkspace as ImageEditor } from "./UniversalImageWorkspace";

// Keep the old interface for compatibility
export interface ImageEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  initialInstruction?: string;
  onImageEdited?: (newImageUrl: string) => void;
}
