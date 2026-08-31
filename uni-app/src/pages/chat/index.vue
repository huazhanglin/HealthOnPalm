<script setup lang="ts">
import { onHide, onShow, onUnload } from "@dcloudio/uni-app";
import { storeToRefs } from "pinia";
import { computed, onUnmounted, ref } from "vue";
import { HaButton, HaLoading } from "@/components/common";
import {
  cancelVoiceRecording,
  playSpeechForMessage,
  setPlayStateListener,
  startVoiceRecording,
  stopSpeechPlayback,
  stopVoiceRecording,
  transcribeVoiceFile,
  type VoiceRecordState,
} from "@/lib/chat/voice";
import { useChatStore } from "@/stores/chat";
import { useUserStore } from "@/stores/user";
import { CHAT_INPUT_MAX_LENGTH } from "@/types/chat";
import { ensureOnboarded } from "@/utils/onboarding";
import { showErrorToast } from "@/utils/storage";

const userStore = useUserStore();
userStore.hydrateFromStorageSync();
const chatStore = useChatStore();

const {
  messages,
  inputText,
  isSending,
  isLoadingHistory,
  scrollIntoViewId,
  canSend,
  inputLength,
} = storeToRefs(chatStore);

const voiceState = ref<VoiceRecordState>("idle");
const playingMessageId = ref<string | null>(null);
const voiceHint = ref("");

/** 是否正在等待 AI 首字（尚未创建 assistant 气泡） */
const isWaitingReply = computed(() => {
  if (!isSending.value) return false;
  const last = messages.value[messages.value.length - 1];
  return !last || last.role === "user";
});

const isVoiceBusy = computed(
  () => voiceState.value === "recording" || voiceState.value === "processing"
);

/** 发送消息 */
function handleSend(): void {
  if (!canSend.value || isVoiceBusy.value) return;
  void chatStore.sendMessage();
}

function isMessagePlaying(messageId: string): boolean {
  return playingMessageId.value === messageId;
}

async function togglePlayMessage(messageId: string, content: string): Promise<void> {
  if (!content.trim() || isSending.value) return;

  if (playingMessageId.value === messageId) {
    stopSpeechPlayback();
    return;
  }

  try {
    uni.showLoading({ title: "生成语音...", mask: true });
    await playSpeechForMessage(messageId, content);
  } catch (error) {
    const message = error instanceof Error ? error.message : "播报失败";
    showErrorToast(message);
  } finally {
    uni.hideLoading();
  }
}

function onMicTouchStart(): void {
  if (isSending.value || voiceState.value !== "idle") return;
  voiceState.value = "recording";
  voiceHint.value = "松开结束";
  try {
    startVoiceRecording();
  } catch (error) {
    console.error("[chat] start record failed:", error);
    voiceState.value = "idle";
    voiceHint.value = "";
    showErrorToast("无法开始录音，请检查麦克风权限");
  }
}

async function onMicTouchEnd(): Promise<void> {
  if (voiceState.value !== "recording") return;

  voiceState.value = "processing";
  voiceHint.value = "识别中...";

  try {
    const filePath = await stopVoiceRecording();
    if (!filePath) {
      showErrorToast("录音太短，请按住多说一两秒");
      return;
    }
    const text = await transcribeVoiceFile(filePath);
    if (!text) {
      showErrorToast("未识别到有效内容");
      return;
    }
    const merged = inputText.value.trim()
      ? `${inputText.value.trim()} ${text}`
      : text;
    inputText.value = merged.slice(0, CHAT_INPUT_MAX_LENGTH);
    uni.showToast({ title: "已填入文字", icon: "success" });
  } catch (error) {
    console.error("[chat] voice input failed:", error);
    const message = error instanceof Error ? error.message : "语音识别失败";
    showErrorToast(message);
  } finally {
    voiceState.value = "idle";
    voiceHint.value = "";
  }
}

function onMicTouchCancel(): void {
  if (voiceState.value === "recording") {
    cancelVoiceRecording();
    voiceState.value = "idle";
    voiceHint.value = "";
  }
}

/** 页面鉴权并加载历史（历史不阻塞首屏） */
async function initPage(): Promise<void> {
  if (!userStore.isLoggedIn) {
    userStore.hydrateFromStorageSync();
  }
  if (!userStore.isLoggedIn) {
    uni.reLaunch({ url: "/pages/login/index" });
    return;
  }

  void chatStore.loadHistory();

  const onboarded = await ensureOnboarded();
  if (!onboarded) return;
}

onShow(() => {
  setPlayStateListener((id) => {
    playingMessageId.value = id;
  });
  void initPage();
});

onHide(() => {
  stopSpeechPlayback();
});

onUnload(() => {
  stopSpeechPlayback();
  setPlayStateListener(null);
});

