import { Button } from "@/components/ui/button";
import { Copy, Download } from "lucide-react";
import { toast } from "sonner";
import { AnalysisResult } from "@/pages/Index";
import { Separator } from "@/components/ui/separator";

interface ResultsSectionProps {
  result: AnalysisResult;
}

export const ResultsSection = ({ result }: ResultsSectionProps) => {
  const handleCopy = () => {
    navigator.clipboard.writeText(result.regeneration_prompt);
    toast.success("Regeneration prompt copied to clipboard!");
  };

  const handleDownload = () => {
    const timestamp = new Date().toISOString().split('T')[0];
    const content = `AI IMAGE PROMPT RECONSTRUCTION SHEET
Generated: ${timestamp}

═══════════════════════════════════════════════════════════════

1. IMAGE OVERVIEW
${result.overview}

═══════════════════════════════════════════════════════════════

2. SUBJECT DESCRIPTION
${result.subject}

═══════════════════════════════════════════════════════════════

3. CAMERA & COMPOSITION
${result.camera_composition}

═══════════════════════════════════════════════════════════════

4. LIGHTING
${result.lighting}

═══════════════════════════════════════════════════════════════

5. COLOR PALETTE
${result.color_palette}

═══════════════════════════════════════════════════════════════

6. DESIGN STYLE
${result.design_style}

═══════════════════════════════════════════════════════════════

7. TEXTURE & MATERIAL
${result.texture_material}

═══════════════════════════════════════════════════════════════

8. MOOD & EMOTION
${result.mood_emotion}

═══════════════════════════════════════════════════════════════

9. BACKGROUND & ENVIRONMENT
${result.background_environment}

═══════════════════════════════════════════════════════════════

10. ARTISTIC MEDIUM
${result.artistic_medium}

═══════════════════════════════════════════════════════════════

11. ART DIRECTION & INFLUENCE
${result.art_direction}

═══════════════════════════════════════════════════════════════

12. INTENDED USE
${result.intended_use}

═══════════════════════════════════════════════════════════════

13. FULL REGENERATION PROMPT

${result.regeneration_prompt}

═══════════════════════════════════════════════════════════════

Ready to use with: Midjourney, DALL·E, Firefly, Leonardo, Stable Diffusion`;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prompt-reconstruction-${timestamp}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success("Analysis sheet downloaded!");
  };

  const sections = [
    { title: "1. Image Overview", content: result.overview },
    { title: "2. Subject Description", content: result.subject },
    { title: "3. Camera & Composition", content: result.camera_composition },
    { title: "4. Lighting", content: result.lighting },
    { title: "5. Color Palette", content: result.color_palette },
    { title: "6. Design Style", content: result.design_style },
    { title: "7. Texture & Material", content: result.texture_material },
    { title: "8. Mood & Emotion", content: result.mood_emotion },
    { title: "9. Background & Environment", content: result.background_environment },
    { title: "10. Artistic Medium", content: result.artistic_medium },
    { title: "11. Art Direction & Influence", content: result.art_direction },
    { title: "12. Intended Use", content: result.intended_use },
  ];

  return (
    <section className="space-y-8 animate-fade-in">
      {/* Regeneration Prompt */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Full Regeneration Prompt</h2>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCopy}
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleDownload}
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          </div>
        </div>
        
        <div className="bg-card border border-border rounded-lg p-6 shadow-subtle">
          <p className="text-foreground leading-relaxed whitespace-pre-wrap">
            {result.regeneration_prompt}
          </p>
        </div>
      </div>

      <Separator />

      {/* Detailed Breakdown */}
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold">Comprehensive Analysis</h2>
        
        <div className="grid gap-6 md:grid-cols-2">
          {sections.map((section, index) => (
            <div 
              key={index}
              className="bg-card border border-border rounded-lg p-6 shadow-subtle hover:shadow-md transition-shadow"
            >
              <h3 className="text-lg font-semibold mb-3 text-foreground">
                {section.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed text-sm">
                {section.content}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
