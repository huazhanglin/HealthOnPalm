// supabase/functions/delete-account/index.ts
// 校验 JWT 后，用 service role 删除该用户的业务数据与登录凭证

import { createClient } from "npm:@supabase/supabase-js@2.49.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const USER_TABLES = [
  "daily_summaries",
  "workout_logs",
  "sleep_logs",
  "mood_logs",
  "conversations",
  "sync_logs",
  "health_memories",
  "token_usage_logs",
] as const;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isMissingRelation(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const code = error.code ?? "";
  const message = error.message ?? "";
  return (
    code === "42P01" ||
    code === "PGRST205" ||
    /does not exist|schema cache|could not find the table/i.test(message)
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ success: false, error: "Method not allowed" }, 405);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ success: false, error: "未登录，请先登录" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();

    if (authError || !user?.id) {
      return json({ success: false, error: "未登录，请先登录" }, 401);
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const userId = user.id;

    for (const table of USER_TABLES) {
      const { error } = await admin.from(table).delete().eq("user_id", userId);
      if (error && !isMissingRelation(error)) {
        console.error(`[delete-account] ${table}:`, error.message);
        return json({ success: false, error: "删除账号失败，请稍后重试或发邮件联系我们" }, 500);
      }
    }

    const { data: ttsFiles, error: listError } = await admin.storage
      .from("tts-cache")
      .list(userId, { limit: 1000 });
    if (!listError && ttsFiles?.length) {
      const paths = ttsFiles.map((file) => `${userId}/${file.name}`);
      const { error: removeError } = await admin.storage.from("tts-cache").remove(paths);
      if (removeError) {
        console.warn("[delete-account] tts-cache:", removeError.message);
      }
    }

    const { error: profileError } = await admin.from("users").delete().eq("id", userId);
    if (profileError && !isMissingRelation(profileError)) {
      console.error("[delete-account] users:", profileError.message);
      return json({ success: false, error: "删除账号失败，请稍后重试或发邮件联系我们" }, 500);
    }

    const { error: authDeleteError } = await admin.auth.admin.deleteUser(userId);
    if (authDeleteError) {
      console.error("[delete-account] auth.users:", authDeleteError.message);
      return json({ success: false, error: "删除账号失败，请稍后重试或发邮件联系我们" }, 500);
    }

    return json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[delete-account]", message);
    return json({ success: false, error: "删除账号失败，请稍后重试或发邮件联系我们" }, 500);
  }
});
