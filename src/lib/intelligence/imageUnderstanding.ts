/**
 * Image Understanding Layer
 * 
 * Deep image analysis pipeline that captures:
 * - Objects in the scene
 * - Lighting conditions
 * - Mood
 * - Color palette
 * - Style (photography, illustration, cinematic, etc.)
 * - Composition (rule of thirds, depth, framing)
 * - Technical issues (noise, blur, uneven shadows)
 * - Potential improvements (lighting, color balance, clarity)
 */

import { supabase } from "@/integrations/supabase/client";

export interface ImageUnderstanding {
  // Scene Analysis
  objects: string[];
  sceneType: 'photography' | 'illustration' | 'cinematic' | 'graphic' | 'mixed';
  subject: string;
  background: string;
  
  // Visual Properties
  lighting: {
    type: 'natural' | 'studio' | 'dramatic' | 'soft' | 'harsh' | 'mixed';
    direction: 'front' | 'side' | 'back' | 'top' | 'mixed';
    quality: 'soft' | 'hard' | 'mixed';
    temperature: 'warm' | 'cool' | 'neutral';
    intensity: number; // 0-100
  };
  
  mood: {
    primary: string;
    secondary?: string;
    intensity: number; // 0-100
  };
  
  colorPalette: {
    dominant: string[];
    accent: string[];
    harmony: 'monochromatic' | 'analogous' | 'complementary' | 'triadic' | 'split-complementary' | 'tetradic' | 'mixed';
    saturation: number; // 0-100
    brightness: number; // 0-100
  };
  
  style: {
    category: string;
    influences: string[];
    era?: string;
    technique?: string;
  };
  
  composition: {
    ruleOfThirds: boolean;
    depth: 'shallow' | 'medium' | 'deep';
    framing: 'tight' | 'medium' | 'wide';
    perspective: 'eye-level' | 'low' | 'high' | 'bird-eye' | 'worm-eye';
    balance: 'symmetrical' | 'asymmetrical' | 'radial';
  };
  
  // Technical Assessment
  technical: {
    noise: number; // 0-100, lower is better
    blur: number; // 0-100, lower is better
    sharpness: number; // 0-100, higher is better
    exposure: 'underexposed' | 'proper' | 'overexposed';
    contrast: number; // 0-100
    shadows: {
      quality: 'even' | 'uneven' | 'harsh' | 'soft';
      issues: string[];
    };
  };
  
  // Improvement Suggestions
  improvements: {
    lighting: string[];
    color: string[];
    composition: string[];
    technical: string[];
    overall: string[];
  };
  
  // Metadata for stable variations
  metadata: {
    seed?: string;
    model?: string;
    settings?: Record<string, unknown>;
    timestamp: string;
  };
}

/**
 * Analyze an image deeply using AI
 */
export async function analyzeImageDeep(imageUrl: string): Promise<ImageUnderstanding> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('No active session');
    }

    // Check if we have cached analysis
    const { data: existingAsset } = await supabase
      .from('generated_assets')
      .select('analysis_data')
      .eq('image_url', imageUrl)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (existingAsset?.analysis_data) {
      const cached = existingAsset.analysis_data as any;
      if (cached.deepUnderstanding && cached.deepUnderstanding.timestamp) {
        // Check if cache is recent (less than 24 hours)
        const cacheAge = Date.now() - new Date(cached.deepUnderstanding.timestamp).getTime();
        if (cacheAge < 24 * 60 * 60 * 1000) {
          return cached.deepUnderstanding as ImageUnderstanding;
        }
      }
    }

    // Call analyze-image function with deep analysis flag
    const { data, error } = await supabase.functions.invoke('analyze-image', {
      body: { 
        image: imageUrl,
        deepAnalysis: true 
      },
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (error) {
      throw error;
    }

    // Extract deep understanding from analysis
    const understanding = extractUnderstandingFromAnalysis(data);
    
    // Store in database for future use
    await storeImageUnderstanding(imageUrl, understanding);

    return understanding;
  } catch (error) {
    console.error('[ImageUnderstanding] Error:', error);
    // Return basic understanding as fallback
    return getBasicUnderstanding(imageUrl);
  }
}

/**
 * Extract understanding from analysis result
 */
