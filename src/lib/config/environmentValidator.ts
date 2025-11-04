/**
 * Environment Variable Validator
 * Validates all required environment variables at application boot
 */

interface EnvConfig {
  VITE_SUPABASE_URL: string;
  VITE_SUPABASE_PUBLISHABLE_KEY: string;
  VITE_SUPABASE_PROJECT_ID: string;
}

class EnvironmentValidationError extends Error {
  constructor(message: string, public missingVars: string[]) {
    super(message);
    this.name = 'EnvironmentValidationError';
  }
}

export function validateEnvironment(): EnvConfig {
  const required = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_PUBLISHABLE_KEY',
    'VITE_SUPABASE_PROJECT_ID',
  ];

  const missing: string[] = [];
  const config: Partial<EnvConfig> = {};

  for (const key of required) {
    const value = import.meta.env[key];
    if (!value || value.trim() === '') {
      missing.push(key);
    } else {
      config[key as keyof EnvConfig] = value;
    }
  }

  if (missing.length > 0) {
    const error = new EnvironmentValidationError(
      `Missing required environment variables: ${missing.join(', ')}`,
      missing
    );
    
    console.error('❌ Environment validation failed:', {
      missing,
      timestamp: new Date().toISOString(),
    });
    
    throw error;
  }

  console.log('✅ Environment validation successful:', {
    timestamp: new Date().toISOString(),
    variables: required,
  });

  return config as EnvConfig;
}

// Validate URL format
export function validateSupabaseUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && parsed.hostname.includes('supabase');
  } catch {
    return false;
  }
}

// Export validated environment (singleton pattern)
let validatedEnv: EnvConfig | null = null;

export function getEnvironment(): EnvConfig {
  if (!validatedEnv) {
    validatedEnv = validateEnvironment();
    
    // Additional validation
    if (!validateSupabaseUrl(validatedEnv.VITE_SUPABASE_URL)) {
      throw new Error('Invalid Supabase URL format');
    }
  }
  
  return validatedEnv;
}
