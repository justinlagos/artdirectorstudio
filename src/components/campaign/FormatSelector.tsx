import { Wand2, Check } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface CampaignFormat {
  id: string;
  name: string;
  dimensions: string;
  selected: boolean;
  variations: number;
}

interface FormatSelectorProps {
  formats: CampaignFormat[];
  onFormatToggle: (formatId: string) => void;
  onVariationsChange: (formatId: string, variations: number) => void;
  onNext: () => void;
  onBack: () => void;
}

export const FormatSelector = ({
  formats,
  onFormatToggle,
  onVariationsChange,
  onNext,
  onBack,
}: FormatSelectorProps) => {
  const selectedCount = formats.filter(f => f.selected).length;
  const totalAssets = formats
    .filter(f => f.selected)
    .reduce((sum, f) => sum + f.variations, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Step 2: Select Formats</CardTitle>
        <CardDescription>
          Choose which formats to generate. Each format can have multiple variations.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {formats.map((format) => (
            <div
              key={format.id}
              className={cn(
                'relative rounded-lg border-2 p-4 cursor-pointer transition-all',
                format.selected
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              )}
              onClick={() => onFormatToggle(format.id)}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="font-semibold text-sm">{format.name}</h4>
                  <p className="text-xs text-muted-foreground">{format.dimensions}</p>
                </div>
                {format.selected && (
                  <Check className="h-5 w-5 text-primary shrink-0" />
                )}
              </div>
              {format.selected && (
                <div className="mt-3 pt-3 border-t border-border">
                  <Label className="text-xs">Variations</Label>
                  <Input
                    type="number"
                    min={1}
                    max={5}
                    value={format.variations}
                    onChange={(e) => {
                      const val = Math.max(1, Math.min(5, parseInt(e.target.value) || 1));
                      onVariationsChange(format.id, val);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="mt-1 h-8 text-xs"
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {selectedCount} formats • {totalAssets} assets
            </Badge>
            <Button onClick={onNext} disabled={selectedCount === 0}>
              Next: Brand Kit
              <Wand2 className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
