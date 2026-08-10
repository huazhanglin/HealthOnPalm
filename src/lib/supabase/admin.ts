import { createClient } from "@supabase/supabase-js";

/**
 * 创建 Supabase Admin 客户端（Service Role）
 * ⚠️ 仅能在服务端使用（Server Action / Route Handler），切勿暴露到浏览器
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "缺少 Supabase Admin 配置：请检查 NEXT_PUBLIC_SUPABASE_URL 与 SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
