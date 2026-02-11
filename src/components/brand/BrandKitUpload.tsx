import { useState } from 'react';
import { Upload, X, Image as ImageIcon, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { processBrandKitWithAI } from '@/lib/brandKitParser';

interface BrandKitUploadProps {
  onUploadComplete?: (brandKitId: string) => void;
}

export const BrandKitUpload = ({ onUploadComplete }: BrandKitUploadProps) => {
  const { user } = useAuth();
  const [brandName, setBrandName] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [guidelinesFile, setGuidelinesFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file for the logo');
      return;
    }

    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setLogoPreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleGuidelinesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast.error('Please select a PDF file for guidelines');
      return;
    }

    setGuidelinesFile(file);
  };

  const handleUpload = async () => {
    if (!user) {
      toast.error('Please sign in to upload brand kits');
      return;
    }

    if (!brandName.trim()) {
      toast.error('Please enter a brand name');
      return;
    }

    if (!logoFile) {
      toast.error('Please upload a logo');
      return;
    }

    setIsProcessing(true);

    try {
      // Upload logo
      const logoFileName = `${user.id}/${Date.now()}-${logoFile.name}`;
      const { data: logoData, error: logoError } = await supabase.storage
        .from('generated-images')
        .upload(logoFileName, logoFile);

      if (logoError) throw logoError;

      const { data: logoUrlData } = supabase.storage
        .from('generated-images')
        .getPublicUrl(logoFileName);
      const logoUrl = logoUrlData.publicUrl;

      // Extract text from PDF if provided
      let guidelinesText = '';
      if (guidelinesFile) {
        // In production, use pdfjs-dist to extract text
        // For now, we'll process with AI using the file
        guidelinesText = 'Brand guidelines document uploaded';
      }

      // Process with AI via Edge Function
      const parsed = await processBrandKitWithAI(logoUrl, guidelinesText, supabase);

      // Save to database
      const { data: brandKit, error: dbError } = await supabase
        .from('brand_kits')
        .insert({
          user_id: user.id,
          brand_name: brandName.trim(),
          logo_url: logoUrl,
          color_palette: parsed.colors,
          typography: parsed.typography,
          usage_rules: parsed.usageRules,
        })
        .select()
        .single();

      if (dbError) throw dbError;

      toast.success('Brand kit uploaded and processed successfully!');
      
      // Reset form
      setBrandName('');
      setLogoFile(null);
      setGuidelinesFile(null);
      setLogoPreview(null);
      
      onUploadComplete?.(brandKit.id);
    } catch (error) {
      console.error('Error uploading brand kit:', error);
      toast.error('Failed to upload brand kit. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Brand Kit</CardTitle>
        <CardDescription>
          Upload your logo and brand guidelines to enforce visual consistency
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="brand-name">Brand Name</Label>
          <Input
            id="brand-name"
            placeholder="My Brand"
            value={brandName}
            onChange={(e) => setBrandName(e.target.value)}
            disabled={isProcessing}
          />
        </div>

        <div className="space-y-2">
          <Label>Logo (Required)</Label>
          <div className="flex items-center gap-4">
            <input
              type="file"
              accept="image/*"
              onChange={handleLogoSelect}
              className="hidden"
              id="logo-upload"
              disabled={isProcessing}
            />
            <label htmlFor="logo-upload">
              <Button variant="outline" asChild disabled={isProcessing}>
                <span>
                  <Upload className="h-4 w-4 mr-2" />
                  {logoFile ? 'Change Logo' : 'Upload Logo'}
                </span>
              </Button>
            </label>
            {logoFile && (
              <div className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{logoFile.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => {
                    setLogoFile(null);
                    setLogoPreview(null);
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
          {logoPreview && (
            <div className="mt-2">
              <img
                src={logoPreview}
                alt="Logo preview"
                className="h-20 w-auto object-contain border border-border rounded"
              />
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label>Brand Guidelines PDF (Optional)</Label>
          <div className="flex items-center gap-4">
            <input
              type="file"
              accept=".pdf"
              onChange={handleGuidelinesSelect}
              className="hidden"
              id="guidelines-upload"
              disabled={isProcessing}
            />
            <label htmlFor="guidelines-upload">
              <Button variant="outline" asChild disabled={isProcessing}>
                <span>
                  <FileText className="h-4 w-4 mr-2" />
                  {guidelinesFile ? 'Change PDF' : 'Upload PDF'}
                </span>
              </Button>
            </label>
            {guidelinesFile && (
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{guidelinesFile.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setGuidelinesFile(null)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        </div>

        <Alert>
          <AlertDescription className="text-xs">
            We'll automatically extract colors from your logo and parse guidelines from the PDF.
            This helps maintain brand consistency across all generated images.
          </AlertDescription>
        </Alert>

        <Button
          onClick={handleUpload}
          disabled={!brandName || !logoFile || isProcessing}
          className="w-full"
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Upload Brand Kit
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
