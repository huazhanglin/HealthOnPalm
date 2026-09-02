/**
 * HealthKit 业务适配层
 * App-iOS 走 UTS 原生插件；其他平台使用内置 stub
 */
import { uploadHealthKitSync } from "@/api/healthkit-sync";
import {
  DEFAULT_READ_TYPES,
  type HealthKitSyncPayload,
} from "@/lib/healthkit/types";

// #ifdef APP-PLUS
import {
  fetchTodayHealthKitJson,
  getHealthKitDiagnostics,
  isHealthKitAvailable,
  requestHealthKitAuthorization,
  type HealthKitTodayPayload,
} from "@/uni_modules/health-agent-healthkit";
// #endif

// #ifndef APP-PLUS
import type { HealthKitTodayPayload } from "@/lib/healthkit/types";

function isHealthKitAvailable(): boolean {
  return false;
}

function getHealthKitDiagnostics(): string {
  return "platform=non-app";
}

async function requestHealthKitAuthorization(_readTypes?: string[]): Promise<string> {
  throw new Error("HealthKit 仅支持 iOS App 真机");
}

async function fetchTodayHealthKitData(): Promise<HealthKitTodayPayload> {
  return {
    available: false,
    date: formatLocalDateYmd(new Date()),
    steps: 0,
    activeCalories: 0,
    standHours: 0,
    exerciseMinutes: 0,
    sleep: null,
    heartRate: null,
    error: "HealthKit 仅支持 iOS App 真机",
  };
}
// #endif

// #ifdef APP-PLUS
async function fetchTodayHealthKitData(): Promise<HealthKitTodayPayload> {
  const json = await fetchTodayHealthKitJson();
  const data = JSON.parse(json) as HealthKitTodayPayload;
  if (data.workouts == null) {
    data.workouts = [];
  }
  if (data.basalCalories == null) {
    data.basalCalories = 0;
  }
  if (data.totalDistance == null) {
    data.totalDistance = 0;
  }
  return data;
}
// #endif

export type { HealthKitSyncPayload, HealthKitTodayPayload };
export { DEFAULT_READ_TYPES };

/** localStorage 键名 */
export const HEALTHKIT_STORAGE_KEYS = {
  hasAuth: "hasHealthKitAuth",
  /** 授权 + 原生插件验证通过后才置 true，用于路由判断 */
  setupComplete: "healthKitSetupComplete",
  lastSyncAt: "healthKitLastSyncAt",
  /** 已向系统申请过的读取类型清单版本；升级后需再弹一次增量授权 */
  readTypesVersion: "healthKitReadTypesVersion",
} as const;

/** 与 DEFAULT_READ_TYPES 同步递增，已授权用户升级后会补申请新类型 */
export const HEALTHKIT_READ_TYPES_VERSION = 2;

/** 是否 iOS App 真机环境 */
export function isIosAppPlatform(): boolean {
  // #ifdef APP-PLUS
  try {
    const sys = uni.getSystemInfoSync();
    return sys.platform === "ios" || sys.osName === "iOS";
  } catch {
    return false;
  }
  // #endif
  // #ifndef APP-PLUS
  return false;
  // #endif
}

/** 是否已标记 HealthKit 授权 */
export function getHasHealthKitAuth(): boolean {
  try {
    return uni.getStorageSync(HEALTHKIT_STORAGE_KEYS.hasAuth) === true;
  } catch {
    return false;
  }
}

/** 保存 HealthKit 授权标记 */
export function setHasHealthKitAuth(value: boolean): void {
  uni.setStorageSync(HEALTHKIT_STORAGE_KEYS.hasAuth, value);
}

/** 是否已完成 HealthKit 引导（授权且原生可用） */
export function isHealthKitSetupComplete(): boolean {
  try {
    return uni.getStorageSync(HEALTHKIT_STORAGE_KEYS.setupComplete) === true;
  } catch {
    return false;
  }
}

/** 标记 HealthKit 引导完成 */
export function markHealthKitSetupComplete(): void {
  setHasHealthKitAuth(true);
  uni.setStorageSync(HEALTHKIT_STORAGE_KEYS.setupComplete, true);
  uni.setStorageSync(
    HEALTHKIT_STORAGE_KEYS.readTypesVersion,
    HEALTHKIT_READ_TYPES_VERSION
  );
}

