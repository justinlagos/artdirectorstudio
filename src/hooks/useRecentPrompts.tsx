import { useState, useEffect } from 'react';

const MAX_RECENT_PROMPTS = 5;
const STORAGE_KEY = 'recent-prompts';

export const useRecentPrompts = () => {
  const [recentPrompts, setRecentPrompts] = useState<string[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setRecentPrompts(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse recent prompts:', e);
      }
    }
  }, []);

  const addPrompt = (prompt: string) => {
    if (!prompt.trim()) return;
    
    setRecentPrompts(prev => {
      const filtered = prev.filter(p => p !== prompt);
      const updated = [prompt, ...filtered].slice(0, MAX_RECENT_PROMPTS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const clearPrompts = () => {
    setRecentPrompts([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  return { recentPrompts, addPrompt, clearPrompts };
};
