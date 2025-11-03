import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";

export type TimeRange = 7 | 30 | 90;

interface CreativeMetrics {
  totalImages: number;
  averageIterations: number;
  mostProductiveDay: string;
  topStyles: Array<{ style: string; count: number; percentage: number }>;
  efficiencyScore: number;
  dailyActivity: Array<{ date: string; count: number }>;
  recommendations: string[];
  creditsUsed: number;
  creditsPerImage: number;
}

export const useCreativeIntelligence = (timeRange: TimeRange = 7) => {
  const [metrics, setMetrics] = useState<CreativeMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [cacheKey, setCacheKey] = useState<string>("");

  const cacheData = (key: string, data: CreativeMetrics) => {
    const cacheItem = {
      data,
      timestamp: Date.now(),
      timeRange,
    };
    localStorage.setItem(`creative_intel_${key}`, JSON.stringify(cacheItem));
  };

  const getCachedData = (key: string): CreativeMetrics | null => {
    const cached = localStorage.getItem(`creative_intel_${key}`);
    if (!cached) return null;
    
    const { data, timestamp, timeRange: cachedRange } = JSON.parse(cached);
    const isExpired = Date.now() - timestamp > 5 * 60 * 1000; // 5 min cache
    
    if (isExpired || cachedRange !== timeRange) {
      localStorage.removeItem(`creative_intel_${key}`);
      return null;
    }
    
    return data;
  };

  const extractStyles = (assets: any[]): Map<string, number> => {
    const styleMap = new Map<string, number>();
    
    assets.forEach(asset => {
      if (asset.prompt) {
        // Extract common style keywords from prompts
        const styleKeywords = [
          'realistic', 'abstract', 'minimalist', 'vintage', 'modern',
          'watercolor', 'oil painting', 'digital art', 'sketch', 'photographic',
          'illustration', 'anime', 'cartoon', 'cinematic', '3d render',
          'pop art', 'surreal', 'impressionist', 'noir', 'vibrant',
          'pastel', 'monochrome', 'gradient', 'geometric', 'organic'
        ];
        
        const prompt = asset.prompt.toLowerCase();
        styleKeywords.forEach(style => {
          if (prompt.includes(style)) {
            styleMap.set(style, (styleMap.get(style) || 0) + 1);
          }
        });
      }
      
      // Also check analysis_data for detected styles
      if (asset.analysis_data?.style) {
        const detectedStyle = asset.analysis_data.style.toLowerCase();
        styleMap.set(detectedStyle, (styleMap.get(detectedStyle) || 0) + 1);
      }
    });
    
    return styleMap;
  };

  const calculateEfficiencyScore = (
    imagesCount: number,
    creditsUsed: number,
    daysActive: number
  ): number => {
    if (daysActive === 0) return 0;
    const imagesPerDay = imagesCount / daysActive;
    const creditsPerImage = creditsUsed / (imagesCount || 1);
    
    // Score based on activity and efficiency (0-100)
    const activityScore = Math.min((imagesPerDay / 5) * 50, 50);
    const efficiencyScore = Math.max(50 - (creditsPerImage - 3) * 5, 0);
    
    return Math.round(activityScore + efficiencyScore);
  };

  const generateRecommendations = (
    totalImages: number,
    topStyles: Array<{ style: string; count: number }>,
    avgIterations: number,
    efficiencyScore: number,
    creditsPerImage: number
  ): string[] => {
    const recommendations: string[] = [];
    
    // Style-based recommendations
    if (topStyles.length > 0) {
      const dominantStyle = topStyles[0].style;
      recommendations.push(
        `Your go-to style is "${dominantStyle}". Try exploring similar styles like blending ${dominantStyle} with other aesthetics.`
      );
    }
    
    // Efficiency recommendations
    if (creditsPerImage > 5) {
      recommendations.push(
        "Try Batch Processing for similar images to save credits and time on repetitive edits."
      );
    }
    
    if (avgIterations < 2 && totalImages > 10) {
      recommendations.push(
        "Consider using the Upscale feature to enhance your favorites instead of generating multiple variations."
      );
    }
    
    // Activity-based recommendations
    if (efficiencyScore < 40) {
      recommendations.push(
        "Set a creative goal this week! Regular practice improves both speed and quality."
      );
    }
    
    if (totalImages < 5) {
      recommendations.push(
        "Experiment with different prompt styles. Try adding mood keywords like 'ethereal', 'dramatic', or 'serene'."
      );
    } else if (topStyles.length < 3) {
      recommendations.push(
        "Branch out! You've mastered your style—now try mixing in new artistic influences."
      );
    }
    
    // Credit optimization
    if (creditsPerImage < 4 && totalImages > 20) {
      recommendations.push(
        "Great efficiency! You're getting excellent results with optimal credit usage."
      );
    }
    
    return recommendations.slice(0, 3); // Return top 3 recommendations
  };

  const fetchMetrics = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const userCacheKey = `${user.id}_${timeRange}`;
      
      // Check cache first
      const cached = getCachedData(userCacheKey);
      if (cached) {
        setMetrics(cached);
        setLoading(false);
        return;
      }

      // Calculate date range
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - timeRange);

      // Fetch assets within time range
      const { data: assets } = await supabase
        .from("generated_assets")
        .select("*")
        .eq("user_id", user.id)
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: true });

      // Fetch credit transactions
      const { data: transactions } = await supabase
        .from("credit_transactions")
        .select("*")
        .eq("user_id", user.id)
        .gte("timestamp", startDate.toISOString())
        .lt("amount", 0); // Only deductions

      const totalImages = assets?.filter(a => a.type === "image").length || 0;
      const creditsUsed = Math.abs(
        transactions?.reduce((sum, t) => sum + t.amount, 0) || 0
      );
      const creditsPerImage = totalImages > 0 ? creditsUsed / totalImages : 0;

      // Extract styles
      const styleMap = extractStyles(assets || []);
      const sortedStyles = Array.from(styleMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([style, count]) => ({
          style,
          count,
          percentage: Math.round((count / totalImages) * 100),
        }));

      // Calculate daily activity
      const dayMap = new Map<string, number>();
      assets?.forEach(asset => {
        const day = new Date(asset.created_at).toLocaleDateString("en-US", { 
          weekday: "short" 
        });
        dayMap.set(day, (dayMap.get(day) || 0) + 1);
      });

      const mostProductiveDay = Array.from(dayMap.entries())
        .sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";

      // Daily activity for sparklines
      const dailyActivity = Array.from({ length: Math.min(timeRange, 30) }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (timeRange - i - 1));
        const dateStr = date.toISOString().split("T")[0];
        const count = assets?.filter(a => a.created_at.startsWith(dateStr)).length || 0;
        return {
          date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          count,
        };
      });

      // Calculate efficiency score
      const daysWithActivity = new Set(
        assets?.map(a => a.created_at.split("T")[0])
      ).size;
      
      const efficiencyScore = calculateEfficiencyScore(
        totalImages,
        creditsUsed,
        daysWithActivity
      );

      // Calculate average iterations (images per unique prompt)
      const promptMap = new Map<string, number>();
      assets?.forEach(asset => {
        if (asset.prompt) {
          const basePrompt = asset.prompt.toLowerCase().slice(0, 50);
          promptMap.set(basePrompt, (promptMap.get(basePrompt) || 0) + 1);
        }
      });
      const averageIterations = promptMap.size > 0 
        ? totalImages / promptMap.size 
        : 1;

      const recommendations = generateRecommendations(
        totalImages,
        sortedStyles,
        averageIterations,
        efficiencyScore,
        creditsPerImage
      );

      const metricsData: CreativeMetrics = {
        totalImages,
        averageIterations: Math.round(averageIterations * 10) / 10,
        mostProductiveDay,
        topStyles: sortedStyles,
        efficiencyScore,
        dailyActivity,
        recommendations,
        creditsUsed,
        creditsPerImage: Math.round(creditsPerImage * 10) / 10,
      };

      setMetrics(metricsData);
      cacheData(userCacheKey, metricsData);
      setCacheKey(userCacheKey);
    } catch (error) {
      console.error("Error fetching creative intelligence:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [timeRange]);

  return { metrics, loading, refetch: fetchMetrics };
};
