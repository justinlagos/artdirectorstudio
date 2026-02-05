import { useState, useEffect } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface PortfolioGridProps {
  userId: string;
  limit?: number;
}

export const PortfolioGrid = ({ userId, limit = 12 }: PortfolioGridProps) => {
  const [assets, setAssets] = useState<Array<{ id: string; image_url: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPortfolio();
  }, [userId]);

  const loadPortfolio = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('generated_assets')
        .select('id, image_url')
        .eq('user_id', userId)
        .eq('type', 'image')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      setAssets(data || []);
    } catch (error) {
      console.error('Error loading portfolio:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-muted-foreground">Loading portfolio...</p>
      </div>
    );
  }

  if (assets.length === 0) {
    return (
      <div className="text-center py-12">
        <ImageIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
        <p className="text-sm text-muted-foreground">No portfolio items yet</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {assets.map((asset) => (
        <Card key={asset.id} className="aspect-square overflow-hidden">
          <CardContent className="p-0">
            <img
              src={asset.image_url}
              alt="Portfolio item"
              className="w-full h-full object-cover"
            />
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
