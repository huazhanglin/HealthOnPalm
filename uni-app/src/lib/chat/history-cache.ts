import type { ChatMessage, ChatMessageRole } from "@/types/chat";
import { uniAuthStorage, getStorageJson, setStorageJson } from "@/utils/storage";

export const CHAT_SNAPSHOT_STORAGE_KEY = "health-agent-chat-snapshot";

export interface StoredChatMessage {
  id: string;
  role: ChatMessageRole;
  content: string;
  timestamp: string;
}

export interface ChatSnapshot {
  userId: string;
  date: string;
  messages: StoredChatMessage[];
  updatedAt: number;
}

function todayYmd(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isStoredMessage(value: unknown): value is StoredChatMessage {
  if (!value || typeof value !== "object") return false;
  const msg = value as StoredChatMessage;
  return (
    typeof msg.id === "string" &&
    typeof msg.content === "string" &&
    typeof msg.timestamp === "string" &&
    (msg.role === "user" || msg.role === "assistant" || msg.role === "system")
  );
}

function isChatSnapshot(value: unknown): value is ChatSnapshot {
  if (!value || typeof value !== "object") return false;
  const snap = value as ChatSnapshot;
  return (
    typeof snap.userId === "string" &&
    typeof snap.date === "string" &&
    typeof snap.updatedAt === "number" &&
    Array.isArray(snap.messages) &&
    snap.messages.every(isStoredMessage)
  );
}

export function chatSnapshotTodayYmd(): string {
  return todayYmd();
}

export function toStoredChatMessages(messages: ChatMessage[]): StoredChatMessage[] {
  return messages
    .filter((item) => !item.isTyping)
    .map((item) => ({
      id: item.id,
      role: item.role,
      content: item.content,
      timestamp: item.timestamp,
    }));
}

export function fromStoredChatMessages(
  messages: StoredChatMessage[]
): ChatMessage[] {
  return messages.map((item) => ({
    id: item.id,
    role: item.role,
    content: item.content,
    displayContent: item.content,
    timestamp: item.timestamp,
  }));
}

/** 读取仍属今日、且属于该用户的本地对话 */
export function readPersistedChatSnapshot(userId: string): ChatSnapshot | null {
  const stored = getStorageJson<unknown>(CHAT_SNAPSHOT_STORAGE_KEY);
  if (!isChatSnapshot(stored)) return null;
  if (stored.userId !== userId) return null;
  if (stored.date !== todayYmd()) {
    clearPersistedChatSnapshot();
    return null;
  }
  return stored;
}

export function writePersistedChatSnapshot(
  userId: string,
  messages: ChatMessage[]
): void {
  const snapshot: ChatSnapshot = {
    userId,
    date: todayYmd(),
    messages: toStoredChatMessages(messages),
    updatedAt: Date.now(),
  };
  setStorageJson(CHAT_SNAPSHOT_STORAGE_KEY, snapshot);
}

export function clearPersistedChatSnapshot(): void {
  uniAuthStorage.removeItem(CHAT_SNAPSHOT_STORAGE_KEY);
}
