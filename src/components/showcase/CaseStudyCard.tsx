import { Eye, Heart, Calendar } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface CaseStudy {
  id: string;
  title: string;
  description?: string;
  challenge?: string;
  solution?: string;
  results?: string;
  stages?: Array<{ order: number; assetId: string; description: string }>;
  tools_used?: string[];
  client?: string;
  industry?: string;
  views: number;
  likes: number;
  created_at: string;
}

interface CaseStudyCardProps {
  caseStudy: CaseStudy;
  compact?: boolean;
}

export const CaseStudyCard = ({ caseStudy, compact = false }: CaseStudyCardProps) => {
  const navigate = useNavigate();

  const handleClick = () => {
    // Increment view count
    supabase
      .from('case_studies')
      .update({ views: caseStudy.views + 1 })
      .eq('id', caseStudy.id)
      .then(() => {
        navigate(`/case-study/${caseStudy.id}`);
      });
  };

  return (
    <Card
      className={cn(
        'cursor-pointer hover:border-primary/50 transition-colors',
        compact && 'h-full'
      )}
      onClick={handleClick}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle>{caseStudy.title}</CardTitle>
            {caseStudy.description && (
              <CardDescription className="mt-1">{caseStudy.description}</CardDescription>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {caseStudy.stages && caseStudy.stages.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {caseStudy.stages.slice(0, 3).map((stage) => (
              <div key={stage.order} className="aspect-square rounded border border-border bg-muted/20" />
            ))}
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {caseStudy.views}
            </span>
            <span className="flex items-center gap-1">
              <Heart className="h-3 w-3" />
              {caseStudy.likes}
            </span>
          </div>
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {new Date(caseStudy.created_at).toLocaleDateString()}
          </span>
        </div>

        {(caseStudy.industry || caseStudy.client) && (
          <div className="flex items-center gap-2">
            {caseStudy.industry && (
              <Badge variant="outline" className="text-xs">
                {caseStudy.industry}
              </Badge>
            )}
            {caseStudy.client && (
              <Badge variant="secondary" className="text-xs">
                {caseStudy.client}
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
