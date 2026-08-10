/**
 * 语音 API：转写 + TTS
 */
import { callEdgeFunction, getAccessToken } from "@/api/edge";
import { supabaseAnonKey, supabaseUrl } from "@/config/env";

export interface SpeechToTextResult {
  success: boolean;
  text?: string;
  error?: string;
}

export interface TextToSpeechResult {
  success: boolean;
  format?: string;
  /** 优先：可下载的签名 URL（App 用 downloadFile 播放） */
  audio_url?: string;
  /** 兜底：base64（需 Blob/文件系统，旧基座可能不可用） */
  audio_base64?: string;
  truncated?: boolean;
  warning?: string;
  error?: string;
}

function canReadFileAsBase64(): boolean {
  return typeof uni.getFileSystemManager === "function";
}

function readFileAsBase64(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!canReadFileAsBase64()) {
      reject(new Error("getFileSystemManager unavailable"));
      return;
    }
    const fs = uni.getFileSystemManager();
    fs.readFile({
      filePath,
      encoding: "base64",
      success: (res) => {
        const data = typeof res.data === "string" ? res.data : "";
        if (!data) {
          reject(new Error("读取录音失败"));
          return;
        }
        resolve(data);
      },
      fail: (err) => {
        reject(new Error(err.errMsg || "读取录音失败"));
      },
    });
  });
}

function guessMimeFromPath(filePath: string): {
  mime_type: string;
  filename: string;
} {
  const lower = filePath.toLowerCase();
  if (lower.endsWith(".wav")) {
    return { mime_type: "audio/wav", filename: "audio.wav" };
  }
  if (lower.endsWith(".m4a") || lower.endsWith(".aac")) {
    return { mime_type: "audio/mp4", filename: "audio.m4a" };
  }
  if (lower.endsWith(".mp3")) {
    return { mime_type: "audio/mpeg", filename: "audio.mp3" };
  }
  // iOS RecorderManager 常用 aac，临时路径可能无后缀
  return { mime_type: "audio/mp4", filename: "audio.m4a" };
}

/**
 * 上传录音文件转写
 * - 有 getFileSystemManager：base64 JSON
 * - 当前 App 自定义基座通常没有该 API：直接 multipart（正常路径，非错误）
 */
export async function transcribeAudioFile(
  filePath: string
): Promise<SpeechToTextResult> {
  if (!canReadFileAsBase64()) {
    return uploadAudioMultipart(filePath);
  }

  try {
    const audio_base64 = await readFileAsBase64(filePath);
    const meta = guessMimeFromPath(filePath);
    const result = await callEdgeFunction<SpeechToTextResult>("speech-to-text", {
      audio_base64,
      mime_type: meta.mime_type,
      filename: meta.filename,
    });
    if (!result?.success) {
      return {
        success: false,
        error: result?.error || "语音识别失败",
      };
    }
    return result;
  } catch (error) {
    // 读文件偶发失败时再回退 multipart
    console.warn("[speech] base64 upload failed, fallback multipart:", error);
    return uploadAudioMultipart(filePath);
  }
}

async function uploadAudioMultipart(
  filePath: string
): Promise<SpeechToTextResult> {
  const token = await getAccessToken();
  const url = `${supabaseUrl}/functions/v1/speech-to-text`;
  const meta = guessMimeFromPath(filePath);

  return new Promise((resolve) => {
    uni.uploadFile({
      url,
      filePath,
      name: "file",
      header: {
        Authorization: `Bearer ${token}`,
        apikey: supabaseAnonKey,
      },
      formData: {
        filename: meta.filename,
      },
      success: (res) => {
        try {
          const data =
            typeof res.data === "string" ? JSON.parse(res.data) : res.data;
          if (res.statusCode === 401 || res.statusCode === 403) {
            void import("@/utils/auth-session").then(({ handleAuthFailure }) => {
              handleAuthFailure("未登录，请先登录");
            });
            resolve({ success: false, error: "未登录，请先登录" });
            return;
          }
          if (res.statusCode < 200 || res.statusCode >= 300 || !data?.success) {
            resolve({
              success: false,
              error: data?.error || `转写失败 (${res.statusCode})`,
            });
            return;
          }
          resolve({ success: true, text: data.text });
        } catch (parseError) {
          resolve({
            success: false,
            error:
              parseError instanceof Error
                ? parseError.message
                : "转写结果解析失败",
          });
        }
      },
      fail: (err) => {
        resolve({
          success: false,
          error: err.errMsg || "上传录音失败",
        });
      },
    });
  });
}

/** 文本转语音（返回 base64 mp3） */
export async function synthesizeSpeech(
  text: string
): Promise<TextToSpeechResult> {
  return callEdgeFunction<TextToSpeechResult>("text-to-speech", { text });
}
