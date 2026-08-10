/**
 * 运行时环境配置
 * H5 可读 .env；App 真机统一使用 supabase.constants
 */
import {
  SUPABASE_ANON_KEY,
  SUPABASE_PROJECT_URL,
} from "@/config/supabase.constants";

function sanitizeEnvValue(value: string): string {
  return value.trim().replace(/^["']|["']$/g, "");
}

/** 不用 new URL()，避免 iOS WebView 误判 */
function looksLikeHttpUrl(value: string): boolean {
  const sanitized = sanitizeEnvValue(value);
  return /^https?:\/\/[^\s/]+(?:\/.*)?$/i.test(sanitized);
}

function isUsableEnvValue(value: string | undefined): boolean {
  if (value == null) return false;
  const sanitized = sanitizeEnvValue(value);
  if (!sanitized || sanitized === "undefined" || sanitized === "null") return false;
  if (sanitized.includes("your-project") || sanitized.includes("your-anon")) return false;
  return looksLikeHttpUrl(sanitized);
}

function isUsableKeyValue(value: string | undefined): boolean {
  if (value == null) return false;
  const sanitized = sanitizeEnvValue(value);
  if (!sanitized || sanitized === "undefined" || sanitized === "null") return false;
  if (sanitized.includes("your-anon") || sanitized.includes("your-project")) return false;
  return sanitized.length >= 20;
}

function resolveForH5(
  envValue: string | undefined,
  fallback: string,
  isUrl: boolean
): string {
  const usable = isUrl ? isUsableEnvValue(envValue) : isUsableKeyValue(envValue);
  if (usable && envValue) {
    const sanitized = sanitizeEnvValue(envValue);
    return isUrl ? sanitized.replace(/\/+$/, "") : sanitized;
  }
  return isUrl ? fallback.replace(/\/+$/, "") : fallback;
}

// #ifdef H5
export const supabaseUrl = resolveForH5(
  import.meta.env.VITE_SUPABASE_URL,
  SUPABASE_PROJECT_URL,
  true
);
export const supabaseAnonKey = resolveForH5(
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  SUPABASE_ANON_KEY,
  false
);
// #endif

// #ifndef H5
export const supabaseUrl = SUPABASE_PROJECT_URL;
export const supabaseAnonKey = SUPABASE_ANON_KEY;
// #endif

export const isSupabaseConfigured =
  looksLikeHttpUrl(supabaseUrl) && supabaseAnonKey.length >= 20;

export function getSupabaseConfigSource(): string {
  // #ifdef H5
  const fromEnv =
    isUsableEnvValue(import.meta.env.VITE_SUPABASE_URL) &&
    isUsableKeyValue(import.meta.env.VITE_SUPABASE_ANON_KEY);
  return fromEnv ? "import.meta.env" : "constants-fallback";
  // #endif
  // #ifndef H5
  return "constants";
  // #endif
}

export function logSupabaseConfig(): void {
  console.log(
    `[supabase] source=${getSupabaseConfigSource()} url=${supabaseUrl} keyLen=${supabaseAnonKey.length}`
  );
}
