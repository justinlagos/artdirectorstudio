/**
 * Brand Kit Parser
 * 
 * Extracts brand information from logos and PDF guidelines
 */

import { parseEdgeFunctionError } from "@/lib/edgeFunctionErrors";

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
 * Process brand kit with AI via Edge Function.
 * Pass the Supabase client so the function can be invoked with auth.
 */
export async function processBrandKitWithAI(
  logoUrl: string,
  guidelinesText: string,
  supabaseClient: { functions: { invoke: (name: string, opts: { body: Record<string, unknown> }) => Promise<{ data?: unknown; error?: unknown }> } }
): Promise<ParsedBrandKit> {
  try {
    const colors = await extractColorsFromLogo(logoUrl);

    const { data, error } = await supabaseClient.functions.invoke('process-brand-kit', {
      body: { logoUrl, guidelinesText },
    });

    if (error) {
      const parsed = await parseEdgeFunctionError(error);
      const message =
        parsed.message && parsed.message !== 'Edge Function returned a non-2xx status code'
          ? parsed.message
          : 'AI processing failed';
      throw new Error(message);
    }
    const res = data as { typography?: BrandTypography; usageRules?: BrandUsageRules; error?: string } | null;
    if (res?.error) throw new Error(res.error);

    const parsed = await parseGuidelinesPDF(guidelinesText);
    return {
      colors,
      typography: { ...parsed.typography, ...(res?.typography || {}) },
      usageRules: { ...parsed.usageRules, ...(res?.usageRules || {}) },
    };
  } catch (error) {
    console.error('[brandKitParser] Error processing brand kit:', error);
    const colors = await extractColorsFromLogo(logoUrl).catch(() => []);
    const parsed = await parseGuidelinesPDF(guidelinesText);
    return { colors, ...parsed };
  }
}