/** 清除 HealthKit 本地授权/引导状态（闪退或基座不匹配时） */
export function clearHealthKitSetup(): void {
  setHasHealthKitAuth(false);
  try {
    uni.removeStorageSync(HEALTHKIT_STORAGE_KEYS.setupComplete);
    uni.removeStorageSync(HEALTHKIT_STORAGE_KEYS.readTypesVersion);
  } catch {
    // ignore
  }
}

/** 删除账号时清掉本机 HealthKit 标记（系统「健康」授权需用户自行关闭） */
export function clearHealthKitLocalState(): void {
  clearHealthKitSetup();
  try {
    uni.removeStorageSync(HEALTHKIT_STORAGE_KEYS.lastSyncAt);
    uni.removeStorageSync(HEALTHKIT_STORAGE_KEYS.hasAuth);
  } catch {
    // ignore
  }
}

/** 启动时校正：插件不可用则清除错误标记，避免跳过授权页 */
export function ensureHealthKitAuthState(): void {
  // #ifdef APP-PLUS
  if (!isIosAppPlatform()) return;
  try {
    if (isPluginMissingFromBase() || !isAvailable()) {
      if (getHasHealthKitAuth() || isHealthKitSetupComplete()) {
        clearHealthKitSetup();
      }
    }
  } catch (error) {
    console.warn("[healthkit] ensureHealthKitAuthState failed:", error);
    clearHealthKitSetup();
  }
  // #endif
}

/** 调用原生 HealthKit 前的安全守卫（避免标准基座闪退） */
export function assertHealthKitNativeReady(): void {
  if (!isIosAppPlatform()) {
    throw new Error("HealthKit 仅支持 iOS App 真机");
  }
  if (isPluginMissingFromBase()) {
    throw new Error(
      "HealthKit 原生插件不可用。Windows 调试 iOS 必须使用 HBuilderX「自定义调试基座」，请制作基座并在运行时选择「自定义调试基座」。"
    );
  }
  if (!isAvailable()) {
    throw new Error("HealthKit 在当前设备不可用");
  }
}

/** 最近一次同步时间（ISO 字符串） */
export function getLastSyncTime(): string | null {
  try {
    const value = uni.getStorageSync(HEALTHKIT_STORAGE_KEYS.lastSyncAt);
    return value ? String(value) : null;
  } catch {
    return null;
  }
}

/** 记录同步时间 */
export function setLastSyncTime(iso: string): void {
  uni.setStorageSync(HEALTHKIT_STORAGE_KEYS.lastSyncAt, iso);
}

/** 格式化最近同步时间展示 */
export function formatLastSyncTime(iso: string | null): string {
  if (!iso) return "尚未同步";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "尚未同步";

  const now = new Date();
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  const time = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  return isToday ? `今天 ${time}` : `${date.getMonth() + 1}月${date.getDate()}日 ${time}`;
}

/** 当前运行环境是否支持 HealthKit（iOS App 真机 + 原生插件可用） */
export function isAvailable(): boolean {
  // #ifdef APP-PLUS
  if (!isIosAppPlatform()) return false;
  try {
    return isHealthKitAvailable();
  } catch (error) {
    console.warn("[healthkit] isHealthKitAvailable failed:", error);
    return false;
  }
  // #endif
  // #ifndef APP-PLUS
  return false;
  // #endif
}

/** 是否应展示 HealthKit 授权引导（iOS 真机且未完成引导） */
export function shouldPromptHealthKitAuth(): boolean {
  if (!isIosAppPlatform()) return false;
  try {
    if (isPluginMissingFromBase()) return true;
    if (!isHealthKitSetupComplete()) return true;
    return false;
  } catch {
    return true;
  }
}

/** UTS 插件是否可能未编入自定义基座 */
export function isPluginMissingFromBase(): boolean {
  // #ifdef APP-PLUS
  if (!isIosAppPlatform()) return false;
  try {
    const diag = getHealthKitDiagnostics();
    return diag.includes("stub") || diag.includes("js-stub") || diag.includes("platform=non-app");
  } catch {
    return true;
  }
  // #endif
  return false;
}

/** 请求 HealthKit 读取授权 */
export async function authorize(
  readTypes: readonly string[] = DEFAULT_READ_TYPES
): Promise<"SUCCESS"> {
  assertHealthKitNativeReady();
  const result = await requestHealthKitAuthorization([...readTypes]);
  if (result !== "SUCCESS") {
    throw new Error(result);
  }
  uni.setStorageSync(
    HEALTHKIT_STORAGE_KEYS.readTypesVersion,
    HEALTHKIT_READ_TYPES_VERSION
  );
  return "SUCCESS";
}

