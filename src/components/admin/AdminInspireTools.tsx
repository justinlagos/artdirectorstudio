import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Star,
  Trash2,
  Tags,
  Shield,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

interface AdminInspireToolsProps {
  sharedAssetId: string;
  currentTags: {
    style: string[];
    color: string[];
    mood: string[];
    composition: string[];
  };
  isFeatured: boolean;
  onUpdate: () => void;
}

export const AdminInspireTools = ({
  sharedAssetId,
  currentTags,
  isFeatured,
  onUpdate,
}: AdminInspireToolsProps) => {
  const [showTagDialog, setShowTagDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [tags, setTags] = useState(currentTags);
  const [newTag, setNewTag] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<keyof typeof tags>("style");
  const [loading, setLoading] = useState(false);

  const toggleFeature = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("shared_assets")
        .update({ featured: !isFeatured })
        .eq("id", sharedAssetId);

      if (error) throw error;
      
      toast.success(isFeatured ? "Removed from Staff Picks" : "Added to Staff Picks");
      onUpdate();
    } catch (error) {
      console.error("Error toggling feature:", error);
      toast.error("Failed to update feature status");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTags = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("shared_assets")
        .update({ tags })
        .eq("id", sharedAssetId);

      if (error) throw error;
      
      toast.success("Tags updated successfully");
      setShowTagDialog(false);
      onUpdate();
    } catch (error) {
      console.error("Error updating tags:", error);
      toast.error("Failed to update tags");
    } finally {
      setLoading(false);
    }
  };

  const addTag = () => {
    if (!newTag.trim()) return;
    
    const trimmedTag = newTag.trim().toLowerCase();
    if (!tags[selectedCategory].includes(trimmedTag)) {
      setTags({
        ...tags,
        [selectedCategory]: [...tags[selectedCategory], trimmedTag],
      });
    }
    setNewTag("");
  };

  const removeTag = (category: keyof typeof tags, tag: string) => {
    setTags({
      ...tags,
      [category]: tags[category].filter(t => t !== tag),
    });
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("shared_assets")
        .update({ is_public: false })
        .eq("id", sharedAssetId);

      if (error) throw error;
      
      toast.success("Content removed from public gallery");
      setShowDeleteDialog(false);
      onUpdate();
    } catch (error) {
      console.error("Error removing content:", error);
      toast.error("Failed to remove content");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg border border-border">
      <Badge variant="outline" className="gap-1">
        <Shield className="w-3 h-3" />
        Admin
      </Badge>

      <Button
        size="sm"
        variant={isFeatured ? "default" : "outline"}
        onClick={toggleFeature}
        disabled={loading}
        className="gap-1.5"
      >
        <Star className={`w-3.5 h-3.5 ${isFeatured ? "fill-current" : ""}`} />
        {isFeatured ? "Featured" : "Feature"}
      </Button>

      <Button
        size="sm"
        variant="outline"
        onClick={() => setShowTagDialog(true)}
        className="gap-1.5"
      >
        <Tags className="w-3.5 h-3.5" />
        Manage Tags
      </Button>

      <Button
        size="sm"
        variant="outline"
        onClick={() => setShowDeleteDialog(true)}
        className="gap-1.5 text-destructive hover:text-destructive"
      >
        <Trash2 className="w-3.5 h-3.5" />
        Remove
      </Button>

      {/* Tag Management Dialog */}
      <Dialog open={showTagDialog} onOpenChange={setShowTagDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage Tags</DialogTitle>
            <DialogDescription>
              Add or remove tags to help users discover this content
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Add New Tag */}
            <div className="flex gap-2">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as keyof typeof tags)}
                className="px-3 py-2 rounded-md border bg-background"
              >
                <option value="style">Style</option>
                <option value="color">Color</option>
                <option value="mood">Mood</option>
                <option value="composition">Composition</option>
              </select>
              <Input
                placeholder="Add new tag..."
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addTag()}
              />
              <Button onClick={addTag}>Add</Button>
            </div>

            {/* Current Tags */}
            <div className="space-y-3">
              {(Object.keys(tags) as Array<keyof typeof tags>).map(category => (
                <div key={category} className="space-y-2">
                  <Label className="capitalize font-medium">{category}</Label>
                  <div className="flex flex-wrap gap-2">
                    {tags[category].length > 0 ? (
                      tags[category].map(tag => (
                        <Badge key={tag} variant="secondary" className="gap-1">
                          {tag}
                          <button
                            onClick={() => removeTag(category, tag)}
                            className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">No tags</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTagDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveTags} disabled={loading}>
              Save Tags
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Remove from Public Gallery?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will hide the content from the public Inspire gallery. The creator
              will still have access to it in their history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Remove Content
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
