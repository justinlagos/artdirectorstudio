import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Copy, Edit3, Save, X } from "lucide-react";
import { toast } from "sonner";

interface PromptDisplayProps {
  prompt: string;
  onPromptUpdate?: (updatedPrompt: string) => void;
}

export const PromptDisplay = ({ prompt, onPromptUpdate }: PromptDisplayProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedPrompt, setEditedPrompt] = useState(prompt);

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(isEditing ? editedPrompt : prompt);
    toast.success("Prompt copied to clipboard");
  };

  const handleEdit = () => {
    setEditedPrompt(prompt);
    setIsEditing(true);
  };

  const handleSave = () => {
    if (editedPrompt.trim() === "") {
      toast.error("Prompt cannot be empty");
      return;
    }
    if (onPromptUpdate) {
      onPromptUpdate(editedPrompt);
      toast.success("Prompt updated");
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedPrompt(prompt);
    setIsEditing(false);
  };

  return (
    <section className="rounded-2xl border border-border/40 bg-card/50 backdrop-blur-sm p-6 md:p-8 shadow-sm">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-1">Full Generation Prompt</h3>
          <p className="text-sm text-muted-foreground">
            {isEditing ? "Edit the prompt to refine your generation" : "Use this in Studio to generate your image"}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isEditing ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancel}
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleSave}
              >
                <Save className="w-4 h-4 mr-2" />
                Save
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyPrompt}
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleEdit}
              >
                <Edit3 className="w-4 h-4 mr-2" />
                Edit
              </Button>
            </>
          )}
        </div>
      </div>

      {isEditing ? (
        <Textarea
          value={editedPrompt}
          onChange={(e) => setEditedPrompt(e.target.value)}
          className="min-h-[280px] font-mono text-xs md:text-sm leading-relaxed resize-none"
          placeholder="Enter your generation prompt..."
        />
      ) : (
        <div className="max-h-[280px] overflow-y-auto rounded-xl border border-border/40 bg-muted/30 p-4 md:p-6">
          <p className="font-mono text-xs md:text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap break-words">
            {prompt}
          </p>
        </div>
      )}
    </section>
  );
};