/** 读取类型清单升级后，向系统补申请新增类型（只弹一次增量授权） */
export async function ensureLatestReadTypesAuthorized(): Promise<void> {
  if (!isHealthKitSetupComplete() || !isIosAppPlatform()) return;
  try {
    const current = Number(
      uni.getStorageSync(HEALTHKIT_STORAGE_KEYS.readTypesVersion) || 0
    );
    if (current >= HEALTHKIT_READ_TYPES_VERSION) return;
    await authorize();
  } catch (error) {
    console.warn("[healthkit] 增量授权新读取类型失败:", error);
  }
}

function unavailablePayload(error: string): HealthKitTodayPayload {
  return {
    available: false,
    date: formatLocalDateYmd(new Date()),
    steps: 0,
    activeCalories: 0,
    basalCalories: 0,
    standHours: 0,
    exerciseMinutes: 0,
    flightsClimbed: 0,
    sleep: null,
    heartRate: null,
    error,
  };
}

function formatLocalDateYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** 同日自动同步间隔：半小时 */
export const HEALTHKIT_AUTO_SYNC_TTL_MS = 30 * 60 * 1000;

function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * 是否需要从手机同步：未同步过、已跨日、或距上次超过 TTL。
 * 未完成授权 / 非 iOS 原生环境时返回 false。
 */
export function needsTodaySync(
  ttlMs: number = HEALTHKIT_AUTO_SYNC_TTL_MS
): boolean {
  if (!isHealthKitSetupComplete()) return false;
  if (!isIosAppPlatform()) return false;
  if (isPluginMissingFromBase() || !isAvailable()) return false;

  const last = getLastSyncTime();
  if (!last) return true;

  const lastDate = new Date(last);
  if (Number.isNaN(lastDate.getTime())) return true;

  const now = new Date();
  if (!isSameLocalDay(lastDate, now)) return true;
  return Date.now() - lastDate.getTime() >= ttlMs;
}

export interface EnsureTodaySyncResult {
  /** 本次是否实际发起了同步 */
  attempted: boolean;
  /** 云端上传是否成功 */
  uploaded: boolean;
  /** 是否因 TTL/未授权等跳过 */
  skipped: boolean;
  error?: string;
}

/**
 * 按需同步今日 HealthKit → 云端（半小时 / 跨日）。
 * 供首页、晨报生成前调用；失败不抛错，由调用方决定是否继续用旧数据。
 * force 时若 60 秒内刚同步过则跳过，避免首页+晨报连打两次。
 */
