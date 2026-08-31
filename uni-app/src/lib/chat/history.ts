// #ifdef H5
import { supabase } from "@/api/supabase";
// #endif
import {
  ensureAccessToken,
  restSelectMaybeSingle,
} from "@/api/supabase-rest";
import { chatSnapshotTodayYmd } from "@/lib/chat/history-cache";
import type { ChatMessageRole } from "@/types/chat";

export interface ConversationMessageRow {
  role: ChatMessageRole;
  content: string;
  timestamp?: string;
}

interface ConversationRow {
  messages: ConversationMessageRow[] | null;
  message_count: number | null;
}

function utcYmd(): string {
  return new Date().toISOString().split("T")[0];
}

function normalizeMessages(
  rows: ConversationMessageRow[] | null | undefined
): ConversationMessageRow[] {
  if (!Array.isArray(rows)) return [];
  return rows.filter(
    (item) =>
      item &&
      typeof item.content === "string" &&
      (item.role === "user" || item.role === "assistant" || item.role === "system")
  );
}

async function fetchConversationMessagesByDate(
  userId: string,
  date: string
): Promise<ConversationMessageRow[]> {
  // #ifdef APP-PLUS
  const accessToken = await ensureAccessToken();
  if (!accessToken) return [];
  const row = await restSelectMaybeSingle<ConversationRow>(
    "conversations",
    `user_id=eq.${userId}&date=eq.${date}&select=messages,message_count`,
    accessToken
  );
  return normalizeMessages(row?.messages);
  // #endif

  // #ifdef H5
  const { data, error } = await supabase
    .from("conversations")
    .select("messages, message_count")
    .eq("user_id", userId)
    .eq("date", date)
    .maybeSingle();
  if (error) {
    console.warn("[chat] 读取今日对话失败:", error.message);
    return [];
  }
  return normalizeMessages((data as ConversationRow | null)?.messages);
  // #endif

  return [];
}

/**
 * 直读今日 conversations，避开 memory-working 冷启动。
 * 不存在记录时返回空数组（由界面展示欢迎语），不在客户端建行。
 * Edge 写入曾用 UTC 日期，凌晨会与本地日不一致，因此本地日为空时再读 UTC 日。
 */
export async function fetchTodayConversationMessages(
  userId: string
): Promise<ConversationMessageRow[]> {
  const localDate = chatSnapshotTodayYmd();
  const localMessages = await fetchConversationMessagesByDate(userId, localDate);
  if (localMessages.length > 0) return localMessages;

  const utcDate = utcYmd();
  if (utcDate === localDate) return [];
  return fetchConversationMessagesByDate(userId, utcDate);
}
