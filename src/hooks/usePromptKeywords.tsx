import { useState, useEffect, useMemo } from "react";
import { Analysis } from "@/pages/Index";

export interface KeywordCategory {
  id: string;
  name: string;
  icon: string;
  keywords: string[];
}

interface UsePromptKeywordsReturn {
  categories: KeywordCategory[];
  selectedKeywords: string[];
  toggleKeyword: (keyword: string) => void;
  clearCategory: (categoryId: string) => void;
  clearAll: () => void;
  generatedPrompt: string;
  keywordCount: number;
}

export const usePromptKeywords = (analysis: Analysis): UsePromptKeywordsReturn => {
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);

  // Extract keywords from analysis
  const categories: KeywordCategory[] = useMemo(() => {
    const extractKeywords = (text: string, count: number = 8): string[] => {
      // Extract meaningful phrases (2-4 words) from text
      const sentences = text.split(/[.!?]+/);
      const keywords: string[] = [];
      
      sentences.forEach(sentence => {
        const words = sentence.trim().split(/\s+/);
        if (words.length >= 2 && words.length <= 4) {
          const phrase = words.join(' ');
          if (phrase.length > 5 && phrase.length < 50) {
            keywords.push(phrase);
          }
        }
      });
      
      return keywords.slice(0, count);
    };

    return [
      {
        id: "subject",
        name: "Subject",
        icon: "👤",
        keywords: extractKeywords(analysis.subject_description, 6)
      },
      {
        id: "lighting",
        name: "Lighting",
        icon: "💡",
        keywords: extractKeywords(analysis.lighting, 6)
      },
      {
        id: "colors",
        name: "Colors",
        icon: "🎨",
        keywords: extractKeywords(analysis.color_palette, 6)
      },
      {
        id: "style",
        name: "Style",
        icon: "✨",
        keywords: extractKeywords(analysis.design_style, 6)
      },
      {
        id: "composition",
        name: "Composition",
        icon: "📐",
        keywords: extractKeywords(analysis.camera_composition, 6)
      },
      {
        id: "mood",
        name: "Mood",
        icon: "🎭",
        keywords: extractKeywords(analysis.mood_emotion, 6)
      }
    ];
  }, [analysis]);

  // Generate prompt from selected keywords
  const generatedPrompt = useMemo(() => {
    if (selectedKeywords.length === 0) {
      return "Select keywords to build your prompt...";
    }

    // Group keywords by category for better prompt structure
    const keywordsByCategory: Record<string, string[]> = {};
    categories.forEach(cat => {
      keywordsByCategory[cat.id] = selectedKeywords.filter(kw => 
        cat.keywords.includes(kw)
      );
    });

    // Build structured prompt
    const parts: string[] = [];
    
    if (keywordsByCategory.subject?.length > 0) {
      parts.push(keywordsByCategory.subject.join(', '));
    }
    
    if (keywordsByCategory.composition?.length > 0) {
      parts.push(`with ${keywordsByCategory.composition.join(', ')}`);
    }
    
    if (keywordsByCategory.lighting?.length > 0) {
      parts.push(`featuring ${keywordsByCategory.lighting.join(', ')}`);
    }
    
    if (keywordsByCategory.colors?.length > 0) {
      parts.push(`in ${keywordsByCategory.colors.join(', ')}`);
    }
    
    if (keywordsByCategory.style?.length > 0) {
      parts.push(`styled as ${keywordsByCategory.style.join(', ')}`);
    }
    
    if (keywordsByCategory.mood?.length > 0) {
      parts.push(`conveying ${keywordsByCategory.mood.join(', ')}`);
    }

    return parts.join(', ');
  }, [selectedKeywords, categories]);

  const toggleKeyword = (keyword: string) => {
    setSelectedKeywords(prev => 
      prev.includes(keyword)
        ? prev.filter(k => k !== keyword)
        : [...prev, keyword]
    );
  };

  const clearCategory = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return;
    
    setSelectedKeywords(prev => 
      prev.filter(kw => !category.keywords.includes(kw))
    );
  };

  const clearAll = () => {
    setSelectedKeywords([]);
  };

  return {
    categories,
    selectedKeywords,
    toggleKeyword,
    clearCategory,
    clearAll,
    generatedPrompt,
    keywordCount: selectedKeywords.length
  };
};