onUnmounted(() => {
  stopSpeechPlayback();
  setPlayStateListener(null);
});
</script>

<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="nav-bar">
      <view class="status-bar" />
      <view class="nav-content">
        <text class="nav-title">HOP 助手</text>
      </view>
    </view>

    <!-- 消息列表 -->
    <scroll-view
      class="message-list"
      scroll-y
      :scroll-into-view="scrollIntoViewId"
      scroll-with-animation
    >
      <view v-if="isLoadingHistory" class="history-loading">
        <HaLoading text="加载对话..." />
      </view>

      <view
        v-for="(msg, index) in messages"
        :id="`msg-${msg.id}`"
        :key="msg.id"
        class="message-block"
      >
        <view
          v-if="chatStore.shouldShowTimeLabel(msg, messages[index - 1])"
          class="time-label"
        >
          <text class="time-label-text">{{ chatStore.formatTimeLabel(msg.timestamp) }}</text>
        </view>

        <view
          class="message-row"
          :class="msg.role === 'user' ? 'message-row--user' : 'message-row--assistant'"
        >
          <view
            v-if="msg.role === 'assistant'"
            class="avatar avatar--ai"
          >
            <text class="avatar-text">HOP</text>
          </view>

          <view
            class="bubble"
            :class="msg.role === 'user' ? 'bubble--user' : 'bubble--assistant'"
          >
            <text class="bubble-text" user-select>
              {{ msg.displayContent ?? msg.content }}
            </text>
            <text v-if="msg.isTyping" class="typing-cursor">|</text>
            <view
              v-if="msg.role === 'assistant' && msg.content && !msg.isTyping"
              class="speak-btn"
              @tap.stop="togglePlayMessage(msg.id, msg.content)"
            >
              <text class="speak-btn-text">
                {{ isMessagePlaying(msg.id) ? "停止" : "播放" }}
              </text>
            </view>
          </view>

          <view
            v-if="msg.role === 'user'"
            class="avatar avatar--user"
          >
            <text class="avatar-text">我</text>
          </view>
        </view>
      </view>

      <!-- AI 思考中 -->
      <view v-if="isWaitingReply" class="message-row message-row--assistant">
        <view class="avatar avatar--ai">
          <text class="avatar-text">HOP</text>
        </view>
        <view class="bubble bubble--assistant bubble--loading">
          <view class="typing-dots">
            <view class="dot" />
            <view class="dot" />
            <view class="dot" />
          </view>
        </view>
      </view>

      <view id="scroll-bottom" class="scroll-anchor" />
    </scroll-view>

    <!-- 底部输入区 -->
    <view class="input-bar">
      <view
        class="mic-btn"
        :class="{
          'mic-btn--recording': voiceState === 'recording',
          'mic-btn--disabled': isSending || voiceState === 'processing',
        }"
        @touchstart.prevent="onMicTouchStart"
        @touchend.prevent="onMicTouchEnd"
        @touchcancel.prevent="onMicTouchCancel"
      >
        <text class="mic-btn-text">
          {{ voiceState === "recording" ? "松开" : voiceState === "processing" ? "..." : "语音" }}
        </text>
      </view>
      <view class="input-wrap">
        <textarea
          v-model="inputText"
          class="input-field"
          :placeholder="voiceHint || '输入你的健康问题...'"
          placeholder-class="input-placeholder"
          :maxlength="CHAT_INPUT_MAX_LENGTH"
          :disabled="isSending || isVoiceBusy"
          auto-height
          fixed
          @confirm="handleSend"
        />
        <text class="input-counter">{{ inputLength }}/{{ CHAT_INPUT_MAX_LENGTH }}</text>
      </view>
      <HaButton
        class="send-btn"
        type="primary"
        size="small"
        :loading="isSending"
        :disabled="!canSend || isVoiceBusy"
        @click="handleSend"
      >
        发送
      </HaButton>
    </view>

    <view v-if="voiceState === 'recording'" class="voice-overlay">
      <text class="voice-overlay-text">正在聆听，松开发送识别</text>
    </view>
  </view>
</template>

<style scoped>
.page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f1f5f9;
  box-sizing: border-box;
}

.nav-bar {
  flex-shrink: 0;
  background-color: #ffffff;
  border-bottom: 2rpx solid #e2e8f0;
}

.status-bar {
  height: var(--status-bar-height);
}

.nav-content {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  height: 88rpx;
  padding: 0 24rpx;
}

.nav-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #0f172a;
}

.message-list {
  flex: 1;
  height: 0;
  padding: 24rpx 24rpx 0;
  box-sizing: border-box;
}

.history-loading {
  padding: 48rpx 0;
}

.message-block {
  margin-bottom: 8rpx;
}