export async function ensureTodaySynced(options?: {
  force?: boolean;
  ttlMs?: number;
}): Promise<EnsureTodaySyncResult> {
  const force = options?.force === true;
  const ttlMs = options?.ttlMs ?? HEALTHKIT_AUTO_SYNC_TTL_MS;

  if (!force && !needsTodaySync(ttlMs)) {
    return { attempted: false, uploaded: false, skipped: true };
  }

  if (force) {
    const last = getLastSyncTime();
    if (last) {
      const elapsed = Date.now() - new Date(last).getTime();
      if (!Number.isNaN(elapsed) && elapsed < 60_000) {
        return { attempted: false, uploaded: false, skipped: true };
      }
    }
  }

  if (!isHealthKitSetupComplete() || !isIosAppPlatform()) {
    return { attempted: false, uploaded: false, skipped: true };
  }

  try {
    assertHealthKitNativeReady();
    const result = await syncTodayDataWithUpload();
    return {
      attempted: true,
      uploaded: result.uploaded,
      skipped: false,
      error: result.uploadError,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "同步失败";
    console.warn("[healthkit] ensureTodaySynced failed:", message);
    return {
      attempted: true,
      uploaded: false,
      skipped: false,
      error: message,
    };
  }
}

/** 读取当日 HealthKit 原始聚合数据 */
export async function fetchToday(): Promise<HealthKitTodayPayload> {
  if (!isIosAppPlatform()) {
    return unavailablePayload("HealthKit 仅支持 iOS App 真机");
  }
  if (isPluginMissingFromBase()) {
    return unavailablePayload(
      "HealthKit 插件不可用，请使用 HBuilderX 自定义调试基座运行"
    );
  }
  if (!isAvailable()) {
    return unavailablePayload("HealthKit 在当前设备不可用");
  }
  return fetchTodayHealthKitData();
}

/** 转为 sync-healthkit Edge Function 所需格式 */
export function toSyncPayload(data: HealthKitTodayPayload): HealthKitSyncPayload {
  return {
    date: data.date,
    steps: data.steps,
    activeCalories: data.activeCalories,
    basalCalories: data.basalCalories,
    standHours: data.standHours,
    exerciseMinutes: data.exerciseMinutes,
    flightsClimbed: data.flightsClimbed ?? null,
    sleepHours: data.sleep?.totalHours ?? null,
    deepSleepHours: data.sleep?.deepSleepHours ?? null,
    remSleepHours: data.sleep?.remSleepHours ?? null,
    lightSleepHours: data.sleep?.lightSleepHours ?? null,
    wakeUps: data.sleep?.wakeUps ?? null,
    restingHeartRate: data.heartRate?.resting ?? null,
    avgHeartRate: data.heartRate?.avg ?? null,
    maxHeartRate: data.heartRate?.max ?? null,
    walkingHeartRateAvg: data.heartRate?.walkingAvg ?? null,
    hrvMs: data.hrvMs ?? null,
    spo2Percent: data.spo2Percent ?? null,
    respiratoryRate: data.respiratoryRate ?? null,
    vo2Max: data.vo2Max ?? null,
    source: "healthkit",
    workouts: data.workouts,
    totalDistance: data.totalDistance,
  };
}

/** 授权 + 读取 + 标准化（不重复弹授权，供已授权场景） */
export async function syncTodayFromDevice(): Promise<HealthKitSyncPayload> {
  return syncTodayData();
}

export interface SyncTodayResult {
  payload: HealthKitSyncPayload;
  uploaded: boolean;
  uploadError?: string;
}

/** 读取设备数据、上传到 Supabase，并更新本地同步时间 */
export async function syncTodayData(): Promise<HealthKitSyncPayload> {
  const result = await syncTodayDataWithUpload();
  return result.payload;
}

/** 读取 + 上传（返回是否上传成功，便于 UI 提示） */
export async function syncTodayDataWithUpload(): Promise<SyncTodayResult> {
  assertHealthKitNativeReady();
  await ensureLatestReadTypesAuthorized();
  const raw = await fetchToday();
  if (raw.error) {
    console.warn("[healthkit]", raw.error);
  }
  const payload = toSyncPayload(raw);

  try {
    const uploadResult = await uploadHealthKitSync(payload);
    if (!uploadResult.success) {
      const message = uploadResult.error || "同步到云端失败";
      console.warn("[healthkit] upload failed:", message);
      setLastSyncTime(new Date().toISOString());
      return { payload, uploaded: false, uploadError: message };
    }
    setLastSyncTime(new Date().toISOString());
    return { payload, uploaded: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "同步到云端失败";
    console.warn("[healthkit] upload error:", message);
    // 本地读取仍成功，记录时间便于用户看到「已读设备」
    setLastSyncTime(new Date().toISOString());
    return { payload, uploaded: false, uploadError: message };
  }
}

/** 诊断信息（授权失败排查） */
export function diagnostics(): string {
  const parts: string[] = [];
  // #ifdef APP-PLUS
  try {
    const sys = uni.getSystemInfoSync();
    parts.push(`platform=${sys.platform}`);
    parts.push(`os=${sys.osName ?? "unknown"}`);
  } catch {
    parts.push("platform=unknown");
  }
  // #endif
  // #ifndef APP-PLUS
  parts.push("platform=non-app");
  // #endif

  if (isIosAppPlatform()) {
    try {
      parts.push(getHealthKitDiagnostics());
    } catch (error) {
      parts.push(`native-error=${error instanceof Error ? error.message : "unknown"}`);
    }
  }

  parts.push(`available=${isAvailable()}`);
  parts.push(`pluginMissing=${isPluginMissingFromBase()}`);
  return parts.join("; ");
}

/** 读取当日 HealthKit 原始聚合数据（页面展示用别名） */
export const getTodayHealthData = fetchToday;

/** 请求 HealthKit 读取授权（页面用别名） */
export const requestHealthKitAuth = authorize;