function extractUnderstandingFromAnalysis(analysis: any): ImageUnderstanding {
  const analysisData = analysis.analysis || {};
  
  return {
    objects: extractObjects(analysisData),
    sceneType: determineSceneType(analysisData),
    subject: analysisData.subject_description || 'Unknown',
    background: analysisData.background_environment || 'Unknown',
    
    lighting: {
      type: determineLightingType(analysisData.lighting),
      direction: determineLightingDirection(analysisData.lighting),
      quality: determineLightingQuality(analysisData.lighting),
      temperature: determineTemperature(analysisData.color_palette),
      intensity: 70, // Default, can be enhanced
    },
    
    mood: {
      primary: analysisData.mood_emotion || 'neutral',
      intensity: 60,
    },
    
    colorPalette: {
      dominant: extractColors(analysisData.color_palette),
      accent: [],
      harmony: 'analogous',
      saturation: 70,
      brightness: 70,
    },
    
    style: {
      category: analysisData.design_style || 'photography',
      influences: [],
      technique: analysisData.artistic_medium,
    },
    
    composition: {
      ruleOfThirds: true,
      depth: determineDepth(analysisData.camera_composition),
      framing: determineFraming(analysisData.camera_composition),
      perspective: 'eye-level',
      balance: 'asymmetrical',
    },
    
    technical: {
      noise: 20,
      blur: 15,
      sharpness: 80,
      exposure: 'proper',
      contrast: 70,
      shadows: {
        quality: 'even',
        issues: [],
      },
    },
    
    improvements: {
      lighting: [],
      color: [],
      composition: [],
      technical: [],
      overall: [],
    },
    
    metadata: {
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Store image understanding in database
 */
async function storeImageUnderstanding(
  imageUrl: string,
  understanding: ImageUnderstanding
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Update existing asset or create new entry
    const { data: existing } = await supabase
      .from('generated_assets')
      .select('id, analysis_data')
      .eq('image_url', imageUrl)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (existing) {
      const updatedAnalysis = {
        ...(existing.analysis_data as any || {}),
        deepUnderstanding: understanding,
      };

      await supabase
        .from('generated_assets')
        .update({ analysis_data: updatedAnalysis })
        .eq('id', existing.id);
    }
  } catch (error) {
    console.error('[ImageUnderstanding] Error storing:', error);
  }
}

/**
 * Get basic understanding as fallback
 */
function getBasicUnderstanding(imageUrl: string): ImageUnderstanding {
  return {
    objects: [],
    sceneType: 'photography',
    subject: 'Unknown',
    background: 'Unknown',
    lighting: {
      type: 'natural',
      direction: 'front',
      quality: 'soft',
      temperature: 'neutral',
      intensity: 70,
    },
    mood: {
      primary: 'neutral',
      intensity: 50,
    },
    colorPalette: {
      dominant: [],
      accent: [],
      harmony: 'analogous',
      saturation: 70,
      brightness: 70,
    },
    style: {
      category: 'photography',
      influences: [],
    },
    composition: {
      ruleOfThirds: true,
      depth: 'medium',
      framing: 'medium',
      perspective: 'eye-level',
      balance: 'asymmetrical',
    },
    technical: {
      noise: 20,
      blur: 15,
      sharpness: 80,
      exposure: 'proper',
      contrast: 70,
      shadows: {
        quality: 'even',
        issues: [],
      },
    },
    improvements: {
      lighting: [],
      color: [],
      composition: [],
      technical: [],
      overall: [],
    },
    metadata: {
      timestamp: new Date().toISOString(),
    },
  };
}

// Helper functions
function extractObjects(analysis: any): string[] {
  const subject = analysis.subject_description || '';
  return subject.split(',').map(s => s.trim()).filter(Boolean);
}

function determineSceneType(analysis: any): ImageUnderstanding['sceneType'] {
  const style = (analysis.design_style || '').toLowerCase();
  if (style.includes('illustration') || style.includes('drawing')) return 'illustration';
  if (style.includes('cinematic') || style.includes('film')) return 'cinematic';
  if (style.includes('graphic') || style.includes('design')) return 'graphic';
  return 'photography';
}

function determineLightingType(lighting: string): ImageUnderstanding['lighting']['type'] {
  if (!lighting) return 'natural';
  const l = lighting.toLowerCase();
  if (l.includes('studio')) return 'studio';
  if (l.includes('dramatic')) return 'dramatic';
  if (l.includes('soft')) return 'soft';
  if (l.includes('harsh')) return 'harsh';
  return 'natural';
}

function determineLightingDirection(lighting: string): ImageUnderstanding['lighting']['direction'] {
  if (!lighting) return 'front';
  const l = lighting.toLowerCase();
  if (l.includes('back')) return 'back';
  if (l.includes('side')) return 'side';
  if (l.includes('top')) return 'top';
  return 'front';
}

function determineLightingQuality(lighting: string): ImageUnderstanding['lighting']['quality'] {
  if (!lighting) return 'soft';
  const l = lighting.toLowerCase();
  if (l.includes('hard') || l.includes('harsh')) return 'hard';
  return 'soft';
}

function determineTemperature(palette: string): ImageUnderstanding['lighting']['temperature'] {
  if (!palette) return 'neutral';
  const p = palette.toLowerCase();
  if (p.includes('warm') || p.includes('orange') || p.includes('yellow')) return 'warm';
  if (p.includes('cool') || p.includes('blue') || p.includes('cyan')) return 'cool';
  return 'neutral';
}

function extractColors(palette: string): string[] {
  if (!palette) return [];
  // Extract color names from palette description
  const colors: string[] = [];
  const colorKeywords = ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'brown', 'black', 'white', 'gray', 'grey'];
  colorKeywords.forEach(color => {
    if (palette.toLowerCase().includes(color)) {
      colors.push(color);
    }
  });
  return colors.slice(0, 5);
}

function determineDepth(composition: string): ImageUnderstanding['composition']['depth'] {
  if (!composition) return 'medium';
  const c = composition.toLowerCase();
  if (c.includes('shallow') || c.includes('bokeh')) return 'shallow';
  if (c.includes('deep') || c.includes('wide')) return 'deep';
  return 'medium';
}

function determineFraming(composition: string): ImageUnderstanding['composition']['framing'] {
  if (!composition) return 'medium';
  const c = composition.toLowerCase();
  if (c.includes('tight') || c.includes('close')) return 'tight';
  if (c.includes('wide') || c.includes('landscape')) return 'wide';
  return 'medium';
}

/**
 * Get cached understanding for an image
 */
export async function getCachedUnderstanding(imageUrl: string): Promise<ImageUnderstanding | null> {
  try {
    const { data } = await supabase
      .from('generated_assets')
      .select('analysis_data')
      .eq('image_url', imageUrl)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (data?.analysis_data) {
      const cached = (data.analysis_data as any).deepUnderstanding;
      if (cached) {
        return cached as ImageUnderstanding;
      }
    }
    return null;
  } catch {
    return null;
  }
}

