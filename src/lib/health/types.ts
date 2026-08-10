/**
 * 健康数据相关类型定义
 * 后续对接 Supabase 表结构时在此扩展
 */

/** 用户健康档案摘要（MVP 占位） */
export interface HealthProfileSummary {
  /** 用户 ID */
  userId: string;
  /** 最近同步时间（ISO 8601） */
  lastSyncedAt: string | null;
}
