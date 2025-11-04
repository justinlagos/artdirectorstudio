/**
 * API Configuration
 * Single source of truth for all API endpoints and configuration
 */

import { getEnvironment } from './environmentValidator';

const env = getEnvironment();

// Base URLs
export const SUPABASE_URL = env.VITE_SUPABASE_URL;
export const SUPABASE_PROJECT_ID = env.VITE_SUPABASE_PROJECT_ID;

// Supabase Edge Function URLs
const EDGE_FUNCTION_BASE = `${SUPABASE_URL}/functions/v1`;

export const API_ENDPOINTS = {
  // Edge Functions
  GENERATE_IMAGE: `${EDGE_FUNCTION_BASE}/generate-image`,
  ANALYZE_IMAGE: `${EDGE_FUNCTION_BASE}/analyze-image`,
  BLEND_IMAGES: `${EDGE_FUNCTION_BASE}/blend-images`,
  UPSCALE_IMAGE: `${EDGE_FUNCTION_BASE}/upscale-image`,
  DEDUCT_CREDITS: `${EDGE_FUNCTION_BASE}/deduct-credits`,
  REGENERATE_PROMPT: `${EDGE_FUNCTION_BASE}/regenerate-prompt`,
  SUGGEST_PROMPT: `${EDGE_FUNCTION_BASE}/suggest-prompt`,
  ARTIE_CHAT: `${EDGE_FUNCTION_BASE}/artie-chat`,
  CREATE_CHECKOUT_SESSION: `${EDGE_FUNCTION_BASE}/create-checkout-session`,
  VERIFY_PAYMENT: `${EDGE_FUNCTION_BASE}/verify-payment`,
  
  // Email Functions
  SEND_BETA_INVITE: `${EDGE_FUNCTION_BASE}/send-beta-invite`,
  SEND_CREDIT_ALERT: `${EDGE_FUNCTION_BASE}/send-credit-alert`,
  SEND_PURCHASE_CONFIRMATION: `${EDGE_FUNCTION_BASE}/send-purchase-confirmation`,
  SEND_WELCOME_EMAIL: `${EDGE_FUNCTION_BASE}/send-welcome-email`,
  WAITLIST_SIGNUP: `${EDGE_FUNCTION_BASE}/waitlist-signup`,
} as const;

// API Timeouts (in milliseconds)
export const API_TIMEOUTS = {
  DEFAULT: 30000,         // 30 seconds
  IMAGE_GENERATION: 120000, // 2 minutes
  IMAGE_ANALYSIS: 60000,   // 1 minute
  IMAGE_BLEND: 90000,      // 1.5 minutes
  IMAGE_UPSCALE: 90000,    // 1.5 minutes
  PAYMENT: 15000,          // 15 seconds
} as const;

// Retry Configuration
export const RETRY_CONFIG = {
  MAX_RETRIES: 3,
  BASE_DELAY: 1000,      // 1 second
  MAX_DELAY: 10000,      // 10 seconds
  JITTER_FACTOR: 0.3,    // 30% jitter
} as const;

// Credit Costs (for display and validation)
export const CREDIT_COSTS = {
  IMAGE_GENERATION: 10,
  IMAGE_ANALYSIS: 5,
  IMAGE_BLEND: 15,
  IMAGE_UPSCALE: 12,
  PROMPT_REGENERATION: 2,
  PROMPT_SUGGESTION: 1,
} as const;

// Feature Flags
export const FEATURES = {
  ENABLE_BATCH_PROCESSING: true,
  ENABLE_IMAGE_BLEND: true,
  ENABLE_IMAGE_UPSCALE: true,
  ENABLE_ARTIE_CHAT: true,
  ENABLE_ANALYTICS: true,
  ENABLE_INSPIRE: true,
} as const;

// Storage Buckets
export const STORAGE_BUCKETS = {
  GENERATED_IMAGES: 'generated-images',
} as const;

// Development mode check
export const IS_DEVELOPMENT = import.meta.env.DEV;
export const IS_PRODUCTION = import.meta.env.PROD;

// Logging configuration
export const LOG_CONFIG = {
  ENABLE_CONSOLE: IS_DEVELOPMENT,
  ENABLE_ERROR_TRACKING: IS_PRODUCTION,
  LOG_LEVEL: IS_DEVELOPMENT ? 'debug' : 'error',
} as const;

// Export type-safe endpoint keys
export type ApiEndpoint = keyof typeof API_ENDPOINTS;
