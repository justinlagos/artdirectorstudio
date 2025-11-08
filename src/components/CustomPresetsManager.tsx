import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, MoreVertical, Edit, Trash2, Share2, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CustomPresetDialog } from "./CustomPresetDialog";
import { GenerationOptions } from "./ImageGenerationDialog";
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

interface CustomPreset {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  options: GenerationOptions;
  prompt_modifier: string;
  is_public: boolean;
  usage_count: number;
  created_at: string;
}

export const CustomPresetsManager = () => {
  const [presets, setPresets] = useState<CustomPreset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingPreset, setEditingPreset] = useState<CustomPreset | null>(null);
  const [deletingPresetId, setDeletingPresetId] = useState<string | null>(null);

  const fetchPresets = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('custom_generation_presets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPresets((data || []).map(d => ({
        ...d,
        options: d.options as unknown as GenerationOptions
      })));
    } catch (error) {
      console.error("Error fetching presets:", error);
      toast.error("Failed to load presets");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPresets();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('custom_generation_presets')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success("Preset deleted successfully");
      fetchPresets();
      setDeletingPresetId(null);
    } catch (error) {
      console.error("Error deleting preset:", error);
      toast.error("Failed to delete preset");
    }
  };

  const handleTogglePublic = async (preset: CustomPreset) => {
    try {
      const { error } = await supabase
        .from('custom_generation_presets')
        .update({ is_public: !preset.is_public })
        .eq('id', preset.id);

      if (error) throw error;
      
      toast.success(preset.is_public ? "Preset made private" : "Preset made public");
      fetchPresets();
    } catch (error) {
      console.error("Error toggling visibility:", error);
      toast.error("Failed to update preset");
    }
  };

  const handleShare = (preset: CustomPreset) => {
    const shareText = `Check out my custom generation preset: ${preset.name}`;
    const shareUrl = `${window.location.origin}?preset=${preset.id}`;
    
    if (navigator.share) {
      navigator.share({
        title: preset.name,
        text: shareText,
        url: shareUrl
      }).catch(() => {
        navigator.clipboard.writeText(shareUrl);
        toast.success("Preset link copied to clipboard!");
      });
    } else {
      navigator.clipboard.writeText(shareUrl);
      toast.success("Preset link copied to clipboard!");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold">Custom Presets</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Create and manage your personalized generation presets
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Preset
        </Button>
      </div>

      {/* Presets Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : presets.length === 0 ? (
        <Card className="p-12">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <Plus className="w-8 h-8 text-muted-foreground" />
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">No Custom Presets Yet</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Create your first custom preset to save your favorite generation settings for quick reuse
              </p>
            </div>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Preset
            </Button>
          </div>
        </Card>
      ) : (
        <ScrollArea className="h-[600px]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pr-4">
            {presets.map((preset) => (
              <Card key={preset.id} className="p-4 space-y-3 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">{preset.icon}</div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{preset.name}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                        {preset.description || 'No description'}
                      </p>
                    </div>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditingPreset(preset)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleTogglePublic(preset)}>
                        {preset.is_public ? (
                          <>
                            <EyeOff className="w-4 h-4 mr-2" />
                            Make Private
                          </>
                        ) : (
                          <>
                            <Eye className="w-4 h-4 mr-2" />
                            Make Public
                          </>
                        )}
                      </DropdownMenuItem>
                      {preset.is_public && (
                        <DropdownMenuItem onClick={() => handleShare(preset)}>
                          <Share2 className="w-4 h-4 mr-2" />
                          Share
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => setDeletingPresetId(preset.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="text-xs">
                    {preset.category}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {preset.options.quality}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {preset.options.size.split('x')[0] === preset.options.size.split('x')[1] 
                      ? 'Square' 
                      : parseInt(preset.options.size.split('x')[0]) > parseInt(preset.options.size.split('x')[1])
                        ? 'Landscape'
                        : 'Portrait'
                    }
                  </Badge>
                  {preset.is_public && (
                    <Badge variant="secondary" className="text-xs">
                      Public
                    </Badge>
                  )}
                </div>

                <div className="pt-2 border-t text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Used {preset.usage_count} times</span>
                    <span>{new Date(preset.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Create/Edit Dialog */}
      <CustomPresetDialog
        open={showCreateDialog || !!editingPreset}
        onOpenChange={(open) => {
          if (!open) {
            setShowCreateDialog(false);
            setEditingPreset(null);
          }
        }}
        preset={editingPreset}
        onSave={() => {
          fetchPresets();
          setEditingPreset(null);
        }}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingPresetId} onOpenChange={() => setDeletingPresetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Preset</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this preset? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingPresetId && handleDelete(deletingPresetId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
