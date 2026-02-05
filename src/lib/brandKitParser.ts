/**
 * Brand Kit Parser
 * 
 * Extracts brand information from logos and PDF guidelines
 */

export interface BrandColor {
  name: string;
  hex: string;
  type: 'primary' | 'secondary' | 'accent' | 'neutral';
}

export interface BrandTypography {
  primaryFont?: string;
  secondaryFont?: string;
  headingFont?: string;
  bodyFont?: string;
}

export interface BrandUsageRules {
  logoPlacement?: string[];
  colorUsage?: string[];
  imageryStyle?: string;
  tone?: string;
}

export interface ParsedBrandKit {
  colors: BrandColor[];
  typography: BrandTypography;
  usageRules: BrandUsageRules;
}

/**
 * Extract colors from logo image using Canvas API
 */
export async function extractColorsFromLogo(logoUrl: string): Promise<BrandColor[]> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imageData.data;
        
        // Extract dominant colors using simple color quantization
        const colorMap = new Map<string, number>();
        
        for (let i = 0; i < pixels.length; i += 4) {
          const r = pixels[i];
          const g = pixels[i + 1];
          const b = pixels[i + 2];
          const a = pixels[i + 3];
          
          // Skip transparent pixels
          if (a < 128) continue;
          
          // Quantize colors to reduce noise
          const qr = Math.floor(r / 32) * 32;
          const qg = Math.floor(g / 32) * 32;
          const qb = Math.floor(b / 32) * 32;
          const key = `${qr},${qg},${qb}`;
          
          colorMap.set(key, (colorMap.get(key) || 0) + 1);
        }
        
        // Get top 5 colors
        const sortedColors = Array.from(colorMap.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5);
        
        const colors: BrandColor[] = sortedColors.map(([rgb, count], index) => {
          const [r, g, b] = rgb.split(',').map(Number);
          const hex = `#${[r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')}`;
          
          return {
            name: index === 0 ? 'Primary' : index === 1 ? 'Secondary' : `Accent ${index - 1}`,
            hex,
            type: index === 0 ? 'primary' : index === 1 ? 'secondary' : 'accent',
          };
        });
        
        resolve(colors);
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => reject(new Error('Failed to load logo image'));
    img.src = logoUrl;
  });
}

/**
 * Parse PDF guidelines text (simplified - would use pdfjs-dist in production)
 */
export async function parseGuidelinesPDF(pdfText: string): Promise<{
  typography: BrandTypography;
  usageRules: BrandUsageRules;
}> {
  // Simple text extraction - in production would use pdfjs-dist
  const typography: BrandTypography = {};
  const usageRules: BrandUsageRules = {};
  
  // Extract font mentions
  const fontMatches = pdfText.match(/(?:font|typeface|typography)[\s:]+([A-Za-z\s]+)/gi);
  if (fontMatches && fontMatches.length > 0) {
    typography.primaryFont = fontMatches[0].replace(/font|typeface|typography/gi, '').trim();
  }
  
  // Extract color mentions
  const colorMatches = pdfText.match(/#([0-9A-Fa-f]{6})/g);
  if (colorMatches) {
    usageRules.colorUsage = colorMatches;
  }
  
  // Extract style keywords
  if (pdfText.toLowerCase().includes('minimal')) {
    usageRules.imageryStyle = 'minimal';
  } else if (pdfText.toLowerCase().includes('bold')) {
    usageRules.imageryStyle = 'bold';
  } else if (pdfText.toLowerCase().includes('elegant')) {
    usageRules.imageryStyle = 'elegant';
  }
  
  // Extract tone
  if (pdfText.toLowerCase().includes('professional')) {
    usageRules.tone = 'professional';
  } else if (pdfText.toLowerCase().includes('playful')) {
    usageRules.tone = 'playful';
  } else if (pdfText.toLowerCase().includes('modern')) {
    usageRules.tone = 'modern';
  }
  
  return { typography, usageRules };
}

/**
 * Process brand kit with AI to extract structured information
 */
export async function processBrandKitWithAI(
  logoUrl: string,
  guidelinesText: string,
  apiKey: string
): Promise<ParsedBrandKit> {
  try {
    // Extract colors from logo
    const colors = await extractColorsFromLogo(logoUrl);
    
    // Use AI to extract structured information from guidelines
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          {
            role: 'system',
            content: 'You are a brand guideline analyzer. Extract structured information from brand guidelines and return JSON.',
          },
          {
            role: 'user',
            content: `Analyze these brand guidelines and extract:
1. Typography rules (primary font, secondary font, heading font, body font)
2. Usage rules (logo placement, color usage, imagery style, tone)

Guidelines text:
${guidelinesText}

Return JSON in this format:
{
  "typography": {
    "primaryFont": "...",
    "secondaryFont": "...",
    "headingFont": "...",
    "bodyFont": "..."
  },
  "usageRules": {
    "logoPlacement": ["..."],
    "colorUsage": ["..."],
    "imageryStyle": "...",
    "tone": "..."
  }
}`,
          },
        ],
        response_format: { type: 'json_object' },
      }),
    });
    
    if (!response.ok) {
      throw new Error('AI processing failed');
    }
    
    const data = await response.json();
    const aiAnalysis = JSON.parse(data.choices?.[0]?.message?.content || '{}');
    
    // Parse guidelines text for fallback
    const parsed = await parseGuidelinesPDF(guidelinesText);
    
    return {
      colors,
      typography: {
        ...parsed.typography,
        ...aiAnalysis.typography,
      },
      usageRules: {
        ...parsed.usageRules,
        ...aiAnalysis.usageRules,
      },
    };
  } catch (error) {
    console.error('[brandKitParser] Error processing brand kit:', error);
    // Fallback to basic parsing
    const colors = await extractColorsFromLogo(logoUrl).catch(() => []);
    const parsed = await parseGuidelinesPDF(guidelinesText);
    return {
      colors,
      ...parsed,
    };
  }
}
