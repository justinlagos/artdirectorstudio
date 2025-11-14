import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface Adjustments {
  brightness: number;
  contrast: number;
  saturation: number;
  hue: number;
  warmth: number;
  exposure: number;
  sharpness: number;
  vibrance: number;
  shadows: number;
  highlights: number;
  clarity: number;
}

interface AdjustmentsPanelProps {
  adjustments: Adjustments;
  onAdjustmentChange: (key: keyof Adjustments, value: number) => void;
  selectedPreset: string;
  onPresetChange: (preset: string) => void;
  presets: Array<{ name: string; adjustments: Partial<Adjustments> }>;
}

export const AdjustmentsPanel = ({
  adjustments,
  onAdjustmentChange,
  selectedPreset,
  onPresetChange,
  presets,
}: AdjustmentsPanelProps) => {
  return (
    <div className="space-y-6">
      {/* Quick Filters */}
      <div className="space-y-2">
        <Label>Quick Filters</Label>
        <Select value={selectedPreset} onValueChange={onPresetChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select a filter preset" />
          </SelectTrigger>
          <SelectContent>
            {presets.map(preset => (
              <SelectItem key={preset.name} value={preset.name}>
                {preset.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Adjustment Tabs */}
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="basic">Basic</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
          <TabsTrigger value="effects">Effects</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-6 mt-6">
          <div className="space-y-3">
            <div className="flex justify-between">
              <Label>Brightness</Label>
              <span className="text-sm text-muted-foreground">{adjustments.brightness}%</span>
            </div>
            <Slider
              value={[adjustments.brightness]}
              onValueChange={(val) => onAdjustmentChange('brightness', val[0])}
              min={0}
              max={200}
              step={1}
            />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between">
              <Label>Contrast</Label>
              <span className="text-sm text-muted-foreground">{adjustments.contrast}%</span>
            </div>
            <Slider
              value={[adjustments.contrast]}
              onValueChange={(val) => onAdjustmentChange('contrast', val[0])}
              min={0}
              max={200}
              step={1}
            />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between">
              <Label>Saturation</Label>
              <span className="text-sm text-muted-foreground">{adjustments.saturation}%</span>
            </div>
            <Slider
              value={[adjustments.saturation]}
              onValueChange={(val) => onAdjustmentChange('saturation', val[0])}
              min={0}
              max={200}
              step={1}
            />
          </div>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-6 mt-6">
          <div className="space-y-3">
            <div className="flex justify-between">
              <Label>Hue Shift</Label>
              <span className="text-sm text-muted-foreground">{adjustments.hue}°</span>
            </div>
            <Slider
              value={[adjustments.hue]}
              onValueChange={(val) => onAdjustmentChange('hue', val[0])}
              min={-180}
              max={180}
              step={1}
            />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between">
              <Label>Warmth</Label>
              <span className="text-sm text-muted-foreground">
                {adjustments.warmth > 0 ? `+${adjustments.warmth}` : adjustments.warmth}%
              </span>
            </div>
            <Slider
              value={[adjustments.warmth]}
              onValueChange={(val) => onAdjustmentChange('warmth', val[0])}
              min={-50}
              max={50}
              step={1}
            />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between">
              <Label>Exposure</Label>
              <span className="text-sm text-muted-foreground">
                {adjustments.exposure > 0 ? `+${adjustments.exposure}` : adjustments.exposure}%
              </span>
            </div>
            <Slider
              value={[adjustments.exposure]}
              onValueChange={(val) => onAdjustmentChange('exposure', val[0])}
              min={-50}
              max={50}
              step={1}
            />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between">
              <Label>Vibrance</Label>
              <span className="text-sm text-muted-foreground">{adjustments.vibrance}%</span>
            </div>
            <Slider
              value={[adjustments.vibrance]}
              onValueChange={(val) => onAdjustmentChange('vibrance', val[0])}
              min={0}
              max={200}
              step={1}
            />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between">
              <Label>Shadows</Label>
              <span className="text-sm text-muted-foreground">
                {adjustments.shadows > 0 ? `+${adjustments.shadows}` : adjustments.shadows}%
              </span>
            </div>
            <Slider
              value={[adjustments.shadows]}
              onValueChange={(val) => onAdjustmentChange('shadows', val[0])}
              min={-100}
              max={100}
              step={1}
            />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between">
              <Label>Highlights</Label>
              <span className="text-sm text-muted-foreground">
                {adjustments.highlights > 0 ? `+${adjustments.highlights}` : adjustments.highlights}%
              </span>
            </div>
            <Slider
              value={[adjustments.highlights]}
              onValueChange={(val) => onAdjustmentChange('highlights', val[0])}
              min={-100}
              max={100}
              step={1}
            />
          </div>
        </TabsContent>

        <TabsContent value="effects" className="space-y-6 mt-6">
          <div className="space-y-3">
            <div className="flex justify-between">
              <Label>Sharpness</Label>
              <span className="text-sm text-muted-foreground">
                {adjustments.sharpness > 0 ? `+${adjustments.sharpness}` : adjustments.sharpness}%
              </span>
            </div>
            <Slider
              value={[adjustments.sharpness]}
              onValueChange={(val) => onAdjustmentChange('sharpness', val[0])}
              min={-100}
              max={100}
              step={1}
            />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between">
              <Label>Clarity</Label>
              <span className="text-sm text-muted-foreground">
                {adjustments.clarity > 0 ? `+${adjustments.clarity}` : adjustments.clarity}%
              </span>
            </div>
            <Slider
              value={[adjustments.clarity]}
              onValueChange={(val) => onAdjustmentChange('clarity', val[0])}
              min={-100}
              max={100}
              step={1}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

