import { useState, useEffect } from 'react';
import { Palette, Trash2, Edit, Check } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface BrandKit {
  id: string;
  brand_name: string;
  logo_url: string;
  color_palette: Array<{ name: string; hex: string; type: string }>;
  enforce_colors: boolean;
  enforce_style: boolean;
  created_at: string;
}

interface BrandKitManagerProps {
  onSelect?: (brandKit: BrandKit) => void;
  selectedId?: string;
}

export const BrandKitManager = ({ onSelect, selectedId }: BrandKitManagerProps) => {
  const { user } = useAuth();
  const [brandKits, setBrandKits] = useState<BrandKit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadBrandKits();
    }
  }, [user]);

  const loadBrandKits = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('brand_kits')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBrandKits(data || []);
    } catch (error) {
      console.error('Error loading brand kits:', error);
      toast.error('Failed to load brand kits');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this brand kit?')) return;

    try {
      const { error } = await supabase
        .from('brand_kits')
        .delete()
        .eq('id', id)
        .eq('user_id', user?.id);

      if (error) throw error;
      toast.success('Brand kit deleted');
      loadBrandKits();
    } catch (error) {
      console.error('Error deleting brand kit:', error);
      toast.error('Failed to delete brand kit');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-muted-foreground">Loading brand kits...</p>
      </div>
    );
  }

  if (brandKits.length === 0) {
    return (
      <div className="text-center py-8">
        <Palette className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
        <p className="text-sm font-medium text-muted-foreground mb-2">No brand kits yet</p>
        <p className="text-xs text-muted-foreground">
          Upload a brand kit to get started
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {brandKits.map((kit) => (
        <Card
          key={kit.id}
          className={cn(
            'cursor-pointer transition-all hover:border-primary/50',
            selectedId === kit.id && 'border-primary border-2'
          )}
          onClick={() => onSelect?.(kit)}
        >
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              {/* Logo Preview */}
              {kit.logo_url && (
                <div className="shrink-0">
                  <img
                    src={kit.logo_url}
                    alt={kit.brand_name}
                    className="h-16 w-16 object-contain border border-border rounded"
                  />
                </div>
              )}

              {/* Brand Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      {kit.brand_name}
                      {selectedId === kit.id && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Created {new Date(kit.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(kit.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>

                {/* Color Palette Preview */}
                {kit.color_palette && kit.color_palette.length > 0 && (
                  <div className="flex items-center gap-2 mt-2">
                    {kit.color_palette.slice(0, 5).map((color, idx) => (
                      <div
                        key={idx}
                        className="h-6 w-6 rounded border border-border"
                        style={{ backgroundColor: color.hex }}
                        title={color.name}
                      />
                    ))}
                    {kit.color_palette.length > 5 && (
                      <span className="text-xs text-muted-foreground">
                        +{kit.color_palette.length - 5}
                      </span>
                    )}
                  </div>
                )}

                {/* Enforcement Badges */}
                <div className="flex items-center gap-2 mt-2">
                  {kit.enforce_colors && (
                    <Badge variant="outline" className="text-xs">
                      Colors
                    </Badge>
                  )}
                  {kit.enforce_style && (
                    <Badge variant="outline" className="text-xs">
                      Style
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
