/**
 * Centralized environment and application configuration
 */

// Uses the __APP_VERSION__ injected by Vite via package.json
export const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0';

// 'development' or 'production' as provided natively by Vite
export const ENVIRONMENT = import.meta.env.MODE || 'development';

// Safe identifier for the Supabase instance (subdomain only, no keys/secrets)
export const SUPABASE_PROJECT_ID = import.meta.env.VITE_SUPABASE_URL
  ? (() => {
      try {
        return new URL(import.meta.env.VITE_SUPABASE_URL).hostname.split('.')[0];
      } catch (e) {
        return 'unknown';
      }
    })()
  : 'demo-mode';
