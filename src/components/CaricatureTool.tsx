import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Sparkles, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCredits } from "@/hooks/useCredits";

interface CaricaturePreset {
  id: 'studio' | 'editorial' | 'toy' | 'sticker';
  name: string;
  description: string;
  icon: string;
  example: string;
}

const PRESETS: CaricaturePreset[] = [
  {
    id: 'studio',
    name: 'Studio',
    description: 'Professional polish with warm lighting',
    icon: '🎨',
    example: 'Clean, gallery-ready caricature',
  },
  {
    id: 'editorial',
    name: 'Editorial',
    description: 'Bold ink & watercolor style',
    icon: '✍️',
    example: 'Expressive, satirical character',
  },
  {
    id: 'toy',
    name: '3D Toy',
    description: 'Kawaii vinyl figurine aesthetic',
    icon: '🧸',
    example: 'Cute designer toy style',
  },
  {
    id: 'sticker',
    name: 'Sticker',
    description: 'Die-cut pop art vibes',
    icon: '⭐',
    example: 'Vibrant, iconic cutout',
  },
];

export function CaricatureTool() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<string>('studio');
  const [consent, setConsent] = useState(false);
  const [provider, setProvider] = useState<'gemini' | 'openai'>('gemini');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<{ url: string; assetId: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { balance, refetch: refetchCredits } = useCredits();

  const creditCost = provider === 'gemini' ? 3 : 7;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      toast.error('Image must be less than 15MB');
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
    setResult(null);
  };

  const handleGenerate = async () => {
    if (!selectedFile || !previewUrl || !consent) {
      toast.error('Please upload an image and confirm consent');
      return;
    }

    if (balance < creditCost) {
      toast.error(`Insufficient credits. You need ${creditCost} credits.`);
      return;
    }

    setIsGenerating(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please sign in to generate caricatures');
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/caricature-image`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            image: previewUrl,
            preset: selectedPreset,
            provider,
            consent: true,
            idempotencyKey: `caricature-${Date.now()}`,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Generation failed');
      }

      setResult({ url: data.image, assetId: data.assetId });
      toast.success(data.message || 'Caricature created!');
      refetchCredits();
    } catch (error) {
      console.error('Caricature error:', error);
      toast.error(error instanceof Error ? error.message : 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold flex items-center justify-center gap-2">
          <span>🎨</span>
          <span>Caricature Studio</span>
        </h2>
        <p className="text-muted-foreground">
          Transform portraits into stylized caricatures with AI
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Left: Upload & Preview */}
        <Card className="p-6 space-y-4">
          <h3 className="font-semibold">1. Upload Portrait</h3>

          <div
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "relative aspect-square rounded-lg border-2 border-dashed cursor-pointer transition-colors",
              "hover:border-primary hover:bg-accent/50",
              previewUrl ? "border-primary" : "border-border"
            )}
          >
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Preview"
                className="w-full h-full object-cover rounded-lg"
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
                <Upload className="h-12 w-12 text-muted-foreground mb-3" />
                <p className="text-sm font-medium">Click to upload image</p>
                <p className="text-xs text-muted-foreground mt-1">
                  JPG, PNG up to 15MB
                </p>
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Result */}
          {result && (
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Generated Caricature:</h4>
              <img
                src={result.url}
                alt="Caricature result"
                className="w-full rounded-lg border border-border"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => window.open(result.url, '_blank')}
                >
                  View Full Size
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    const a = document.createElement('a');
                    a.href = result.url;
                    a.download = `caricature-${Date.now()}.png`;
                    a.click();
                  }}
                >
                  Download
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Right: Options & Generate */}
        <div className="space-y-6">
          {/* Presets */}
          <Card className="p-6 space-y-4">
            <h3 className="font-semibold">2. Choose Style</h3>
            <div className="grid grid-cols-2 gap-3">
              {PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => setSelectedPreset(preset.id)}
                  className={cn(
                    "p-4 rounded-lg border-2 text-left transition-all",
                    "hover:border-primary hover:shadow-sm",
                    selectedPreset === preset.id
                      ? "border-primary bg-accent"
                      : "border-border"
                  )}
                >
                  <div className="text-2xl mb-2">{preset.icon}</div>
                  <div className="font-semibold text-sm">{preset.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {preset.description}
                  </div>
                  {selectedPreset === preset.id && (
                    <Check className="h-4 w-4 text-primary absolute top-2 right-2" />
                  )}
                </button>
              ))}
            </div>
          </Card>

          {/* Provider Selection */}
          <Card className="p-6 space-y-4">
            <h3 className="font-semibold">3. AI Provider (Optional)</h3>
            <div className="flex gap-3">
              <Button
                variant={provider === 'gemini' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => setProvider('gemini')}
              >
                Gemini (3 credits)
              </Button>
              <Button
                variant={provider === 'openai' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => setProvider('openai')}
              >
                OpenAI (7 credits)
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Your balance: {balance} credits
            </p>
          </Card>

          {/* Consent */}
          <Card className="p-6 space-y-4">
            <div className="flex items-start gap-3">
              <Checkbox
                id="consent"
                checked={consent}
                onCheckedChange={(checked) => setConsent(checked === true)}
                className="mt-1"
              />
              <Label htmlFor="consent" className="text-sm cursor-pointer leading-relaxed">
                I confirm I have the rights to transform this image and use it for caricature generation
              </Label>
            </div>
          </Card>

          {/* Generate Button */}
          <Button
            size="lg"
            className="w-full"
            onClick={handleGenerate}
            disabled={!selectedFile || !consent || isGenerating || balance < creditCost}
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5 mr-2" />
                Generate Caricature ({creditCost} credits)
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
