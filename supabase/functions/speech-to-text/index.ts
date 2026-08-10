// supabase/functions/speech-to-text/index.ts
// 语音转文字（SiliconFlow SenseVoice）

import { createClient } from "npm:@supabase/supabase-js@2.49.8";

const SILICONFLOW_API_KEY = Deno.env.get("SILICONFLOW_API_KEY") ?? "";
const STT_MODEL = "FunAudioLLM/SenseVoiceSmall";
const MAX_AUDIO_BYTES = 8 * 1024 * 1024; // 8MB

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

function pickErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") return fallback;
  const obj = payload as Record<string, unknown>;
  if (typeof obj.message === "string" && obj.message.trim()) return obj.message;
  if (typeof obj.error === "string" && obj.error.trim()) return obj.error;
  if (obj.error && typeof obj.error === "object") {
    const nested = obj.error as Record<string, unknown>;
    if (typeof nested.message === "string" && nested.message.trim()) {
      return nested.message;
    }
  }
  return fallback;
}

function guessMime(filename: string, mimeHint?: string): string {
  const hint = (mimeHint || "").toLowerCase();
  if (hint.startsWith("audio/")) return hint;
  const lower = filename.toLowerCase();
  if (lower.endsWith(".wav")) return "audio/wav";
  if (lower.endsWith(".m4a") || lower.endsWith(".aac")) return "audio/mp4";
  if (lower.endsWith(".ogg")) return "audio/ogg";
  if (lower.endsWith(".webm")) return "audio/webm";
  return "audio/mpeg";
}

function ensureFilename(name: string, mime: string): string {
  const base = (name || "audio").split(/[/\\]/).pop() || "audio";
  if (/\.(mp3|wav|m4a|aac|ogg|webm|flac)$/i.test(base)) return base;
  if (mime.includes("wav")) return "audio.wav";
  if (mime.includes("m4a") || mime.includes("mp4") || mime.includes("aac")) {
    return "audio.m4a";
  }
  if (mime.includes("ogg")) return "audio.ogg";
  if (mime.includes("webm")) return "audio.webm";
  return "audio.mp3";
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

    const contentType = req.headers.get("content-type") || "";
    let audioBytes: Uint8Array;
    let filename = "audio.mp3";
    let mime = "audio/mpeg";

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      if (!(file instanceof Blob)) {
        return json({ success: false, error: "缺少音频文件 file" }, 400);
      }
      const named = file as File;
      filename = ensureFilename(
        typeof named.name === "string" ? named.name : "audio",
        file.type || ""
      );
      mime = guessMime(filename, file.type);
      audioBytes = new Uint8Array(await file.arrayBuffer());
    } else {
      const body = await req.json();
      const base64 = String(body.audio_base64 || "").replace(
        /^data:audio\/[\w.+-]+;base64,/,
        ""
      );
      if (!base64) {
        return json({ success: false, error: "缺少 audio_base64" }, 400);
      }
      const binary = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      mime = guessMime(
        String(body.filename || ""),
        String(body.mime_type || "")
      );
      filename = ensureFilename(String(body.filename || "audio"), mime);
      audioBytes = binary;
    }

    if (audioBytes.byteLength <= 0) {
      return json({ success: false, error: "音频为空" }, 400);
    }
    if (audioBytes.byteLength < 256) {
      return json(
        { success: false, error: "录音太短，请按住多说一两秒再松手" },
        400
      );
    }
    if (audioBytes.byteLength > MAX_AUDIO_BYTES) {
      return json({ success: false, error: "录音过长，请缩短后重试" }, 400);
    }

    const audioFile = new File([audioBytes], filename, { type: mime });
    const form = new FormData();
    form.append("model", STT_MODEL);
    form.append("file", audioFile, filename);

    const sfRes = await fetch(
      "https://api.siliconflow.cn/v1/audio/transcriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SILICONFLOW_API_KEY}`,
        },
        body: form,
      }
    );

    const sfText = await sfRes.text();
    let sfJson: unknown = {};
    try {
      sfJson = JSON.parse(sfText);
    } catch {
      // ignore
    }

    if (!sfRes.ok) {
      console.error(
        "[speech-to-text] siliconflow error:",
        sfRes.status,
        filename,
        mime,
        audioBytes.byteLength,
        sfText.slice(0, 500)
      );
      return json(
        {
          success: false,
          error: pickErrorMessage(
            sfJson,
            `转写服务异常 (${sfRes.status})，请稍后重试`
          ),
        },
        502
      );
    }

    const text =
      typeof (sfJson as { text?: unknown })?.text === "string"
        ? String((sfJson as { text: string }).text).trim()
        : "";
    if (!text) {
      return json({ success: false, error: "未识别到有效语音，请重试" }, 422);
    }

    return json({
      success: true,
      text,
      model: STT_MODEL,
    });
  } catch (error) {
    console.error("[speech-to-text] failed:", error);
    return json(
      {
        success: false,
        error: error instanceof Error ? error.message : "转写失败",
      },
      500
    );
  }
});
