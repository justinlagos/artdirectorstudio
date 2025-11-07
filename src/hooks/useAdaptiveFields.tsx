import { useMemo } from "react";
import { Analysis } from "@/pages/Index";

interface AdaptiveFields {
  showHumanFields: boolean;
  showEnvironmentFields: boolean;
  showProductFields: boolean;
  detectedType: 'human' | 'environment' | 'product' | 'mixed';
}

export const useAdaptiveFields = (analysis: Analysis): AdaptiveFields => {
  return useMemo(() => {
    const subject = analysis.subject_description.toLowerCase();
    const background = analysis.background_environment.toLowerCase();
    
    // Detect if human/person is present
    const hasHuman = 
      subject.includes('person') ||
      subject.includes('man') ||
      subject.includes('woman') ||
      subject.includes('child') ||
      subject.includes('human') ||
      subject.includes('portrait') ||
      subject.includes('face') ||
      subject.includes('figure');
    
    // Detect if environment/landscape is primary
    const hasEnvironment =
      subject.includes('landscape') ||
      subject.includes('scenery') ||
      subject.includes('nature') ||
      subject.includes('outdoor') ||
      background.includes('outdoor') ||
      background.includes('nature') ||
      background.includes('landscape') ||
      background.includes('sky') ||
      background.includes('forest') ||
      background.includes('mountain') ||
      background.includes('beach');
    
    // Detect if product/object is primary
    const hasProduct =
      subject.includes('product') ||
      subject.includes('object') ||
      subject.includes('item') ||
      subject.includes('device') ||
      subject.includes('bottle') ||
      subject.includes('package') ||
      subject.includes('furniture');
    
    let detectedType: 'human' | 'environment' | 'product' | 'mixed' = 'mixed';
    if (hasHuman && !hasEnvironment && !hasProduct) detectedType = 'human';
    else if (hasEnvironment && !hasHuman && !hasProduct) detectedType = 'environment';
    else if (hasProduct && !hasHuman && !hasEnvironment) detectedType = 'product';
    
    return {
      showHumanFields: hasHuman,
      showEnvironmentFields: hasEnvironment,
      showProductFields: hasProduct,
      detectedType
    };
  }, [analysis]);
};
