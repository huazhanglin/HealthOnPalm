// #ifdef H5
import { supabase } from "@/api/supabase";
// #endif
import { restUpdate } from "@/api/supabase-rest";
import type { BriefFeedback } from "@/lib/health/types";
import { ensureAppAuthContext } from "@/utils/auth-session";

export interface BriefFeedbackResult {
  success: boolean;
  error?: string;
}

function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** 提交今日晨报反馈（采纳 / 忽略 / 修改） */
export async function submitBriefFeedback(
  userId: string,
  feedback: BriefFeedback,
  note?: string
): Promise<BriefFeedbackResult> {
  const today = getTodayDateString();
  const payload = {
    user_feedback: feedback,
    user_feedback_note: feedback === "modified" ? note?.trim() || null : null,
  };

  // #ifdef APP-PLUS
  const auth = await ensureAppAuthContext();
  if (!auth) {
    return { success: false, error: "未登录，请重新登录" };
  }
  try {
    const updated = await restUpdate(
      "daily_summaries",
      `user_id=eq.${userId}&date=eq.${today}`,
      auth.accessToken,
      payload
    );
    if (!updated) {
      return { success: false, error: "今日简报不存在，请先刷新晨报" };
    }
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "提交失败";
    console.error("[brief-feedback] submit failed:", message);
    return { success: false, error: message };
  }
  // #endif

  // #ifdef H5
  const { data, error } = await supabase
    .from("daily_summaries")
    .update(payload)
    .eq("user_id", userId)
    .eq("date", today)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[brief-feedback] submit failed:", error.message);
    return { success: false, error: error.message };
  }
  if (!data) {
    return { success: false, error: "今日简报不存在，请先刷新晨报" };
  }
  return { success: true };
  // #endif
}

/** 反馈按钮展示文案 */
export function getBriefFeedbackLabel(feedback: BriefFeedback): string {
  switch (feedback) {
    case "adopted":
      return "已采纳";
    case "ignored":
      return "已忽略";
    case "modified":
      return "已修改";
    default:
      return "已反馈";
  }
}
