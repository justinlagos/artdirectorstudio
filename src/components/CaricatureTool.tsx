import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Sparkles, Loader2, Check, Download, Maximize2, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCredits } from "@/hooks/useCredits";
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

interface CaricaturePreset {
  id: 'studio' | 'editorial' | 'toy' | 'sticker';
  name: string;
  description: string;
  icon: string;
  gradient: string;
}

const PRESETS: CaricaturePreset[] = [
  {
    id: 'studio',
    name: 'Studio',
    description: 'Professional polish with warm lighting',
    icon: '🎨',
    gradient: 'from-amber-500/20 to-orange-500/20',
  },
  {
    id: 'editorial',
    name: 'Editorial',
    description: 'Bold ink & watercolor style',
    icon: '✍️',
    gradient: 'from-blue-500/20 to-indigo-500/20',
  },
  {
    id: 'toy',
    name: '3D Toy',
    description: 'Kawaii vinyl figurine aesthetic',
    icon: '🧸',
    gradient: 'from-pink-500/20 to-purple-500/20',
  },
  {
    id: 'sticker',
    name: 'Sticker',
    description: 'Die-cut pop art vibes',
    icon: '⭐',
    gradient: 'from-green-500/20 to-emerald-500/20',
  },
];

interface GenerationResult {
  url: string;
  assetId: string;
  loading: boolean;
  error?: string;
}

