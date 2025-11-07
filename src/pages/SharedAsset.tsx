import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, Eye, Calendar } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

interface SharedAssetData {
  id: string;
  view_count: number;
  created_at: string;
  asset: {
    id: string;
    type: string;
    image_url: string | null;
    prompt: string | null;
    analysis_data: any;
    created_at: string;
  };
}

const SharedAsset = () => {
  const { token, slug } = useParams<{ token?: string; slug?: string }>();
  const navigate = useNavigate();
  const [asset, setAsset] = useState<SharedAssetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const shareToken = token || slug;
    if (shareToken) {
      fetchSharedAsset(shareToken);
    }
  }, [token, slug]);

  const fetchSharedAsset = async (shareToken: string) => {
    try {
      // Increment view count
      await supabase.rpc("increment_share_view_count", { share_token_param: shareToken });

      // Fetch shared asset
      const { data, error } = await supabase
        .from("shared_assets")
        .select(`
          id,
          view_count,
          created_at,
          asset:generated_assets (
            id,
            type,
            image_url,
            prompt,
            analysis_data,
            created_at
          )
        `)
        .eq("share_token", shareToken)
        .single();

      if (error) throw error;

      if (!data) {
        toast.error("Shared asset not found");
        navigate("/");
        return;
      }

      setAsset(data as unknown as SharedAssetData);
    } catch (error) {
      console.error("Error fetching shared asset:", error);
      toast.error("Failed to load shared asset");
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPrompt = async () => {
    if (!asset?.asset.prompt) return;
    try {
      await navigator.clipboard.writeText(asset.asset.prompt);
      setCopied(true);
      toast.success("Prompt copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy prompt");
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { 
      month: "long", 
      day: "numeric", 
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto space-y-6">
            <Skeleton className="h-96 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!asset) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Helmet>
        <title>{asset.asset.prompt ? `${asset.asset.prompt.split(' ').slice(0, 12).join(' ')}...` : 'Shared Asset'} | ArtDirector Studio</title>
        <meta name="description" content="Created on ArtDirector Studio." />
        
        {/* OpenGraph Tags */}
        <meta property="og:title" content={asset.asset.prompt ? `${asset.asset.prompt.split(' ').slice(0, 12).join(' ')}...` : 'Shared Asset'} />
        <meta property="og:description" content="Created on ArtDirector Studio." />
        {asset.asset.image_url && <meta property="og:image" content={asset.asset.image_url} />}
        <meta property="og:type" content="article" />
        <meta property="og:url" content={window.location.href} />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={asset.asset.prompt ? `${asset.asset.prompt.split(' ').slice(0, 12).join(' ')}...` : 'Shared Asset'} />
        <meta name="twitter:description" content="Created on ArtDirector Studio." />
        {asset.asset.image_url && <meta name="twitter:image" content={asset.asset.image_url} />}
        
        {/* JSON-LD Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CreativeWork",
            "name": asset.asset.prompt || 'AI Generated Art',
            "description": "Created on ArtDirector Studio.",
            "image": asset.asset.image_url,
            "creator": {
              "@type": "Organization",
              "name": "ArtDirector Studio"
            },
            "dateCreated": asset.asset.created_at,
            "url": window.location.href
          })}
        </script>
      </Helmet>
      
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold">Shared {asset.asset.type}</h1>
                <Badge variant="secondary">{asset.asset.type}</Badge>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Eye className="h-4 w-4" />
                  <span>{asset.view_count} views</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>{formatDate(asset.asset.created_at)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Image */}
          {asset.asset.image_url && (
            <Card>
              <CardContent className="p-6">
                <img
                  src={asset.asset.image_url}
                  alt="Shared content"
                  className="w-full rounded-lg"
                />
              </CardContent>
            </Card>
          )}

          {/* Prompt */}
          {asset.asset.prompt && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Prompt</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCopyPrompt}
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Prompt
                      </>
                    )}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{asset.asset.prompt}</p>
              </CardContent>
            </Card>
          )}

          {/* Analysis Data */}
          {asset.asset.analysis_data && (
            <Card>
              <CardHeader>
                <CardTitle>Analysis Details</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-sm whitespace-pre-wrap">
                  {JSON.stringify(asset.asset.analysis_data, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}

          {/* CTA */}
          <Card className="bg-muted/50">
            <CardContent className="p-6 text-center space-y-4">
              <p className="text-muted-foreground">
                Want to create your own AI-powered content?
              </p>
              <Button onClick={() => navigate("/")} size="lg">
                Get Started for Free
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default SharedAsset;
