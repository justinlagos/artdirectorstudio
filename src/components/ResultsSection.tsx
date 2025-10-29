import { Button } from "@/components/ui/button";
import { Copy, Download } from "lucide-react";
import { toast } from "sonner";
import { AnalysisResult } from "@/pages/Index";
import { BreakdownTable } from "./BreakdownTable";

interface ResultsSectionProps {
  result: AnalysisResult;
}

export const ResultsSection = ({ result }: ResultsSectionProps) => {
  const handleCopy = () => {
    navigator.clipboard.writeText(result.prompt);
    toast.success("Prompt copied to clipboard!");
  };

  const handleDownload = () => {
    const timestamp = new Date().toISOString().split('T')[0];
    const content = `Generated Prompt (${timestamp})\n\n${result.prompt}\n\n---\n\nDetailed Breakdown:\n\n${Object.entries(result.breakdown)
      .map(([key, value]) => `${key.replace(/_/g, ' ').toUpperCase()}: ${value}`)
      .join('\n\n')}`;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prompt-analysis-${timestamp}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success("Analysis downloaded!");
  };

  return (
    <section className="space-y-8 animate-fade-in">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Generated Prompt</h2>
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
            {result.prompt}
          </p>
        </div>
      </div>

      <BreakdownTable breakdown={result.breakdown} />
    </section>
  );
};
