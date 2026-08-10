// supabase/functions/text-to-speech/index.ts
// 文字转语音（SiliconFlow CosyVoice2）→ Storage 签名 URL，供 App 下载播放

import { createClient } from "npm:@supabase/supabase-js@2.49.8";

const SILICONFLOW_API_KEY = Deno.env.get("SILICONFLOW_API_KEY") ?? "";
const TTS_MODEL = "FunAudioLLM/CosyVoice2-0.5B";
const TTS_VOICE = "FunAudioLLM/CosyVoice2-0.5B:claire";
const MAX_CHARS = 400;
const TTS_BUCKET = "tts-cache";
const SIGNED_URL_TTL_SEC = 3600;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function authenticate(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

async function uploadAndSign(
  userId: string,
  audioBuffer: Uint8Array
): Promise<string | null> {
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!serviceKey) {
    console.error("[text-to-speech] SUPABASE_SERVICE_ROLE_KEY missing");
    return null;
  }

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey);
  const objectPath = `${userId}/${crypto.randomUUID()}.mp3`;

  const { error: uploadError } = await admin.storage
    .from(TTS_BUCKET)
    .upload(objectPath, audioBuffer, {
      contentType: "audio/mpeg",
      upsert: true,
    });

  if (uploadError) {
    console.error("[text-to-speech] upload failed:", uploadError.message);
    return null;
  }

  const { data, error: signError } = await admin.storage
    .from(TTS_BUCKET)
    .createSignedUrl(objectPath, SIGNED_URL_TTL_SEC);

  if (signError || !data?.signedUrl) {
    console.error(
      "[text-to-speech] sign failed:",
      signError?.message || "no url"
    );
    return null;
  }

  return data.signedUrl;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!SILICONFLOW_API_KEY) {
      return json({ success: false, error: "SILICONFLOW_API_KEY 未配置" }, 500);
    }

    const userId = await authenticate(req);
    if (!userId) {
      return json({ success: false, error: "未登录，请先登录" }, 401);
    }

    const body = await req.json();
    let text = String(body.text || "").trim();
    if (!text) {
      return json({ success: false, error: "缺少播报文本" }, 400);
    }
    const originalLen = text.length;
    if (text.length > MAX_CHARS) {
      text = `${text.slice(0, MAX_CHARS)}…`;
    }

    const sfRes = await fetch("https://api.siliconflow.cn/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SILICONFLOW_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: TTS_MODEL,
        voice: TTS_VOICE,
        input: text,
        response_format: "mp3",
        speed: 1.0,
      }),
    });

    if (!sfRes.ok) {
      const errText = await sfRes.text();
      console.error("[text-to-speech] siliconflow error:", errText);
      let message = `语音合成失败 (${sfRes.status})`;
      try {
        const parsed = JSON.parse(errText);
        message = parsed.message || parsed.error || message;
      } catch {
        // ignore
      }
      return json({ success: false, error: message }, 502);
    }

    const audioBuffer = new Uint8Array(await sfRes.arrayBuffer());
    if (audioBuffer.length === 0) {
      return json({ success: false, error: "语音合成返回空音频" }, 502);
    }

    const audioUrl = await uploadAndSign(userId, audioBuffer);
    if (!audioUrl) {
      // 仍返回 base64，供 H5 / 新基座兜底；App 旧基座可能无法播
      return json({
        success: true,
        format: "mp3",
        audio_base64: bytesToBase64(audioBuffer),
        model: TTS_MODEL,
        voice: TTS_VOICE,
        truncated: originalLen > MAX_CHARS,
        warning: "音频已生成，但缓存上传失败，App 可能无法播放",
      });
    }

    return json({
      success: true,
      format: "mp3",
      audio_url: audioUrl,
      model: TTS_MODEL,
      voice: TTS_VOICE,
      truncated: originalLen > MAX_CHARS,
    });
  } catch (error) {
    console.error("[text-to-speech] failed:", error);
    return json(
      {
        success: false,
        error: error instanceof Error ? error.message : "语音合成失败",
      },
      500
    );
  }
});
