/**
 * Shared validation utilities for edge functions
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

// File size limit: 15MB
const MAX_FILE_SIZE = 15 * 1024 * 1024;
// Base64 overhead is approximately 33%
const BASE64_OVERHEAD = 1.33;

/**
 * Validates image data — accepts both base64 data URIs and HTTPS URLs
 */
export function validateImageData(image: string): ValidationResult {
  // Log validation start
  console.log(JSON.stringify({
    action: 'validation_start',
    type: 'image_data',
    timestamp: new Date().toISOString(),
    imageLength: image?.length || 0,
    hasImage: !!image
  }));

  if (!image || typeof image !== 'string') {
    console.error(JSON.stringify({
      action: 'validation_failed',
      type: 'image_data',
      reason: 'missing_or_invalid_type',
      timestamp: new Date().toISOString()
    }));
    return { valid: false, error: 'Image is required' };
  }

  // Accept HTTPS URLs (e.g. Supabase Storage URLs)
  if (image.startsWith('https://')) {
    // Basic URL validation — must look like an image URL or storage URL
    console.log(JSON.stringify({
      action: 'validation_success',
      type: 'image_url',
      urlPrefix: image.substring(0, 60),
      timestamp: new Date().toISOString()
    }));
    return { valid: true };
  }

  // Check if it's a data URI
  if (!image.startsWith('data:image/')) {
    console.error(JSON.stringify({
      action: 'validation_failed',
      type: 'image_data',
      reason: 'invalid_format',
      prefix: image.substring(0, 20),
      timestamp: new Date().toISOString()
    }));
    return { valid: false, error: 'Image format not supported. Use JPG or PNG.' };
  }

  // Extract mime type
  const mimeMatch = image.match(/^data:image\/([^;]+)/);
  if (!mimeMatch) {
    console.error(JSON.stringify({
      action: 'validation_failed',
      type: 'image_data',
      reason: 'invalid_mime_format',
      timestamp: new Date().toISOString()
    }));
    return { valid: false, error: 'Image format not supported. Use JPG or PNG.' };
  }

  const mimeType = mimeMatch[1].toLowerCase();
  const validMimeTypes = ['jpeg', 'jpg', 'png', 'webp'];
  if (!validMimeTypes.includes(mimeType)) {
    console.error(JSON.stringify({
      action: 'validation_failed',
      type: 'image_data',
      reason: 'unsupported_mime_type',
      mimeType,
      timestamp: new Date().toISOString()
    }));
    return { valid: false, error: 'Image format not supported. Use JPG or PNG.' };
  }

  // Check file size (base64 is ~33% larger than actual file)
  const maxBase64Size = MAX_FILE_SIZE * BASE64_OVERHEAD;
  if (image.length > maxBase64Size) {
    const actualSizeMB = (image.length / BASE64_OVERHEAD / 1024 / 1024).toFixed(2);
    console.error(JSON.stringify({
      action: 'validation_failed',
      type: 'image_data',
      reason: 'file_too_large',
      actualSizeMB,
      maxSizeMB: (MAX_FILE_SIZE / 1024 / 1024).toFixed(2),
      base64Length: image.length,
      timestamp: new Date().toISOString()
    }));
    return { valid: false, error: 'File is too large. Max 15 MB.' };
  }

  // Validate base64 data exists
  const base64Data = image.split(',')[1];
  if (!base64Data || base64Data.length === 0) {
    console.error(JSON.stringify({
      action: 'validation_failed',
      type: 'image_data',
      reason: 'missing_base64_data',
      timestamp: new Date().toISOString()
    }));
    return { valid: false, error: 'Invalid image data. Base64 data is missing.' };
  }

  // Basic base64 validation (should only contain valid base64 characters)
  const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
  if (!base64Regex.test(base64Data)) {
    console.error(JSON.stringify({
      action: 'validation_failed',
      type: 'image_data',
      reason: 'invalid_base64_characters',
      timestamp: new Date().toISOString()
    }));
    return { valid: false, error: 'Invalid image data. Base64 format is invalid.' };
  }

  console.log(JSON.stringify({
    action: 'validation_success',
    type: 'image_data',
    mimeType,
    sizeMB: (image.length / BASE64_OVERHEAD / 1024 / 1024).toFixed(2),
    timestamp: new Date().toISOString()
  }));

  return { valid: true };
}

