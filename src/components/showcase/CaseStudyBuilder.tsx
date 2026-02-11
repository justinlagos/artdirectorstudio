import { useState, useEffect } from 'react';
import { FileText, Image as ImageIcon, Save, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface CaseStudyBuilderProps {
  onSave?: (caseStudyId: string) => void;
}

export const CaseStudyBuilder = ({ onSave }: CaseStudyBuilderProps) => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [challenge, setChallenge] = useState('');
  const [solution, setSolution] = useState('');
  const [results, setResults] = useState('');
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [availableAssets, setAvailableAssets] = useState<Array<{ id: string; image_url: string; prompt?: string }>>([]);
  const [client, setClient] = useState('');
  const [industry, setIndustry] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      loadUserAssets();
    }
  }, [user]);

  const loadUserAssets = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('generated_assets')
        .select('id, image_url, prompt')
        .eq('user_id', user.id)
        .eq('type', 'image')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setAvailableAssets(data || []);
    } catch (error) {
      console.error('Error loading assets:', error);
    }
  };

  const handleSave = async () => {
    if (!user) {
      toast.error('Please sign in to create case studies');
      return;
    }

    if (!title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    if (selectedAssets.length < 3) {
      toast.error('Please select at least 3 assets for your case study');
      return;
    }

    setIsSaving(true);

    try {
      // Generate narrative with AI
      let narrative = {
        challenge: challenge || '',
        solution: solution || '',
        results: results || '',
      };

      // Use placeholder narrative when fields are empty (AI generation is done via Edge Functions)
      if (!challenge && !solution && !results) {
        narrative = {
          challenge: challenge || 'Design challenge description',
          solution: solution || 'Creative solution approach',
          results: results || 'Project outcomes and impact',
        };
      }

      const { data: caseStudy, error } = await supabase
        .from('case_studies')
        .insert({
          user_id: user.id,
          title: title.trim(),
          description: description.trim() || undefined,
          challenge: narrative.challenge,
          solution: narrative.solution,
          results: narrative.results,
          stages: selectedAssets.map((assetId, index) => ({
            order: index + 1,
            assetId,
            description: `Stage ${index + 1}`,
          })),
          tools_used: ['Art Director Studio'],
          client: client.trim() || undefined,
          industry: industry.trim() || undefined,
          published: false,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Case study created!');
      onSave?.(caseStudy.id);
    } catch (error) {
      console.error('Error saving case study:', error);
      toast.error('Failed to save case study');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleAsset = (assetId: string) => {
    setSelectedAssets(prev =>
      prev.includes(assetId)
        ? prev.filter(id => id !== assetId)
        : [...prev, assetId]
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Case Study</CardTitle>
        <CardDescription>
          Select assets and tell your creative story
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Title</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Summer Campaign 2024"
          />
        </div>

        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief overview of the project..."
            rows={3}
          />
        </div>

        <div className="space-y-4">
          <Label>Select Assets ({selectedAssets.length} selected)</Label>
          <div className="grid grid-cols-4 gap-2 max-h-[300px] overflow-y-auto p-2 border rounded-lg">
            {availableAssets.map((asset) => (
              <div
                key={asset.id}
                className={cn(
                  'relative aspect-square rounded border-2 cursor-pointer transition-all',
                  selectedAssets.includes(asset.id)
                    ? 'border-primary ring-2 ring-primary/20'
                    : 'border-border hover:border-primary/50'
                )}
                onClick={() => toggleAsset(asset.id)}
              >
                <img
                  src={asset.image_url}
                  alt="Asset"
                  className="w-full h-full object-cover rounded"
                />
                {selectedAssets.includes(asset.id) && (
                  <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full p-1">
                    <Badge className="h-5 w-5 flex items-center justify-center p-0">
                      {selectedAssets.indexOf(asset.id) + 1}
                    </Badge>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Client (Optional)</Label>
            <Input
              value={client}
              onChange={(e) => setClient(e.target.value)}
              placeholder="Client name"
            />
          </div>
          <div className="space-y-2">
            <Label>Industry (Optional)</Label>
            <Input
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              placeholder="Industry"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Challenge</Label>
          <Textarea
            value={challenge}
            onChange={(e) => setChallenge(e.target.value)}
            placeholder="What was the creative challenge?"
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label>Solution</Label>
          <Textarea
            value={solution}
            onChange={(e) => setSolution(e.target.value)}
            placeholder="How did you solve it?"
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label>Results</Label>
          <Textarea
            value={results}
            onChange={(e) => setResults(e.target.value)}
            placeholder="What were the outcomes?"
            rows={3}
          />
        </div>

        <Button
          onClick={handleSave}
          disabled={!title.trim() || selectedAssets.length < 3 || isSaving}
          className="w-full"
        >
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save Case Study'}
        </Button>
      </CardContent>
    </Card>
  );
};
