/**
 * mock-health-data Edge Function
 * 根据 user_id、fitness_level、sleep_goal_hours 返回模拟健康数据
 */

import {
  generateMockHealthData,
  parseMockHealthDataRequest,
} from "./generator.ts";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/** 统一 JSON 响应 */
function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed, use POST" }, 405);
  }

  try {
    const body = await req.json();
    const parsed = parseMockHealthDataRequest(body);

    if (!parsed.ok) {
      return jsonResponse({ success: false, error: parsed.error }, 400);
    }

    const data = generateMockHealthData(parsed.value);

    return jsonResponse({
      success: true,
      data,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse({ success: false, error: message }, 500);
  }
});
