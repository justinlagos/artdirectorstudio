import { useState, useEffect } from 'react';
import { Palette, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { BrandKitManager } from './BrandKitManager';
import { useAuth } from '@/contexts/AuthContext';

interface BrandKit {
  id: string;
  brand_name: string;
  logo_url: string;
  color_palette: Array<{ name: string; hex: string; type: string }>;
}

interface BrandKitSelectorProps {
  onSelect?: (brandKit: BrandKit | null) => void;
}

export const BrandKitSelector = ({ onSelect }: BrandKitSelectorProps) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedKit, setSelectedKit] = useState<BrandKit | null>(null);

  const handleSelect = (kit: BrandKit) => {
    setSelectedKit(kit);
    onSelect?.(kit);
    setIsOpen(false);
  };

  const handleClear = () => {
    setSelectedKit(null);
    onSelect?.(null);
  };

  if (!user) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="outline" size="sm" className="w-full justify-between">
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            <span className="text-sm">
              {selectedKit ? `Brand: ${selectedKit.brand_name}` : 'Apply brand guidelines (optional)'}
            </span>
          </div>
          {isOpen ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2">
        <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-4">
          {selectedKit && (
            <div className="flex items-center justify-between p-2 bg-background rounded border border-border">
              <div className="flex items-center gap-2">
                {selectedKit.logo_url && (
                  <img
                    src={selectedKit.logo_url}
                    alt={selectedKit.brand_name}
                    className="h-8 w-8 object-contain"
                  />
                )}
                <span className="text-sm font-medium">{selectedKit.brand_name}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={handleClear}>
                Clear
              </Button>
            </div>
          )}
          <BrandKitManager onSelect={handleSelect} selectedId={selectedKit?.id} />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
