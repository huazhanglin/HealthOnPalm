/**
 * HealthKit → Supabase 同步 API
 */
import { callEdgeFunction } from "@/api/edge";
import type { HealthKitSyncPayload } from "@/lib/healthkit/types";

export interface SyncHealthkitResult {
  success: boolean;
  date?: string;
  workouts_count?: number;
  total_distance_m?: number;
  synced_types?: string[];
  error?: string;
}

/** 调用 sync-healthkit Edge Function，将设备数据写入云端 */
export async function uploadHealthKitSync(
  payload: HealthKitSyncPayload
): Promise<SyncHealthkitResult> {
  return callEdgeFunction<SyncHealthkitResult>(
    "sync-healthkit",
    payload as unknown as Record<string, unknown>
  );
}
