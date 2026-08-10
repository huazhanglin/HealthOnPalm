import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  isSupabaseConfigured,
  logSupabaseConfig,
  supabaseAnonKey,
  supabaseUrl,
} from "@/config/env";
import { uniFetch } from "@/api/uni-fetch";
import { uniAuthStorage } from "@/utils/storage";

let supabaseClient: SupabaseClient | null = null;
let initLogged = false;

/** 延迟初始化 Supabase（H5）；App 端请用 @/api/supabase-auth REST */
export function getSupabase(): SupabaseClient {
  if (supabaseClient) return supabaseClient;

  if (!initLogged) {
    initLogged = true;
    logSupabaseConfig();
    if (!isSupabaseConfigured) {
      console.error(
        "Supabase 配置无效，请检查 config/supabase.constants.ts"
      );
    }
  }

  // #ifdef APP-PLUS
  throw new Error(
    "App 端请使用 @/api/supabase-auth REST 接口，勿直接初始化 supabase-js 客户端"
  );
  // #endif

  // #ifdef H5
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: uniAuthStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
    global: {
      fetch: uniFetch,
    },
  });
  // #endif

  return supabaseClient!;
}

/** 兼容旧引用（H5）；App 端勿直接 import */
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const client = getSupabase();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
