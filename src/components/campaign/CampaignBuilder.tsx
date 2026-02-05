import { useState } from 'react';
import { Wand2, Check, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { FormatSelector } from './FormatSelector';
import { CampaignResults } from './CampaignResults';
import { BrandKitSelector } from '@/components/brand/BrandKitSelector';

interface CampaignFormat {
  id: string;
  name: string;
  dimensions: string;
  selected: boolean;
  variations: number;
}

const FORMAT_TEMPLATES: CampaignFormat[] = [
  { id: 'instagram-post', name: 'Instagram Post', dimensions: '1080x1080', selected: false, variations: 1 },
  { id: 'instagram-story', name: 'Instagram Story', dimensions: '1080x1920', selected: false, variations: 1 },
  { id: 'instagram-reel', name: 'Instagram Reel Cover', dimensions: '1080x1920', selected: false, variations: 1 },
  { id: 'facebook-post', name: 'Facebook Post', dimensions: '1200x1200', selected: false, variations: 1 },
  { id: 'facebook-cover', name: 'Facebook Cover', dimensions: '1920x1080', selected: false, variations: 1 },
  { id: 'linkedin-post', name: 'LinkedIn Post', dimensions: '1200x1200', selected: false, variations: 1 },
  { id: 'linkedin-banner', name: 'LinkedIn Banner', dimensions: '1584x396', selected: false, variations: 1 },
  { id: 'twitter-post', name: 'Twitter Post', dimensions: '1200x675', selected: false, variations: 1 },
  { id: 'twitter-header', name: 'Twitter Header', dimensions: '1500x500', selected: false, variations: 1 },
];

export const CampaignBuilder = () => {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [campaignName, setCampaignName] = useState('');
  const [masterPrompt, setMasterPrompt] = useState('');
  const [masterImageUrl, setMasterImageUrl] = useState<string | null>(null);
  const [formats, setFormats] = useState<CampaignFormat[]>(FORMAT_TEMPLATES);
  const [selectedBrandKit, setSelectedBrandKit] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<any>(null);
  const [campaignId, setCampaignId] = useState<string | null>(null);

  const totalAssets = formats
    .filter(f => f.selected)
    .reduce((sum, f) => sum + f.variations, 0);

  const handleFormatToggle = (formatId: string) => {
    setFormats(prev =>
      prev.map(f => f.id === formatId ? { ...f, selected: !f.selected } : f)
    );
  };

  const handleVariationsChange = (formatId: string, variations: number) => {
    setFormats(prev =>
      prev.map(f => f.id === formatId ? { ...f, variations } : f)
    );
  };

  const handleGenerate = async () => {
    if (!user) {
      toast.error('Please sign in to generate campaigns');
      return;
    }

    if (!masterPrompt.trim()) {
      toast.error('Please enter a master concept');
      return;
    }

    const selectedFormats = formats.filter(f => f.selected);
    if (selectedFormats.length === 0) {
      toast.error('Please select at least one format');
      return;
    }

    setIsGenerating(true);
    setProgress(0);

    try {
      // Create campaign record
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .insert({
          user_id: user.id,
          name: campaignName || 'Untitled Campaign',
          config: {
            masterPrompt,
            masterImageUrl,
            formats: selectedFormats,
            brandKitId: selectedBrandKit?.id,
          },
          status: 'generating',
        })
        .select()
        .single();

      if (campaignError) throw campaignError;
      setCampaignId(campaign.id);

      // Call campaign generation function
      const { data: { session } } = await supabase.auth.getSession();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      
      const response = await fetch(`${supabaseUrl}/functions/v1/generate-campaign`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          campaignId: campaign.id,
          masterPrompt,
          masterImageUrl,
          formats: selectedFormats,
          brandKitId: selectedBrandKit?.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Campaign generation failed');
      }

      const campaignResults = await response.json();
      setResults(campaignResults);

      // Update campaign with results
      await supabase
        .from('campaigns')
        .update({
          results: campaignResults,
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', campaign.id);

      setStep(4); // Show results
      toast.success(`Campaign generated! ${totalAssets} assets created.`);
    } catch (error) {
      console.error('Campaign generation error:', error);
      toast.error('Failed to generate campaign. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 1: Master Concept</CardTitle>
            <CardDescription>
              Define the core concept that will be adapted for each format
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="campaign-name">Campaign Name (Optional)</Label>
              <Input
                id="campaign-name"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder="Summer Campaign 2024"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="master-prompt">Master Concept Prompt</Label>
              <Textarea
                id="master-prompt"
                value={masterPrompt}
                onChange={(e) => setMasterPrompt(e.target.value)}
                placeholder="Describe your campaign concept..."
                rows={5}
              />
            </div>
            <Button onClick={() => setStep(2)} disabled={!masterPrompt.trim()}>
              Next: Select Formats
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <FormatSelector
          formats={formats}
          onFormatToggle={handleFormatToggle}
          onVariationsChange={handleVariationsChange}
          onNext={() => setStep(3)}
          onBack={() => setStep(1)}
        />
      )}

      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 3: Brand Kit (Optional)</CardTitle>
            <CardDescription>
              Apply brand guidelines for consistency across all formats
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <BrandKitSelector onSelect={setSelectedBrandKit} />
            <div className="flex items-center justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(2)}>
                Back
              </Button>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {totalAssets} assets will be generated
                </Badge>
                <Button onClick={handleGenerate} disabled={isGenerating || totalAssets === 0}>
                  <Wand2 className="h-4 w-4 mr-2" />
                  Generate Campaign
                </Button>
              </div>
            </div>
            {isGenerating && (
              <div className="space-y-2">
                <Progress value={progress} />
                <p className="text-xs text-muted-foreground text-center">
                  Generating {totalAssets} assets...
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {step === 4 && results && (
        <CampaignResults
          campaignId={campaignId}
          results={results}
          campaignName={campaignName || 'Untitled Campaign'}
          onNewCampaign={() => {
            setStep(1);
            setCampaignName('');
            setMasterPrompt('');
            setFormats(FORMAT_TEMPLATES);
            setResults(null);
            setCampaignId(null);
          }}
        />
      )}
    </div>
  );
};
