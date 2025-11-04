import { useState, useEffect } from "react";
import { X, Upload, Sparkles, Download, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const TUTORIAL_STEPS = [
  {
    title: "Welcome to ArtDirector Studio",
    description: "Learn how to reconstruct, refine, and reimagine your images in just a few steps.",
    icon: Sparkles,
  },
  {
    title: "1. Upload Your Image",
    description: "Drag and drop any image (PNG or JPG, up to 15MB) or click to browse. We'll analyze every detail.",
    icon: Upload,
  },
  {
    title: "2. Get AI Analysis",
    description: "Our AI examines composition, lighting, colors, style, and more—then generates a complete regeneration prompt.",
    icon: Sparkles,
  },
  {
    title: "3. Customize & Refine",
    description: "Edit specific aspects like gender, lighting type, or colors. Regenerate the prompt with your changes.",
    icon: Wand2,
  },
  {
    title: "4. Export & Use",
    description: "Download as TXT, PDF, or JSON. Use the prompt with Midjourney, DALL·E, Stable Diffusion, and more.",
    icon: Download,
  },
];

export const Tutorial = () => {
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem("artdirector_tutorial_seen");
    if (!hasSeenTutorial) {
      setOpen(true);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem("artdirector_tutorial_seen", "true");
    setOpen(false);
    setCurrentStep(0);
  };

  const handleNext = () => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const step = TUTORIAL_STEPS[currentStep];
  const StepIcon = step.icon;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <StepIcon className="w-5 h-5" />
            {step.title}
          </DialogTitle>
          <DialogDescription className="pt-4">
            {step.description}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex items-center justify-between pt-4">
          <div className="flex gap-1">
            {TUTORIAL_STEPS.map((_, index) => (
              <div
                key={index}
                className={`h-1.5 rounded-full transition-all ${
                  index === currentStep
                    ? "w-8 bg-primary"
                    : "w-1.5 bg-muted"
                }`}
              />
            ))}
          </div>
          
          <div className="flex gap-2">
            {currentStep > 0 && (
              <Button variant="outline" size="sm" onClick={handlePrev}>
                Previous
              </Button>
            )}
            <Button size="sm" onClick={handleNext}>
              {currentStep === TUTORIAL_STEPS.length - 1 ? "Get Started" : "Next"}
            </Button>
          </div>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-2 top-2"
          onClick={handleClose}
        >
          <X className="w-4 h-4" />
        </Button>
      </DialogContent>
    </Dialog>
  );
};