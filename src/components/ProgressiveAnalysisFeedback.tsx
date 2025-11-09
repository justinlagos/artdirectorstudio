import { useEffect, useState } from "react";
import { AnalysisSkeleton } from "@/components/skeletons/AnalysisSkeleton";

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
    }, 400);

    return () => clearTimeout(timer);
  }, [currentStep, onComplete]);

  return (
    <div className="max-w-4xl mx-auto py-8 space-y-8">
      <AnalysisSkeleton />
      
      <div className="space-y-2">
        {analysisSteps.map((step, index) => (
          <div
            key={index}
            className={`text-center text-base transition-all duration-500 ${
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
