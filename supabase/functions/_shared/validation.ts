/**
 * Shared validation utilities for edge functions
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

// File size limit: 15MB
const MAX_FILE_SIZE = 15 * 1024 * 1024;

/**
 * Validates base64 image data
 */
export function validateImageData(image: string): ValidationResult {
  if (!image || typeof image !== 'string') {
    return { valid: false, error: 'Image is required' };
  }

  if (!image.startsWith('data:image/')) {
    return { valid: false, error: 'Image format not supported. Use JPG or PNG.' };
  }

  // Check file size (base64 is ~33% larger than actual file)
  if (image.length > MAX_FILE_SIZE * 1.4) {
    return { valid: false, error: 'File is too large. Max 15 MB.' };
  }

  return { valid: true };
}

/**
 * Validates multiple images
 */
export function validateImages(images: string[], min: number, max: number): ValidationResult {
  if (!Array.isArray(images)) {
    return { valid: false, error: 'Images must be an array' };
  }

  if (images.length < min || images.length > max) {
    return { valid: false, error: `Please select between ${min} and ${max} images.` };
  }

  for (const image of images) {
    const result = validateImageData(image);
    if (!result.valid) {
      return result;
    }
  }

  return { valid: true };
}

/**
 * Validates target size for upscaling
 */
export function validateTargetSize(size: string): ValidationResult {
  const validSizes = ['1536x1536', '2048x2048'];
  
  if (!size || !validSizes.includes(size)) {
    return { valid: false, error: 'Invalid target size' };
  }

  return { valid: true };
}

/**
 * Validates instruction text
 */
export function validateInstruction(instruction: string): ValidationResult {
  if (!instruction || typeof instruction !== 'string') {
    return { valid: false, error: 'Instruction is required' };
  }

  if (instruction.length > 500) {
    return { valid: false, error: 'Instruction too long. Max 500 characters.' };
  }

  return { valid: true };
}
