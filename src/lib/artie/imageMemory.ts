/**
 * Enhanced Image Memory System for Artie Chat
 * Stores session-wide image context with metadata for intelligent referencing
 */

import { supabase } from "@/integrations/supabase/client";

export interface ImageMemoryItem {
  id: string;
  url: string;
  thumbnail?: string;
  type: 'generated' | 'uploaded' | 'edited' | 'upscaled' | 'blended';
  created_at: string;
  context_notes?: string;
  messageId?: string;
  source?: 'user' | 'artie' | 'link';
  name?: string;
  // Vision API metadata
  analysis?: {
    objects?: string[];
    lighting?: string;
    mood?: string;
    colorPalette?: string[];
    style?: string;
    composition?: string;
  };
  // Embedding vector for similarity search (future)
  embedding?: number[];
}

const MAX_MEMORY_ITEMS = 15;
const memoryStore: ImageMemoryItem[] = [];

/**
 * Initialize memory from sessionStorage
 */
export function initializeImageMemory(): ImageMemoryItem[] {
  const saved = sessionStorage.getItem('artie-image-memory');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        memoryStore.length = 0;
        memoryStore.push(...parsed.slice(0, MAX_MEMORY_ITEMS));
        return memoryStore;
      }
    } catch {
      // ignore parsing errors
    }
  }
  return memoryStore;
}

/**
 * Add image to memory
 */
export function addImageToMemory(image: Omit<ImageMemoryItem, 'id' | 'created_at'>): ImageMemoryItem {
  const id = crypto.randomUUID?.() || `img-${Date.now()}`;
  const item: ImageMemoryItem = {
    ...image,
    id,
    created_at: new Date().toISOString(),
  };

  // Remove oldest if at capacity
  if (memoryStore.length >= MAX_MEMORY_ITEMS) {
    memoryStore.shift();
  }

  memoryStore.push(item);
  persistMemory();
  return item;
}

/**
 * Get image by ID or URL
 */
export function getImageFromMemory(idOrUrl: string): ImageMemoryItem | undefined {
  return memoryStore.find(img => img.id === idOrUrl || img.url === idOrUrl);
}

/**
 * Get all images in memory
 */
export function getAllImagesFromMemory(): ImageMemoryItem[] {
  return [...memoryStore];
}

/**
 * Get recent images (last N)
 */
export function getRecentImages(count: number = 5): ImageMemoryItem[] {
  return memoryStore.slice(-count);
}

/**
 * Find image by reference (e.g., "image 1", "the other image")
 */
export function findImageByReference(reference: string, currentImageUrl?: string): ImageMemoryItem | undefined {
  const lowerRef = reference.toLowerCase();
  
  // Try numeric reference ("image 1", "first image", etc.)
  const numericMatch = lowerRef.match(/(\d+)/);
  if (numericMatch) {
    const index = parseInt(numericMatch[1]) - 1;
    if (index >= 0 && index < memoryStore.length) {
      return memoryStore[memoryStore.length - 1 - index];
    }
  }
  
  // Try positional references
  if (lowerRef.includes('first') || lowerRef.includes('original')) {
    return memoryStore[0];
  }
  if (lowerRef.includes('last') || lowerRef.includes('latest') || lowerRef.includes('most recent')) {
    return memoryStore[memoryStore.length - 1];
  }
  if (lowerRef.includes('previous') || lowerRef.includes('other')) {
    if (currentImageUrl) {
      const currentIndex = memoryStore.findIndex(img => img.url === currentImageUrl);
      if (currentIndex > 0) {
        return memoryStore[currentIndex - 1];
      }
    }
    return memoryStore.length > 1 ? memoryStore[memoryStore.length - 2] : undefined;
  }
  
  return undefined;
}

/**
 * Update image analysis/metadata
 */
export function updateImageAnalysis(imageUrl: string, analysis: ImageMemoryItem['analysis']): void {
  const item = memoryStore.find(img => img.url === imageUrl);
  if (item) {
    item.analysis = analysis;
    persistMemory();
  }
}

/**
 * Add context notes to image
 */
export function addContextNotes(imageUrl: string, notes: string): void {
  const item = memoryStore.find(img => img.url === imageUrl);
  if (item) {
    item.context_notes = notes;
    persistMemory();
  }
}

/**
 * Clear memory
 */
export function clearImageMemory(): void {
  memoryStore.length = 0;
  sessionStorage.removeItem('artie-image-memory');
}

/**
 * Persist memory to sessionStorage
 */
function persistMemory(): void {
  try {
    sessionStorage.setItem('artie-image-memory', JSON.stringify(memoryStore));
  } catch (error) {
    console.error('[ImageMemory] Failed to persist memory:', error);
  }
}

/**
 * Analyze image and store metadata (async, non-blocking)
 */
export async function analyzeAndStoreImage(imageUrl: string): Promise<void> {
  try {
    // Check if already analyzed
    const existing = memoryStore.find(img => img.url === imageUrl);
    if (existing?.analysis) {
      return; // Already analyzed
    }

    // Use Intelligence Framework to analyze
    const { analyzeImageDeep } = await import('@/lib/intelligence/imageUnderstanding');
    const understanding = await analyzeImageDeep(imageUrl);
    
    updateImageAnalysis(imageUrl, {
      objects: understanding.objects || [],
      lighting: understanding.lighting?.type || 'natural',
      mood: understanding.mood?.primary || 'neutral',
      colorPalette: understanding.colorPalette?.dominant || [],
      style: understanding.style?.category || 'realistic',
      composition: understanding.composition?.framing || 'medium',
    });
  } catch (error) {
    console.error('[ImageMemory] Failed to analyze image:', error);
    // Non-blocking - continue without analysis
  }
}

// Initialize on import
initializeImageMemory();

