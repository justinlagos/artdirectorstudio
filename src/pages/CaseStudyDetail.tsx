import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, Eye, Calendar, Briefcase, Sparkles, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { cn } from '@/lib/utils';

interface CaseStudy {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  challenge?: string;
  solution?: string;
  results?: string;
  stages?: Array<{
    order: number;
    assetId: string;
    description: string;
    imageUrl?: string;
  }>;
  tools_used?: string[];
  client?: string;
  industry?: string;
  views: number;
  likes: number;
  created_at: string;
}

interface DesignerProfile {
  username: string;
  avatar_url?: string;
  bio?: string;
}

export const CaseStudyDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [caseStudy, setCaseStudy] = useState<CaseStudy | null>(null);
  const [designer, setDesigner] = useState<DesignerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [stageImages, setStageImages] = useState<Record<string, string>>({});

  useEffect(() => {
    if (id) {
      loadCaseStudy();
    }
  }, [id]);

  useEffect(() => {
    if (caseStudy) {
      // Increment view count
      supabase
        .from('case_studies')
        .update({ views: caseStudy.views + 1 })
        .eq('id', id)
        .then(() => {
          if (caseStudy) {
            setCaseStudy({ ...caseStudy, views: caseStudy.views + 1 });
          }
        });

      // Load designer profile
      supabase
        .from('designer_profiles')
        .select('username, avatar_url, bio')
        .eq('user_id', caseStudy.user_id)
        .single()
        .then(({ data }) => {
          if (data) setDesigner(data);
        });

      // Load stage images
      if (caseStudy.stages && caseStudy.stages.length > 0) {
        const assetIds = caseStudy.stages.map(s => s.assetId);
        supabase
          .from('generated_assets')
          .select('id, image_url')
          .in('id', assetIds)
          .then(({ data }) => {
            if (data) {
              const imageMap: Record<string, string> = {};
              data.forEach(asset => {
                imageMap[asset.id] = asset.image_url;
              });
              setStageImages(imageMap);
            }
          });
      }
    }
  }, [caseStudy]);

  const loadCaseStudy = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('case_studies')
        .select('*')
        .eq('id', id)
        .eq('published', true)
        .single();

      if (error) throw error;
      setCaseStudy(data);
    } catch (error) {
      console.error('Error loading case study:', error);
      toast.error('Case study not found');
      navigate('/discover');
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    if (!user) {
      toast.error('Please sign in to like case studies');
      return;
    }

    // TODO: Implement like functionality with database
    setLiked(!liked);
    toast.success(liked ? 'Unliked' : 'Liked');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading case study...</p>
      </div>
    );
  }

  if (!caseStudy) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-4xl font-bold mb-2">{caseStudy.title}</h1>
              {caseStudy.description && (
                <p className="text-xl text-muted-foreground">{caseStudy.description}</p>
              )}
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Eye className="h-4 w-4" />
                {caseStudy.views}
              </div>
              <Button
                variant={liked ? 'default' : 'outline'}
                size="sm"
                onClick={handleLike}
              >
                <Heart className={cn('h-4 w-4 mr-2', liked && 'fill-current')} />
                {caseStudy.likes}
              </Button>
            </div>
          </div>

          {/* Meta Info */}
          <div className="flex items-center gap-4 flex-wrap">
            {designer && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/designer/${designer.username}`)}
                className="gap-2"
              >
                {designer.avatar_url ? (
                  <img
                    src={designer.avatar_url}
                    alt={designer.username}
                    className="h-6 w-6 rounded-full"
                  />
                ) : (
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                    <Sparkles className="h-3 w-3 text-primary" />
                  </div>
                )}
                {designer.username}
              </Button>
            )}
            {caseStudy.industry && (
              <Badge variant="outline">{caseStudy.industry}</Badge>
            )}
            {caseStudy.client && (
              <Badge variant="secondary" className="gap-1">
                <Briefcase className="h-3 w-3" />
                {caseStudy.client}
              </Badge>
            )}
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {new Date(caseStudy.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Challenge */}
        {caseStudy.challenge && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                The Challenge
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {caseStudy.challenge}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Solution */}
        {caseStudy.solution && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                The Solution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {caseStudy.solution}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Process Stages */}
        {caseStudy.stages && caseStudy.stages.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Process Stages</CardTitle>
              <CardDescription>
                The creative journey from concept to final deliverable
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {caseStudy.stages
                .sort((a, b) => a.order - b.order)
                .map((stage, index) => (
                  <div key={stage.order} className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
                        {stage.order}
                      </div>
                      <h3 className="font-semibold text-lg">{stage.description}</h3>
                    </div>
                    {stageImages[stage.assetId] && (
                      <div className="ml-11">
                        <img
                          src={stageImages[stage.assetId]}
                          alt={`Stage ${stage.order}`}
                          className="rounded-lg border border-border w-full max-w-2xl"
                        />
                      </div>
                    )}
                    {index < caseStudy.stages!.length - 1 && (
                      <Separator className="ml-11" />
                    )}
                  </div>
                ))}
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {caseStudy.results && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {caseStudy.results}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Tools Used */}
        {caseStudy.tools_used && caseStudy.tools_used.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Tools Used</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {caseStudy.tools_used.map((tool) => (
                  <Badge key={tool} variant="secondary">
                    {tool}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* View Portfolio */}
        {designer && (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold mb-1">View More Work</h3>
                  <p className="text-sm text-muted-foreground">
                    See more projects by {designer.username}
                  </p>
                </div>
                <Button
                  onClick={() => navigate(`/designer/${designer.username}`)}
                  variant="outline"
                >
                  View Portfolio
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      <Footer />
    </div>
  );
};
