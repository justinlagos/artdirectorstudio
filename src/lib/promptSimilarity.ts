/**
 * Calculates the similarity between two strings using a normalized Levenshtein distance
 * Returns a value between 0 (completely different) and 1 (identical)
 */
export function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return 1;
  if (!s1 || !s2) return 0;
  
  const len1 = s1.length;
  const len2 = s2.length;
  const maxLen = Math.max(len1, len2);
  
  if (maxLen === 0) return 1;
  
  // Levenshtein distance calculation
  const matrix: number[][] = [];
  
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,     // deletion
        matrix[i][j - 1] + 1,     // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }
  
  const distance = matrix[len1][len2];
  return 1 - (distance / maxLen);
}

/**
 * Determines the continuation strength based on prompt similarity
 * Returns a value between 0.3 (high continuity) and 1.0 (fresh generation)
 */
export function calculateContinuationStrength(
  previousPrompt: string,
  newPrompt: string
): number {
  const similarity = calculateSimilarity(previousPrompt, newPrompt);
  const changeRatio = 1 - similarity;
  
  // Map change ratio to continuation strength
  if (changeRatio < 0.2) {
    // Minor edit - preserve 70% of context
    return 0.3;
  } else if (changeRatio < 0.5) {
    // Moderate edit - preserve 40% of context
    return 0.6;
  } else if (changeRatio < 0.8) {
    // Major edit - preserve 20% of context
    return 0.8;
  } else {
    // Drastic change - fresh generation
    return 1.0;
  }
}

/**
 * Categorizes the type of edit based on change ratio
 */
export function categorizeEdit(previousPrompt: string, newPrompt: string): 
  | 'minor' 
  | 'moderate' 
  | 'major' 
  | 'drastic' {
  const similarity = calculateSimilarity(previousPrompt, newPrompt);
  const changeRatio = 1 - similarity;
  
  if (changeRatio < 0.2) return 'minor';
  if (changeRatio < 0.5) return 'moderate';
  if (changeRatio < 0.8) return 'major';
  return 'drastic';
}

/**
 * Gets a human-readable description of continuation strength
 */
export function getContinuationDescription(strength: number): {
  label: string;
  description: string;
  colorClass: string;
} {
  if (strength <= 0.3) {
    return {
      label: 'High Continuity',
      description: 'Your image context will be strongly preserved',
      colorClass: 'text-blue-500'
    };
  } else if (strength <= 0.6) {
    return {
      label: 'Moderate Change',
      description: 'Balancing between context and new elements',
      colorClass: 'text-yellow-500'
    };
  } else if (strength <= 0.8) {
    return {
      label: 'Major Revision',
      description: 'Significant changes while maintaining some context',
      colorClass: 'text-orange-500'
    };
  } else {
    return {
      label: 'Fresh Generation',
      description: 'Creating a completely new image',
      colorClass: 'text-red-500'
    };
  }
}
