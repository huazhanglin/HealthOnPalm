/** 聊天消息角色 */
export type ChatMessageRole = "user" | "assistant" | "system";

/** 界面展示用聊天消息 */
export interface ChatMessage {
  /** 本地唯一 ID */
  id: string;
  /** 消息角色 */
  role: ChatMessageRole;
  /** 完整内容 */
  content: string;
  /** ISO 时间戳 */
  timestamp: string;
  /** 打字机展示中的部分内容 */
  displayContent?: string;
  /** 是否正在打字机动画 */
  isTyping?: boolean;
}

/** memory-working read 返回结构 */
export interface MemoryReadResult {
  success: boolean;
  messages?: Array<{
    role: ChatMessageRole;
    content: string;
    timestamp: string;
  }>;
  recent_messages?: Array<{
    role: ChatMessageRole;
    content: string;
    timestamp: string;
  }>;
  context_summary?: string;
  message_count?: number;
}

/** query-agent 返回结构 */
export interface QueryAgentResult {
  success: boolean;
  response: string;
  safety_passed?: boolean;
  safety_action?: "BLOCK" | "REFER" | "ALLOW";
  safety_layer?: "rule_engine" | "llm";
  error?: string;
}

/** 欢迎消息文案 */
export const WELCOME_MESSAGE =
  "你好！我是 HOP（Health On Palm）健康助手。有什么关于运动、睡眠、恢复的问题，随时问我～";

/** 输入最大字数 */
export const CHAT_INPUT_MAX_LENGTH = 200;

/** 时间戳间隔（毫秒）：超过则显示时间分隔 */
export const TIME_LABEL_INTERVAL_MS = 5 * 60 * 1000;
