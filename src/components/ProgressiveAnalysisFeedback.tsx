import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

interface ProgressiveAnalysisFeedbackProps {
  onComplete?: () => void;
}

const analysisSteps = [
  "Analyzing lighting...",
  "Detecting composition...",
  "Evaluating mood...",
  "Identifying color palette...",
  "Understanding style...",
  "Assessing texture...",
  "Finalizing analysis..."
];

export const ProgressiveAnalysisFeedback = ({ onComplete }: ProgressiveAnalysisFeedbackProps) => {
  const [visibleSteps, setVisibleSteps] = useState<number[]>([]);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (currentStep >= analysisSteps.length) {
      onComplete?.();
      return;
    }

    const timer = setTimeout(() => {
      setVisibleSteps(prev => [...prev, currentStep]);
      setCurrentStep(prev => prev + 1);
    }, 400); // Each step appears after 400ms

    return () => clearTimeout(timer);
  }, [currentStep, onComplete]);

  return (
    <div className="max-w-2xl mx-auto py-16 space-y-4">
      <div className="flex items-center justify-center mb-8">
        <div className="relative">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
          <div className="absolute inset-0 bg-primary/20 blur-xl animate-pulse" />
        </div>
      </div>
      
      <div className="space-y-2">
        {analysisSteps.map((step, index) => (
          <div
            key={index}
            className={`text-center text-lg transition-all duration-500 ${
              visibleSteps.includes(index)
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-4'
            } ${
              index === visibleSteps.length - 1
                ? 'text-foreground font-medium'
                : 'text-muted-foreground'
            }`}
          >
            {step}
          </div>
        ))}
      </div>
    </div>
  );
};
