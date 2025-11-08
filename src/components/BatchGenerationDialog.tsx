import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { Wand2, CheckCircle2, Loader2, AlertCircle, Download, Plus } from "lucide-react";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { GENERATION_PRESETS, GenerationPreset } from "./GenerationPresets";
import { GenerationOptions } from "./ImageGenerationDialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";

interface BatchGenerationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  basePrompt: string;
  onGenerate: (prompt: string, options: GenerationOptions) => Promise<string | null>;
}

interface GenerationResult {
  presetId: string;
  presetName: string;
  status: 'pending' | 'generating' | 'success' | 'error';
  imageUrl?: string;
  error?: string;
  prompt: string;
}

export const BatchGenerationDialog = ({ 
  open, 
  onOpenChange, 
  basePrompt,
  onGenerate 
}: BatchGenerationDialogProps) => {
  const isMobile = useIsMobile();
  const [selectedPresets, setSelectedPresets] = useState<Set<string>>(new Set());
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState<GenerationResult[]>([]);
  const [overallProgress, setOverallProgress] = useState(0);
  const [allPresets, setAllPresets] = useState<GenerationPreset[]>(GENERATION_PRESETS);

  useEffect(() => {
    fetchCustomPresets();
  }, []);

  const fetchCustomPresets = async () => {
    try {
      const { data, error } = await supabase
        .from('custom_generation_presets')
        .select('*')
        .order('usage_count', { ascending: false });

      if (error) throw error;
      
      const customPresetsConverted: GenerationPreset[] = (data || []).map((cp: any) => ({
        id: cp.id,
        name: cp.name,
        description: cp.description,
        icon: <span className="text-xl">{cp.icon}</span>,
        category: cp.category,
        options: cp.options as unknown as GenerationOptions,
        promptModifier: cp.prompt_modifier
      }));

      setAllPresets([...GENERATION_PRESETS, ...customPresetsConverted]);
    } catch (error) {
      console.error("Error fetching custom presets:", error);
    }
  };

  const handlePresetToggle = (presetId: string) => {
    setSelectedPresets(prev => {
      const next = new Set(prev);
      if (next.has(presetId)) {
        next.delete(presetId);
      } else {
        next.add(presetId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedPresets.size === allPresets.length) {
      setSelectedPresets(new Set());
    } else {
      setSelectedPresets(new Set(allPresets.map(p => p.id)));
    }
  };

  const handleGenerate = async () => {
    if (selectedPresets.size === 0) {
      toast.error("Please select at least one preset");
      return;
    }

    setIsGenerating(true);
    setOverallProgress(0);

    // Initialize results
    const initialResults: GenerationResult[] = Array.from(selectedPresets).map(presetId => {
      const preset = allPresets.find(p => p.id === presetId)!;
      return {
        presetId: preset.id,
        presetName: preset.name,
        status: 'pending' as const,
        prompt: basePrompt + preset.promptModifier
      };
    });
    setResults(initialResults);

    // Generate all images in parallel
    const generationPromises = initialResults.map(async (result, index) => {
      const preset = allPresets.find(p => p.id === result.presetId)!;
      
      // Update status to generating
      setResults(prev => prev.map((r, i) => 
        i === index ? { ...r, status: 'generating' as const } : r
      ));

      try {
        const imageUrl = await onGenerate(result.prompt, preset.options);
        
        if (imageUrl) {
          // Increment usage count for custom presets
          if (preset.id.includes('-')) { // Custom presets have UUID format
            try {
              const { data } = await supabase
                .from('custom_generation_presets')
                .select('usage_count')
                .eq('id', preset.id)
                .single();
              
              if (data) {
                await supabase
                  .from('custom_generation_presets')
                  .update({ usage_count: (data.usage_count || 0) + 1 })
                  .eq('id', preset.id);
              }
            } catch (e) {
              console.error("Error incrementing usage:", e);
            }
          }

          // Update status to success
          setResults(prev => prev.map((r, i) => 
            i === index ? { ...r, status: 'success' as const, imageUrl } : r
          ));
          
          // Update overall progress
          setOverallProgress(prev => prev + (100 / initialResults.length));
        } else {
          throw new Error('Failed to generate image');
        }
      } catch (error) {
        console.error(`Error generating ${preset.name}:`, error);
        
        // Update status to error
        setResults(prev => prev.map((r, i) => 
          i === index ? { 
            ...r, 
            status: 'error' as const, 
            error: error instanceof Error ? error.message : 'Generation failed' 
          } : r
        ));
        
        // Still update progress
        setOverallProgress(prev => prev + (100 / initialResults.length));
      }
    });

    // Wait for all generations to complete
    await Promise.all(generationPromises);
    
    setIsGenerating(false);
    setOverallProgress(100);
    
    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status === 'error').length;
    
    if (successCount > 0) {
      toast.success(`Successfully generated ${successCount} variations!`);
    }
    if (errorCount > 0) {
      toast.error(`${errorCount} generation(s) failed`);
    }
  };

  const handleDownloadAll = () => {
    results.filter(r => r.status === 'success' && r.imageUrl).forEach((result, index) => {
      setTimeout(() => {
        const link = document.createElement('a');
        link.href = result.imageUrl!;
        link.download = `${result.presetName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }, index * 200); // Stagger downloads
    });
    toast.success("Downloading all images...");
  };

  const handleClose = () => {
    if (!isGenerating) {
      setResults([]);
      setSelectedPresets(new Set());
      setOverallProgress(0);
      onOpenChange(false);
    }
  };

  const totalCost = selectedPresets.size * 3; // 3 credits per generation
  const successfulGenerations = results.filter(r => r.status === 'success').length;

  const content = (
    <div className="space-y-6 py-4">
      {/* Selection Phase */}
      {results.length === 0 && (
        <>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Select Presets</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectAll}
              >
                {selectedPresets.size === GENERATION_PRESETS.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
            
            <ScrollArea className="h-[50vh] pr-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {allPresets.map(preset => (
                  <Card
                    key={preset.id}
                    className={`p-4 cursor-pointer transition-all ${
                      selectedPresets.has(preset.id) 
                        ? 'border-primary bg-primary/5' 
                        : 'hover:border-primary/50'
                    }`}
                    onClick={() => handlePresetToggle(preset.id)}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedPresets.has(preset.id)}
                        onCheckedChange={() => handlePresetToggle(preset.id)}
                        className="mt-1"
                      />
                      <div className="flex-1 space-y-2">
                        <div className="flex items-start gap-2">
                          <div className="flex-shrink-0 mt-0.5">
                            {preset.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm">{preset.name}</div>
                            <div className="text-xs text-muted-foreground line-clamp-2">
                              {preset.description}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1.5">
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
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </div>

          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div className="space-y-1">
              <div className="font-semibold">
                {selectedPresets.size} {selectedPresets.size === 1 ? 'Preset' : 'Presets'} Selected
              </div>
              <div className="text-sm text-muted-foreground">
                Total cost: {totalCost} credits
              </div>
            </div>
            <Button
              onClick={handleGenerate}
              disabled={selectedPresets.size === 0}
              size="lg"
            >
              <Wand2 className="w-4 h-4 mr-2" />
              Generate All
            </Button>
          </div>
        </>
      )}

      {/* Generation Phase */}
      {results.length > 0 && (
        <>
          {/* Overall Progress */}
          {isGenerating && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Overall Progress</span>
                <span className="text-muted-foreground">
                  {Math.round(overallProgress)}%
                </span>
              </div>
              <Progress value={overallProgress} className="w-full" />
            </div>
          )}

          {/* Results Grid */}
          <ScrollArea className="h-[60vh] pr-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {results.map((result) => (
                <Card key={result.presetId} className="overflow-hidden">
                  <div className="aspect-square relative bg-muted">
                    {result.status === 'pending' && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center space-y-2">
                          <div className="text-sm text-muted-foreground">Waiting...</div>
                        </div>
                      </div>
                    )}
                    
                    {result.status === 'generating' && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center space-y-3">
                          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                          <div className="text-sm font-medium">Generating...</div>
                        </div>
                      </div>
                    )}
                    
                    {result.status === 'success' && result.imageUrl && (
                      <img
                        src={result.imageUrl}
                        alt={result.presetName}
                        className="w-full h-full object-cover"
                      />
                    )}
                    
                    {result.status === 'error' && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center space-y-2 p-4">
                          <AlertCircle className="w-8 h-8 text-destructive mx-auto" />
                          <div className="text-sm font-medium">Failed</div>
                          <div className="text-xs text-muted-foreground">
                            {result.error || 'Generation failed'}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-sm">{result.presetName}</div>
                      {result.status === 'success' && (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      )}
                    </div>
                    
                    {result.status === 'success' && result.imageUrl && (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = result.imageUrl!;
                          link.download = `${result.presetName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.png`;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                          toast.success("Image downloaded!");
                        }}
                      >
                        <Download className="w-3 h-3 mr-2" />
                        Download
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>

          {/* Summary Actions */}
          {!isGenerating && successfulGenerations > 0 && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleClose}
              >
                Close
              </Button>
              <Button
                className="flex-1"
                onClick={handleDownloadAll}
              >
                <Download className="w-4 h-4 mr-2" />
                Download All ({successfulGenerations})
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={handleClose}>
        <DrawerContent className="max-h-[95dvh]">
          <DrawerHeader>
            <DrawerTitle className="flex items-center gap-2">
              <Wand2 className="w-5 h-5" />
              Batch Generation
            </DrawerTitle>
            <DrawerDescription>
              Generate multiple variations simultaneously with different presets
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-4 overflow-y-auto">
            {content}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5" />
            Batch Generation
          </DialogTitle>
          <DialogDescription>
            Generate multiple variations simultaneously with different presets
          </DialogDescription>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
};