export function CaricatureTool() {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<string>('studio');
  const [consent, setConsent] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState<GenerationResult[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { balance, isUnlimited, refetch: refetchCredits } = useCredits();

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
    setResults([]);
  };

  const generateCaricature = async (session: { access_token: string }): Promise<GenerationResult> => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/caricature-image`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '',
          },
          body: JSON.stringify({
            image: previewUrl,
            preset: selectedPreset,
            consent: true,
            idempotencyKey: `caricature-${Date.now()}`,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || data.reason || 'Generation failed');
      }

      return {
        url: data.image,
        assetId: data.assetId,
        loading: false,
      };
    } catch (error) {
      return {
        url: '',
        assetId: '',
        loading: false,
        error: error instanceof Error ? error.message : 'Generation failed',
      };
    }
  };

  const handleGenerate = async () => {
    if (!selectedFile || !previewUrl || !consent) {
      toast.error('Please upload an image and confirm consent');
      return;
    }

    // Authentication check first
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error('Please sign in to generate caricatures');
      return;
    }

    setIsGenerating(true);
    setResults([{ url: '', assetId: '', loading: true }]);

    try {
      const result = await generateCaricature(session);
      setResults([result]);

      if (!result.error) {
        toast.success('Caricature created!');
        refetchCredits();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      console.error('Caricature error:', error);
      toast.error('Generation failed. Please try again.');
      setResults([]);
    } finally {
      setIsGenerating(false);
    }
  };

  // Balance display: show the effective balance for informational purposes
  const balanceDisplay = isUnlimited ? 'Unlimited' : `${balance ?? 0} credits`;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 bg-gradient-to-b from-background via-surface-1 to-background py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Back nav */}
          <div className="flex items-center gap-2 mb-6">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground hover:text-foreground"
              onClick={() => navigate("/funbox")}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Fun Box
            </Button>
            <span className="text-muted-foreground/60">|</span>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => navigate("/")}
            >
              Studio
            </Button>
          </div>

          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-4 mb-12"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card/50 backdrop-blur-xl border border-border/50">
              <span className="text-2xl">🎨</span>
              <span className="text-sm font-medium">Caricature Studio</span>
            </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
            Transform portraits into
            <br />
            <span className="text-muted-foreground font-normal">stylized caricatures</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Upload a portrait and get a stylized caricature in your chosen style
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left: Upload */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="p-6 bg-card/50 backdrop-blur-xl border-border/50 shadow-subtle">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-1">Upload Portrait</h3>
                  <p className="text-sm text-muted-foreground">JPG or PNG, up to 15MB</p>
                </div>

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "relative aspect-square rounded-xl cursor-pointer transition-all duration-300",
                    "border-2 border-dashed overflow-hidden group",
                    previewUrl
                      ? "border-primary/50 hover:border-primary shadow-subtle"
                      : "border-border hover:border-primary/30 hover:bg-accent/20"
                  )}
                >
                  <AnimatePresence mode="wait">
                    {previewUrl ? (
                      <motion.img
                        key="preview"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        src={previewUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <motion.div
                        key="empty"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 flex flex-col items-center justify-center p-6"
                      >
                        <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                          <Upload className="w-8 h-8 text-primary" />
                        </div>
                        <p className="text-sm font-medium mb-1">Click to upload</p>
                        <p className="text-xs text-muted-foreground text-center">
                          Portrait photo works best
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {/* Consent */}
                <div className="flex items-start gap-3 p-4 rounded-xl bg-accent/20 border border-border/50">
                  <Checkbox
                    id="consent"
                    checked={consent}
                    onCheckedChange={(checked) => setConsent(checked === true)}
                    className="mt-0.5"
                  />
                  <Label htmlFor="consent" className="text-xs cursor-pointer leading-relaxed text-muted-foreground">
                    I confirm I have rights to transform this image for caricature generation
                  </Label>
                </div>

                {/* Credit Info & Generate */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Your balance</span>
                    <span className="font-semibold">{balanceDisplay}</span>
                  </div>
                  <Button
                    size="lg"
                    className="w-full h-12 rounded-xl font-medium shadow-subtle hover:shadow-medium transition-all"
                    onClick={handleGenerate}
                    disabled={!selectedFile || !consent || isGenerating}
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5 mr-2" />
                        Generate (10 credits)
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">
                    10 credits per caricature
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Middle: Style Selection */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="p-6 bg-card/50 backdrop-blur-xl border-border/50 shadow-subtle h-full">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-1">Choose Style</h3>
                  <p className="text-sm text-muted-foreground">Pick your caricature aesthetic</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {PRESETS.map((preset, idx) => (
                    <motion.button
                      key={preset.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.3 + idx * 0.05 }}
                      onClick={() => setSelectedPreset(preset.id)}
                      className={cn(
                        "relative p-4 rounded-xl text-left transition-all duration-300",
                        "border-2 overflow-hidden group",
                        selectedPreset === preset.id
                          ? "border-primary shadow-subtle scale-[1.02]"
                          : "border-border/50 hover:border-primary/30 hover:shadow-sm"
                      )}
                    >
                      {/* Gradient background */}
                      <div className={cn(
                        "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-300",
                        selectedPreset === preset.id ? "opacity-100" : "",
                        preset.gradient
                      )} />

                      <div className="relative z-10">
                        <div className="text-3xl mb-3">{preset.icon}</div>
                        <div className="font-semibold text-sm mb-1">{preset.name}</div>
                        <div className="text-xs text-muted-foreground leading-relaxed">
                          {preset.description}
                        </div>
                      </div>

                      {selectedPreset === preset.id && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center"
                        >
                          <Check className="w-4 h-4 text-primary-foreground" />
                        </motion.div>
                      )}
                    </motion.button>
                  ))}
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Right: Results */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-1"
          >
            <Card className="p-6 bg-card/50 backdrop-blur-xl border-border/50 shadow-subtle h-full">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-1">Result</h3>
                  <p className="text-sm text-muted-foreground">Your caricature</p>
                </div>

                <AnimatePresence mode="wait">
                  {results.length === 0 && !isGenerating ? (
                    <motion.div
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center justify-center py-12 text-center"
                    >
                      <div className="w-20 h-20 rounded-2xl bg-muted/30 border border-border/50 flex items-center justify-center mb-4">
                        <Sparkles className="w-10 h-10 text-muted-foreground/50" />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Your caricature will appear here
                      </p>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="results"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="space-y-4"
                    >
                      {results.map((result, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          className="space-y-2"
                        >
                          {result.error && (
                            <div className="flex items-center justify-end">
                              <span className="text-xs text-red-500">Failed</span>
                            </div>
                          )}

                          <div className="relative aspect-square rounded-xl overflow-hidden bg-muted/20 border border-border/50">
                            {result.loading ? (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                              </div>
                            ) : result.error ? (
                              <div className="absolute inset-0 flex items-center justify-center p-4 text-center">
                                <p className="text-xs text-muted-foreground">{result.error}</p>
                              </div>
                            ) : (
                              <>
                                <img
                                  src={result.url}
                                  alt="Caricature"
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent opacity-0 hover:opacity-100 transition-opacity flex items-end p-3 gap-2">
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    className="flex-1 h-8 text-xs"
                                    onClick={() => window.open(result.url, '_blank')}
                                  >
                                    <Maximize2 className="w-3 h-3 mr-1" />
                                    View
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    className="flex-1 h-8 text-xs"
                                    onClick={() => {
                                      const a = document.createElement('a');
                                      a.href = result.url;
                                      a.download = `caricature-${Date.now()}.png`;
                                      a.click();
                                    }}
                                  >
                                    <Download className="w-3 h-3 mr-1" />
                                    Save
                                  </Button>
                                </div>
                              </>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </Card>
          </motion.div>
        </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