.time-label {
  display: flex;
  justify-content: center;
  margin: 24rpx 0 16rpx;
}

.time-label-text {
  font-size: 22rpx;
  color: #94a3b8;
  background-color: rgba(148, 163, 184, 0.15);
  padding: 6rpx 20rpx;
  border-radius: 20rpx;
}

.message-row {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  margin-bottom: 24rpx;
}

.message-row--user {
  justify-content: flex-end;
}

.message-row--assistant {
  justify-content: flex-start;
}

.avatar {
  width: 64rpx;
  height: 64rpx;
  border-radius: 32rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.avatar--ai {
  background-color: #e2e8f0;
  margin-right: 16rpx;
}

.avatar--user {
  background-color: #10b981;
  margin-left: 16rpx;
}

.avatar-text {
  font-size: 22rpx;
  color: #475569;
  font-weight: 600;
}

.avatar--user .avatar-text {
  color: #ffffff;
}

.bubble {
  max-width: 72%;
  padding: 20rpx 28rpx;
  border-radius: 24rpx;
  word-break: break-word;
}

.bubble--user {
  background-color: #10b981;
  border-top-right-radius: 8rpx;
}

.bubble--assistant {
  background-color: #ffffff;
  border-top-left-radius: 8rpx;
  box-shadow: 0 4rpx 16rpx rgba(15, 23, 42, 0.06);
}

.bubble-text {
  font-size: 28rpx;
  line-height: 1.6;
}

.bubble--user .bubble-text {
  color: #ffffff;
}

.bubble--assistant .bubble-text {
  color: #1e293b;
}

.speak-btn {
  margin-top: 12rpx;
  align-self: flex-start;
  padding: 6rpx 16rpx;
  border-radius: 12rpx;
  background-color: #f0fdfa;
  border: 1rpx solid #99f6e4;
  display: inline-flex;
}

.speak-btn-text {
  font-size: 22rpx;
  color: #0d9488;
}

.typing-cursor {
  font-size: 28rpx;
  color: #10b981;
  animation: blink 1s step-end infinite;
}

.bubble--loading {
  min-width: 120rpx;
  min-height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.typing-dots {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 10rpx;
}

.dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background-color: #94a3b8;
  animation: bounce 1.2s ease-in-out infinite;
}

.dot:nth-child(2) {
  animation-delay: 0.15s;
}

.dot:nth-child(3) {
  animation-delay: 0.3s;
}

.scroll-anchor {
  height: 24rpx;
}

.input-bar {
  flex-shrink: 0;
  display: flex;
  flex-direction: row;
  align-items: flex-end;
  gap: 16rpx;
  padding: 16rpx 24rpx;
  background-color: #ffffff;
  border-top: 2rpx solid #e2e8f0;
  box-sizing: border-box;
}

.mic-btn {
  width: 88rpx;
  height: 88rpx;
  border-radius: 44rpx;
  background-color: #f0fdfa;
  border: 2rpx solid #99f6e4;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.mic-btn--recording {
  background-color: #0d9488;
  border-color: #0d9488;
}

.mic-btn--disabled {
  opacity: 0.5;
}

.mic-btn-text {
  font-size: 24rpx;
  color: #0d9488;
  font-weight: 600;
}

.mic-btn--recording .mic-btn-text {
  color: #ffffff;
}

.voice-overlay {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 180rpx;
  display: flex;
  justify-content: center;
  pointer-events: none;
  z-index: 20;
}

.voice-overlay-text {
  background-color: rgba(15, 23, 42, 0.82);
  color: #ffffff;
  font-size: 26rpx;
  padding: 16rpx 28rpx;
  border-radius: 999rpx;
}

.input-wrap {
  flex: 1;
  background-color: #f8fafc;
  border-radius: 24rpx;
  padding: 16rpx 24rpx 8rpx;
  border: 2rpx solid #e2e8f0;
  box-sizing: border-box;
}

.input-field {
  width: 100%;
  min-height: 64rpx;
  max-height: 200rpx;
  font-size: 28rpx;
  color: #0f172a;
  line-height: 1.5;
}

.input-placeholder {
  color: #94a3b8;
  font-size: 28rpx;
}

.input-counter {
  display: block;
  text-align: right;
  font-size: 20rpx;
  color: #94a3b8;
  margin-top: 4rpx;
}

.send-btn {
  flex-shrink: 0;
  --ha-primary-override: #10b981;
}

.send-btn :deep(.ha-button--primary) {
  background-color: #10b981;
}

@keyframes blink {
  50% {
    opacity: 0;
  }
}

@keyframes bounce {
  0%,
  80%,
  100% {
    transform: translateY(0);
    opacity: 0.4;
  }
  40% {
    transform: translateY(-6rpx);
    opacity: 1;
  }
}
</style>
