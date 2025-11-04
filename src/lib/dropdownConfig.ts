export type ImageType = "portrait" | "product" | "environment" | "graphic" | "abstract" | "unknown";

export interface DropdownField {
  label: string;
  key: string;
  options: string[];
}

export const dropdownConfig: Record<ImageType, DropdownField[]> = {
  portrait: [
    { 
      label: "Gender", 
      key: "subject_gender",
      options: ["Male", "Female", "Non-binary", "Unspecified", "Custom"] 
    },
    { 
      label: "Ethnicity / Skin Tone", 
      key: "subject_ethnicity",
      options: ["Light", "Medium", "Tan", "Dark", "Custom"] 
    },
    { 
      label: "Age Group", 
      key: "age_group",
      options: ["Child", "Teen", "Young Adult", "Adult", "Senior", "Custom"] 
    },
    { 
      label: "Expression", 
      key: "expression",
      options: ["Smiling", "Serious", "Contemplative", "Joyful", "Neutral", "Custom"] 
    },
    { 
      label: "Lighting Style", 
      key: "lighting_type",
      options: ["Soft", "Studio", "Cinematic", "Natural", "Dramatic", "Custom"] 
    },
    { 
      label: "Camera Angle", 
      key: "camera_type",
      options: ["Eye Level", "Low Angle", "High Angle", "Close-up", "Medium Shot", "Custom"] 
    },
  ],
  product: [
    { 
      label: "Product Type", 
      key: "product_type",
      options: ["Packaging", "Tech Device", "Apparel", "Furniture", "Food & Beverage", "Cosmetics", "Custom"] 
    },
    { 
      label: "Material Finish", 
      key: "material_finish",
      options: ["Matte", "Glossy", "Metallic", "Fabric", "Wood", "Glass", "Plastic", "Custom"] 
    },
    { 
      label: "Lighting Environment", 
      key: "lighting_type",
      options: ["Studio", "Outdoor", "Ambient", "Dramatic", "Soft Box", "Custom"] 
    },
    { 
      label: "Background Type", 
      key: "background_type",
      options: ["White Seamless", "Colored Backdrop", "Lifestyle", "Gradient", "Textured", "Custom"] 
    },
    { 
      label: "Camera View", 
      key: "camera_type",
      options: ["Front View", "3/4 View", "Side View", "Top Down", "Angled", "Custom"] 
    },
    { 
      label: "Composition Style", 
      key: "art_style",
      options: ["Minimal", "Abundant", "Centered", "Lifestyle Context", "Custom"] 
    },
  ],
  environment: [
    { 
      label: "Scene Type", 
      key: "scene_type",
      options: ["Urban", "Natural", "Indoor", "Industrial", "Architectural", "Custom"] 
    },
    { 
      label: "Time of Day", 
      key: "time_of_day",
      options: ["Golden Hour", "Midday", "Blue Hour", "Night", "Overcast", "Custom"] 
    },
    { 
      label: "Weather Conditions", 
      key: "weather",
      options: ["Clear", "Cloudy", "Foggy", "Rainy", "Snowy", "Custom"] 
    },
    { 
      label: "Lighting Quality", 
      key: "lighting_type",
      options: ["Natural", "Ambient", "Dramatic", "Soft", "Harsh", "Custom"] 
    },
    { 
      label: "Perspective", 
      key: "camera_type",
      options: ["Wide Angle", "Normal", "Telephoto", "Aerial", "Ground Level", "Custom"] 
    },
    { 
      label: "Atmosphere", 
      key: "atmosphere",
      options: ["Serene", "Dramatic", "Moody", "Bright", "Mysterious", "Custom"] 
    },
  ],
  graphic: [
    { 
      label: "Design Type", 
      key: "design_type",
      options: ["Poster", "Logo", "Interface", "Typography", "Illustration", "Pattern", "Custom"] 
    },
    { 
      label: "Style", 
      key: "art_style",
      options: ["Minimal", "Bold", "Vintage", "Modern", "Retro", "Corporate", "Playful", "Custom"] 
    },
    { 
      label: "Color Scheme", 
      key: "color_scheme",
      options: ["Monochromatic", "Complementary", "Analogous", "Triadic", "Vibrant", "Muted", "Custom"] 
    },
    { 
      label: "Layout Style", 
      key: "layout_style",
      options: ["Balanced", "Asymmetric", "Grid-based", "Organic", "Structured", "Custom"] 
    },
    { 
      label: "Typography Weight", 
      key: "typography",
      options: ["Light", "Regular", "Bold", "Heavy", "Mixed", "Custom"] 
    },
    { 
      label: "Visual Complexity", 
      key: "complexity",
      options: ["Minimal", "Simple", "Moderate", "Complex", "Detailed", "Custom"] 
    },
  ],
  abstract: [
    { 
      label: "Color Temperature", 
      key: "color_temperature",
      options: ["Warm", "Cool", "Neutral", "Mixed", "Custom"] 
    },
    { 
      label: "Pattern Type", 
      key: "pattern_type",
      options: ["Geometric", "Organic", "Fluid", "Structured", "Random", "Custom"] 
    },
    { 
      label: "Pattern Density", 
      key: "pattern_density",
      options: ["Sparse", "Balanced", "Dense", "Clustered", "Custom"] 
    },
    { 
      label: "Movement Quality", 
      key: "movement",
      options: ["Static", "Flowing", "Dynamic", "Explosive", "Subtle", "Custom"] 
    },
    { 
      label: "Texture", 
      key: "texture",
      options: ["Smooth", "Rough", "Layered", "Gradient", "Varied", "Custom"] 
    },
    { 
      label: "Mood", 
      key: "mood",
      options: ["Calm", "Energetic", "Mysterious", "Playful", "Serious", "Custom"] 
    },
  ],
  unknown: [
    { 
      label: "Lighting Type", 
      key: "lighting_type",
      options: ["Soft", "Hard", "Natural", "Studio", "Dramatic", "Custom"] 
    },
    { 
      label: "Camera Type", 
      key: "camera_type",
      options: ["DSLR", "Phone", "Film", "Digital", "Custom"] 
    },
    { 
      label: "Art Style", 
      key: "art_style",
      options: ["Realistic", "Abstract", "Minimalist", "Detailed", "Custom"] 
    },
    { 
      label: "Background Type", 
      key: "background_type",
      options: ["Plain", "Textured", "Blurred", "Detailed", "Custom"] 
    },
  ],
};

export const imageTypeLabels: Record<ImageType, string> = {
  portrait: "Portrait",
  product: "Product",
  environment: "Environment / Landscape",
  graphic: "Graphic Design",
  abstract: "Abstract / Art",
  unknown: "General",
};