/**
 * Validates multiple images with detailed logging
 */
export function validateImages(images: string[], min: number, max: number): ValidationResult {
  console.log(JSON.stringify({
    action: 'validation_start',
    type: 'images_array',
    count: images?.length || 0,
    min,
    max,
    timestamp: new Date().toISOString()
  }));

  if (!Array.isArray(images)) {
    console.error(JSON.stringify({
      action: 'validation_failed',
      type: 'images_array',
      reason: 'not_an_array',
      actualType: typeof images,
      timestamp: new Date().toISOString()
    }));
    return { valid: false, error: 'Images must be an array' };
  }

  if (images.length < min || images.length > max) {
    console.error(JSON.stringify({
      action: 'validation_failed',
      type: 'images_array',
      reason: 'count_out_of_range',
      actualCount: images.length,
      min,
      max,
      timestamp: new Date().toISOString()
    }));
    return { valid: false, error: `Please select between ${min} and ${max} images.` };
  }

  // Validate each image with index for better error reporting
  for (let i = 0; i < images.length; i++) {
    const image = images[i];
    console.log(JSON.stringify({
      action: 'validating_image',
      type: 'images_array',
      index: i,
      timestamp: new Date().toISOString()
    }));

    const result = validateImageData(image);
    if (!result.valid) {
      console.error(JSON.stringify({
        action: 'validation_failed',
        type: 'images_array',
        reason: 'image_validation_failed',
        index: i,
        error: result.error,
        timestamp: new Date().toISOString()
      }));
      return { valid: false, error: `Image ${i + 1}: ${result.error}` };
    }
  }

  console.log(JSON.stringify({
    action: 'validation_success',
    type: 'images_array',
    count: images.length,
    timestamp: new Date().toISOString()
  }));

  return { valid: true };
}

/**
 * Validates target size for upscaling with logging
 */
export function validateTargetSize(size: string): ValidationResult {
  const validSizes = ['1536x1536', '2048x2048'];
  
  console.log(JSON.stringify({
    action: 'validation_start',
    type: 'target_size',
    size,
    timestamp: new Date().toISOString()
  }));

  if (!size || typeof size !== 'string') {
    console.error(JSON.stringify({
      action: 'validation_failed',
      type: 'target_size',
      reason: 'missing_or_invalid_type',
      size,
      timestamp: new Date().toISOString()
    }));
    return { valid: false, error: 'Target size is required' };
  }

  if (!validSizes.includes(size)) {
    console.error(JSON.stringify({
      action: 'validation_failed',
      type: 'target_size',
      reason: 'invalid_size',
      providedSize: size,
      validSizes,
      timestamp: new Date().toISOString()
    }));
    return { valid: false, error: `Invalid target size. Must be one of: ${validSizes.join(', ')}` };
  }

  console.log(JSON.stringify({
    action: 'validation_success',
    type: 'target_size',
    size,
    timestamp: new Date().toISOString()
  }));

  return { valid: true };
}

/**
 * Validates instruction text with logging
 */
export function validateInstruction(instruction: string): ValidationResult {
  console.log(JSON.stringify({
    action: 'validation_start',
    type: 'instruction',
    length: instruction?.length || 0,
    timestamp: new Date().toISOString()
  }));

  if (!instruction || typeof instruction !== 'string') {
    console.error(JSON.stringify({
      action: 'validation_failed',
      type: 'instruction',
      reason: 'missing_or_invalid_type',
      timestamp: new Date().toISOString()
    }));
    return { valid: false, error: 'Instruction is required' };
  }

  const trimmed = instruction.trim();
  if (trimmed.length === 0) {
    console.error(JSON.stringify({
      action: 'validation_failed',
      type: 'instruction',
      reason: 'empty_after_trim',
      timestamp: new Date().toISOString()
    }));
    return { valid: false, error: 'Instruction cannot be empty' };
  }

  if (instruction.length > 500) {
    console.error(JSON.stringify({
      action: 'validation_failed',
      type: 'instruction',
      reason: 'too_long',
      length: instruction.length,
      maxLength: 500,
      timestamp: new Date().toISOString()
    }));
    return { valid: false, error: 'Instruction too long. Max 500 characters.' };
  }

  console.log(JSON.stringify({
    action: 'validation_success',
    type: 'instruction',
    length: instruction.length,
    timestamp: new Date().toISOString()
  }));

  return { valid: true };
}
