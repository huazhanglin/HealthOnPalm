import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { agentApi } from "@/api/agent";
import { useUserStore } from "@/stores/user";
import {
  CHAT_INPUT_MAX_LENGTH,
  TIME_LABEL_INTERVAL_MS,
  WELCOME_MESSAGE,
  type ChatMessage,
  type ChatMessageRole,
} from "@/types/chat";
import { HaToast } from "@/components/common";

/** 生成消息 ID */
function createMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/** 创建消息对象 */
function createMessage(role: ChatMessageRole, content: string): ChatMessage {
  return {
    id: createMessageId(),
    role,
    content,
    displayContent: content,
    timestamp: new Date().toISOString(),
  };
}

/** 格式化时间分隔标签 */
export function formatTimeLabel(timestamp: string): string {
  const date = new Date(timestamp);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

/** 是否应显示时间分隔（相邻消息间隔 >= 5 分钟） */
export function shouldShowTimeLabel(
  current: ChatMessage,
  previous?: ChatMessage
): boolean {
  if (!previous) return true;
  const gap =
    new Date(current.timestamp).getTime() - new Date(previous.timestamp).getTime();
  return gap >= TIME_LABEL_INTERVAL_MS;
}

/**
 * 对话 Pinia Store
 * 管理消息列表、发送流程与 memory-working 同步
 */
export const useChatStore = defineStore("chat", () => {
  const messages = ref<ChatMessage[]>([]);
  const inputText = ref("");
  const isSending = ref(false);
  const isLoadingHistory = ref(false);
  const scrollIntoViewId = ref("");
  const hasInitialized = ref(false);

  const canSend = computed(
    () =>
      !isSending.value &&
      inputText.value.trim().length > 0 &&
      inputText.value.length <= CHAT_INPUT_MAX_LENGTH
  );

  const inputLength = computed(() => inputText.value.length);

  /** 滚动到最新消息 */
  function scrollToBottom(): void {
    const last = messages.value[messages.value.length - 1];
    if (last) {
      scrollIntoViewId.value = `msg-${last.id}`;
    }
  }

  /** 打字机效果 */
  async function typewriter(messageId: string, fullText: string): Promise<void> {
    const target = messages.value.find((item) => item.id === messageId);
    if (!target) return;

    target.isTyping = true;
    target.displayContent = "";

    for (let i = 0; i < fullText.length; i += 1) {
      target.displayContent = fullText.slice(0, i + 1);
      scrollToBottom();
      await new Promise((resolve) => setTimeout(resolve, 18));
    }

    target.content = fullText;
    target.displayContent = fullText;
    target.isTyping = false;
  }

  /** 加载历史对话（memory-working read） */
  async function loadHistory(): Promise<void> {
    const userStore = useUserStore();
    const userId = userStore.userId;
    if (!userId || hasInitialized.value) return;

    isLoadingHistory.value = true;

    try {
      const data = await agentApi.readMemory(userId);
      const stored = data.recent_messages ?? data.messages ?? [];

      if (stored.length > 0) {
        messages.value = stored.map((item) => ({
          id: createMessageId(),
          role: item.role,
          content: item.content,
          displayContent: item.content,
          timestamp: item.timestamp || new Date().toISOString(),
        }));
      } else {
        messages.value = [createMessage("assistant", WELCOME_MESSAGE)];
      }

      hasInitialized.value = true;
      scrollToBottom();
    } catch (error) {
      console.error("[chat] 加载历史失败:", error);
      messages.value = [createMessage("assistant", WELCOME_MESSAGE)];
      hasInitialized.value = true;
    } finally {
      isLoadingHistory.value = false;
    }
  }

  /** 发送用户消息并获取 AI 回复 */
  async function sendMessage(): Promise<void> {
    const content = inputText.value.trim();
    if (!content || isSending.value) return;

    const userStore = useUserStore();
    const userId = userStore.userId;
    if (!userId) {
      const { redirectToLogin } = await import("@/utils/auth-session");
      redirectToLogin("请先登录");
      return;
    }

    isSending.value = true;
    inputText.value = "";

    const userMessage = createMessage("user", content);
    messages.value.push(userMessage);
    scrollToBottom();

    try {
      try {
        await agentApi.writeMemory(userId, { role: "user", content });
      } catch (memoryError) {
        console.warn("[chat] 写入用户消息失败，继续请求 AI:", memoryError);
      }

      const reply = await agentApi.askQuestion(userId, content);

      try {
        await agentApi.writeMemory(userId, { role: "assistant", content: reply });
      } catch (memoryError) {
        console.warn("[chat] 写入 AI 回复失败:", memoryError);
      }

      const assistantMessage = createMessage("assistant", "");
      assistantMessage.displayContent = "";
      assistantMessage.isTyping = true;
      messages.value.push(assistantMessage);
      scrollToBottom();

      await typewriter(assistantMessage.id, reply);
    } catch (error) {
      console.error("[chat] 发送失败:", error);
      const message = error instanceof Error ? error.message : "发送失败，请重试";
      HaToast.error(message);

      const errorReply = createMessage(
        "assistant",
        `抱歉，暂时无法连接 AI 服务（${message}）。请稍后重试，或检查 Supabase 是否已部署 query-agent 并配置 SILICONFLOW_API_KEY。`
      );
      messages.value.push(errorReply);
      scrollToBottom();
    } finally {
      isSending.value = false;
      scrollToBottom();
    }
  }

  /** 重置对话状态（登出时） */
  function reset(): void {
    messages.value = [];
    inputText.value = "";
    isSending.value = false;
    isLoadingHistory.value = false;
    hasInitialized.value = false;
    scrollIntoViewId.value = "";
  }

  return {
    messages,
    inputText,
    isSending,
    isLoadingHistory,
    scrollIntoViewId,
    canSend,
    inputLength,
    loadHistory,
    sendMessage,
    scrollToBottom,
    reset,
    formatTimeLabel,
    shouldShowTimeLabel,
  };
});
