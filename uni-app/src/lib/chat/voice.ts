/**
 * 聊天语音：录音管理 + TTS 播放
 *
 * App 自定义基座限制：无 Blob / Audio / getFileSystemManager
 * → TTS 走签名 URL + uni.downloadFile + InnerAudioContext
 */
import { synthesizeSpeech, transcribeAudioFile } from "@/api/speech";

export type VoiceRecordState = "idle" | "recording" | "processing";

type PlayStateListener = (messageId: string | null) => void;

let recorder: UniApp.RecorderManager | null = null;
let audioPlayer: UniApp.InnerAudioContext | null = null;
let playingMessageId: string | null = null;
let playStateListener: PlayStateListener | null = null;
let recordResolve: ((path: string | null) => void) | null = null;
let recordStartedAt = 0;
const MIN_RECORD_MS = 800;

function notifyPlayState(messageId: string | null): void {
  playingMessageId = messageId;
  playStateListener?.(messageId);
}

export function setPlayStateListener(listener: PlayStateListener | null): void {
  playStateListener = listener;
}

function getRecorder(): UniApp.RecorderManager {
  if (!recorder) {
    recorder = uni.getRecorderManager();
    recorder.onStop((res) => {
      const path = res.tempFilePath || null;
      recordResolve?.(path);
      recordResolve = null;
    });
    recorder.onError((err) => {
      console.error("[voice] recorder error:", err);
      recordResolve?.(null);
      recordResolve = null;
    });
  }
  return recorder;
}

/** 开始录音（按住说话；iOS 用 aac 更稳） */
export function startVoiceRecording(): void {
  const manager = getRecorder();
  recordStartedAt = Date.now();
  manager.start({
    duration: 60000,
    sampleRate: 16000,
    numberOfChannels: 1,
    encodeBitRate: 48000,
    format: "aac",
  });
}

/** 结束录音并返回临时文件路径 */
export function stopVoiceRecording(): Promise<string | null> {
  const elapsed = Date.now() - recordStartedAt;
  if (elapsed < MIN_RECORD_MS) {
    return new Promise((resolve) => {
      try {
        getRecorder().stop();
      } catch {
        // ignore
      }
      recordResolve = null;
      resolve(null);
    });
  }

  return new Promise((resolve) => {
    recordResolve = resolve;
    try {
      getRecorder().stop();
    } catch (error) {
      console.error("[voice] stop failed:", error);
      recordResolve = null;
      resolve(null);
    }
    setTimeout(() => {
      if (recordResolve === resolve) {
        recordResolve = null;
        resolve(null);
      }
    }, 3000);
  });
}

/** 取消录音 */
export function cancelVoiceRecording(): void {
  try {
    getRecorder().stop();
  } catch {
    // ignore
  }
  recordResolve = null;
}

/** 录音文件 → 转写文本 */
export async function transcribeVoiceFile(filePath: string): Promise<string> {
  const result = await transcribeAudioFile(filePath);
  if (!result.success || !result.text) {
    throw new Error(result.error || "语音识别失败");
  }
  return result.text.trim();
}

function destroyPlayer(): void {
  if (!audioPlayer) return;
  try {
    audioPlayer.stop();
  } catch {
    // ignore
  }
  try {
    audioPlayer.destroy();
  } catch {
    // ignore
  }
  audioPlayer = null;
}

function createPlayer(): UniApp.InnerAudioContext {
  const player = uni.createInnerAudioContext();
  // iOS App 上 obeyMuteSwitch 为只读，赋值会抛错
  // #ifndef APP-PLUS
  player.obeyMuteSwitch = false;
  // #endif
  player.onEnded(() => {
    notifyPlayState(null);
  });
  player.onStop(() => {
    notifyPlayState(null);
  });
  player.onError((err) => {
    console.error("[voice] player error:", err);
    notifyPlayState(null);
  });
  audioPlayer = player;
  return player;
}

function downloadToTempFile(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    uni.downloadFile({
      url,
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300 && res.tempFilePath) {
          resolve(res.tempFilePath);
          return;
        }
        reject(new Error(`下载语音失败 (${res.statusCode || 0})`));
      },
      fail: (err) => {
        reject(new Error(err.errMsg || "下载语音失败"));
      },
    });
  });
}

function playLocalOrRemote(src: string): void {
  const player = createPlayer();
  player.src = src;
  player.play();
}

export function getPlayingMessageId(): string | null {
  return playingMessageId;
}

/** 停止当前播报 */
export function stopSpeechPlayback(): void {
  destroyPlayer();
  notifyPlayState(null);
}

/** 播报文本；同一时间仅一条 */
export async function playSpeechForMessage(
  messageId: string,
  text: string
): Promise<void> {
  const cleaned = text.trim();
  if (!cleaned) {
    throw new Error("没有可播报的内容");
  }

  stopSpeechPlayback();
  notifyPlayState(messageId);

  try {
    const result = await synthesizeSpeech(cleaned);
    if (!result.success) {
      throw new Error(result.error || "语音合成失败");
    }

    if (playingMessageId !== messageId) {
      return;
    }

    // 优先：签名 URL → 下载到本地临时文件再播（适配无 Blob/Audio 的 App 基座）
    if (result.audio_url) {
      try {
        const localPath = await downloadToTempFile(result.audio_url);
        if (playingMessageId !== messageId) return;
        playLocalOrRemote(localPath);
        return;
      } catch (error) {
        console.warn("[voice] download failed, try stream url:", error);
        if (playingMessageId !== messageId) return;
        playLocalOrRemote(result.audio_url);
        return;
      }
    }

    // #ifdef H5
    if (result.audio_base64) {
      try {
        const binary = atob(result.audio_base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i += 1) {
          bytes[i] = binary.charCodeAt(i);
        }
        const blob = new Blob([bytes.buffer], { type: "audio/mpeg" });
        const src = URL.createObjectURL(blob);
        if (playingMessageId !== messageId) return;
        playLocalOrRemote(src);
        return;
      } catch (error) {
        console.warn("[voice] h5 blob play failed:", error);
      }
    }
    // #endif

    throw new Error(
      result.warning || result.error || "无法播放语音，请稍后重试"
    );
  } catch (error) {
    notifyPlayState(null);
    throw error;
  }
}
