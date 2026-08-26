<script setup lang="ts">
import { onLoad, onShow } from "@dcloudio/uni-app";
import { computed, ref } from "vue";
import { HaBrandLogo, HaButton, HaCard, HaLoading } from "@/components/common";
import {
  authorize,
  clearHealthKitSetup,
  diagnostics,
  ensureHealthKitAuthState,
  ensureTodaySynced,
  formatLastSyncTime,
  getLastSyncTime,
  getTodayHealthData,
  isAvailable,
  isHealthKitSetupComplete,
  isIosAppPlatform,
  isPluginMissingFromBase,
  markHealthKitSetupComplete,
  needsTodaySync,
  syncTodayDataWithUpload,
  type HealthKitTodayPayload,
} from "@/lib/healthkit";
import { invalidateFresh } from "@/utils/freshness";
import { useUserStore } from "@/stores/user";

type PageStatus = "guide" | "authorizing" | "success" | "failed" | "unavailable";
type EntryFrom = "first" | "profile" | "onboarding";

interface DataTypeItem {
  icon: string;
  label: string;
  desc: string;
}

const userStore = useUserStore();

function bumpHomeDataFreshness(): void {
  invalidateFresh(`home:${userStore.userId ?? ""}`);
}

const DATA_TYPES: DataTypeItem[] = [
  { icon: "👣", label: "步数与距离", desc: "步数、步行跑步距离、爬楼" },
  { icon: "😴", label: "睡眠", desc: "总时长、深睡、浅睡、REM" },
  { icon: "❤️", label: "心率", desc: "静息、平均、最高、步行心率" },
  { icon: "💓", label: "恢复指标", desc: "心率变异、血氧、呼吸、VO₂ Max" },
  { icon: "🔥", label: "能量消耗", desc: "活动卡路里与基础代谢" },
  { icon: "🏋️", label: "运动记录", desc: "锻炼分钟与各类 Workout" },
];

const pageStatus = ref<PageStatus>("guide");
const isRefreshing = ref(false);
const lastSyncAt = ref<string | null>(null);
const todayData = ref<HealthKitTodayPayload | null>(null);
const errorMessage = ref("");
const entryFrom = ref<EntryFrom>("first");

const healthKitAvailable = computed(() => isAvailable());
const isIosDevice = computed(() => isIosAppPlatform());
const pluginMissing = computed(() => isPluginMissingFromBase());
const lastSyncLabel = computed(() => formatLastSyncTime(lastSyncAt.value));
const showSyncSection = computed(
  () => pageStatus.value === "success" || isHealthKitSetupComplete()
);

const previewMetrics = computed(() => {
  const data = todayData.value;
  if (!data) return [];

  return [
    { label: "今日步数", value: formatNumber(data.steps), unit: "步" },
    {
      label: "睡眠时长",
      value: data.sleep?.totalHours != null ? data.sleep.totalHours.toFixed(1) : "--",
      unit: "小时",
    },
    {
      label: "静息心率",
      value: data.heartRate?.resting != null ? String(data.heartRate.resting) : "--",
      unit: "bpm",
    },
    {
      label: "活动卡路里",
      value: formatNumber(data.activeCalories),
      unit: "kcal",
    },
    {
      label: "基础代谢",
      value: formatNumber(data.basalCalories),
      unit: "kcal",
    },
    {
      label: "步行距离",
      value: data.totalDistance != null && data.totalDistance > 0
        ? (data.totalDistance / 1000).toFixed(2)
        : "--",
      unit: "km",
    },
    {
      label: "心率变异",
      value: data.hrvMs != null ? data.hrvMs.toFixed(1) : "--",
      unit: "ms",
    },
    {
      label: "血氧",
      value: data.spo2Percent != null ? data.spo2Percent.toFixed(1) : "--",
      unit: "%",
    },
  ];
});

/** 数字格式化 */
function formatNumber(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "--";
  return String(Math.round(value));
}

/** 读取本地同步状态 */
function loadSyncState(): void {
  lastSyncAt.value = getLastSyncTime();
}

/** 根据已有授权恢复页面状态 */
async function restoreAuthorizedState(): Promise<void> {
  ensureHealthKitAuthState();

  if (!isIosDevice.value) {
    pageStatus.value = "unavailable";
    errorMessage.value = "此设备不是 iOS，无法使用 HealthKit";
    return;
  }

  if (pluginMissing.value) {
    pageStatus.value = "unavailable";
    errorMessage.value =
      "HealthKit 原生插件未编入当前基座。请在 HBuilderX：运行 → 制作自定义调试基座（插件位于 src/uni_modules，会自动编入），完成后卸载旧 App 并重新安装。";
    return;
  }

  if (!healthKitAvailable.value) {
    pageStatus.value = "unavailable";
    errorMessage.value = "HealthKit 在当前设备不可用（请确认 iPhone 真机且系统健康 App 正常）";
    return;
  }

  if (!isHealthKitSetupComplete()) {
    pageStatus.value = "guide";
    return;
  }

  pageStatus.value = "success";
  loadSyncState();
}

/** 等待 HealthKit 系统弹窗完全关闭 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/** 授权成功后延迟读取并上传数据，避免与系统 UI 生命周期冲突 */
async function syncAfterAuthorization(): Promise<void> {
  await delay(900);
  const result = await syncTodayDataWithUpload();
  todayData.value = await getTodayHealthData();
  lastSyncAt.value = getLastSyncTime();
  markHealthKitSetupComplete();
  bumpHomeDataFreshness();
  if (!result.uploaded) {
    errorMessage.value = result.uploadError
      ? `设备数据已读取，云端同步失败：${result.uploadError}`
      : "设备数据已读取，云端同步失败，请稍后点「手动刷新」";
  }
}

/** 授权健康数据并触发首次同步 */
async function handleAuthorize(): Promise<void> {
  if (pluginMissing.value) {
    pageStatus.value = "unavailable";
    errorMessage.value =
      "HealthKit 原生插件不可用。请使用 HBuilderX 制作「自定义调试基座」，并在运行时选择「自定义调试基座」（标准基座不支持 UTS 插件）。";
    return;
  }

  if (!isAvailable()) {
    pageStatus.value = "unavailable";
    errorMessage.value = "此设备不支持 HealthKit，请使用 iOS 真机 App";
    uni.showToast({ title: "此设备不支持 HealthKit", icon: "none" });
    return;
  }

  pageStatus.value = "authorizing";
  errorMessage.value = "";

  try {
    await authorize();
    pageStatus.value = "success";
    uni.showToast({ title: "授权成功", icon: "success" });

    try {
      await syncAfterAuthorization();
    } catch (fetchError) {
      console.warn("[healthkit/authorize] 授权后读取数据失败:", fetchError);
      clearHealthKitSetup();
      errorMessage.value = "授权已成功，读取健康数据失败，请点击「手动刷新」重试";
    }
  } catch (error) {
    clearHealthKitSetup();
    console.error("[healthkit/authorize] 授权失败:", error);
    const message = error instanceof Error ? error.message : "授权失败，请重试";
    errorMessage.value = message;
    pageStatus.value = "failed";
    uni.showToast({ title: "授权失败，请重试", icon: "none" });
  }
}

/** 手动刷新同步 */
async function handleRefresh(): Promise<void> {
  if (!isAvailable()) {
    uni.showToast({ title: "HealthKit 不可用", icon: "none" });
    pageStatus.value = "unavailable";
    return;
  }

  if (!isHealthKitSetupComplete()) {
    uni.showToast({ title: "请先完成授权", icon: "none" });
    pageStatus.value = "guide";
    return;
  }

  isRefreshing.value = true;
  errorMessage.value = "";

  try {
    const result = await syncTodayDataWithUpload();
    todayData.value = await getTodayHealthData();
    lastSyncAt.value = getLastSyncTime();
    markHealthKitSetupComplete();
    pageStatus.value = "success";
    bumpHomeDataFreshness();
    if (result.uploaded) {
      uni.showToast({ title: "同步成功", icon: "success" });
    } else {
      errorMessage.value = result.uploadError || "云端同步失败";
      uni.showToast({ title: "已读设备，云端失败", icon: "none" });
    }
  } catch (error) {
    console.error("[healthkit/authorize] 同步失败:", error);
    const message = error instanceof Error ? error.message : "同步失败，请重试";
    errorMessage.value = message;
    uni.showToast({ title: "同步失败，请重试", icon: "none" });
  } finally {
    isRefreshing.value = false;
  }
}

/** 跳过授权 */
function handleSkip(): void {
  if (entryFrom.value === "profile") {
    uni.navigateBack();
    return;
  }
  uni.redirectTo({ url: "/pages/index/index" });
}

/** 授权成功后继续 */
function handleContinue(): void {
  handleSkip();
}

onLoad((options) => {
  const from = options?.from;
  if (from === "profile") {
    entryFrom.value = "profile";
  } else if (from === "onboarding") {
    entryFrom.value = "onboarding";
  } else {
    entryFrom.value = "first";
  }
});

onShow(async () => {
  if (!isHealthKitSetupComplete()) {
    clearHealthKitSetup();
  }
  loadSyncState();
  await restoreAuthorizedState();

  // 已授权且超过半小时/跨日：进入本页时自动同步
  if (
    pageStatus.value === "success" &&
    isHealthKitSetupComplete() &&
    needsTodaySync()
  ) {
    isRefreshing.value = true;
    errorMessage.value = "";
    try {
      const result = await ensureTodaySynced({ force: true });
      todayData.value = await getTodayHealthData();
      lastSyncAt.value = getLastSyncTime();
      bumpHomeDataFreshness();
      if (result.attempted && !result.uploaded && result.error) {
        errorMessage.value = `设备数据已读取，云端同步失败：${result.error}`;
      }
    } catch (error) {
      console.warn("[healthkit/authorize] 自动同步失败:", error);
    } finally {
      isRefreshing.value = false;
    }
  }
});
</script>

<template>
  <view class="page">
    <view class="main-body">
      <!-- 顶部说明 -->
      <view class="hero">
        <HaBrandLogo size="large" />
        <text class="hero-title">连接 Apple 健康</text>
        <text class="hero-desc">
          授权 HealthKit 后，HOP 可结合你的真实步数、睡眠与心率，生成更准确的恢复分与 AI 健康建议。
        </text>
      </view>

      <!-- HealthKit 不可用 -->
      <HaCard v-if="pageStatus === 'unavailable'" class="alert-card alert-card--warn">
        <text class="alert-title">HealthKit 不可用</text>
        <text class="alert-desc">{{ errorMessage }}</text>
        <text class="alert-meta">诊断：{{ diagnostics() }}</text>
      </HaCard>

      <!-- 读取数据类型 -->
      <HaCard v-if="isIosDevice && pageStatus !== 'unavailable'" class="section-card">
        <text class="section-title">我们将读取以下数据</text>
        <view class="data-grid">
          <view v-for="item in DATA_TYPES" :key="item.label" class="data-item">
            <text class="data-icon">{{ item.icon }}</text>
            <view class="data-meta">
              <text class="data-label">{{ item.label }}</text>
              <text class="data-desc">{{ item.desc }}</text>
            </view>
          </view>
        </view>
      </HaCard>

      <!-- 隐私说明 -->
      <HaCard v-if="isIosDevice && pageStatus !== 'unavailable'" class="section-card privacy-card">
        <view class="privacy-row">
          <text class="privacy-icon">🔒</text>
          <view class="privacy-meta">
            <text class="privacy-title">隐私保护</text>
            <text class="privacy-desc">
              健康数据在设备本地读取与处理，仅用于生成你的个性化 HOP 建议，不会向第三方出售或分享。
            </text>
          </view>
        </view>
      </HaCard>

      <!-- 授权中 -->
      <view v-if="pageStatus === 'authorizing'" class="loading-block">
        <HaLoading text="正在请求权限..." />
      </view>

      <!-- 授权成功 -->
      <HaCard v-if="pageStatus === 'success'" class="section-card result-card result-card--success">
        <view class="result-header">
          <text class="result-icon">✅</text>
          <text class="result-title">授权成功</text>
        </view>
        <text class="result-desc">已读取今日健康数据，可前往首页查看恢复分与晨报。</text>

        <view v-if="previewMetrics.length" class="metrics-grid">
          <view v-for="metric in previewMetrics" :key="metric.label" class="metric-item">
            <text class="metric-value">
              {{ metric.value }}<text class="metric-unit">{{ metric.unit }}</text>
            </text>
            <text class="metric-label">{{ metric.label }}</text>
          </view>
        </view>
      </HaCard>

      <!-- 授权失败 -->
      <HaCard v-if="pageStatus === 'failed'" class="section-card result-card result-card--failed">
        <view class="result-header">
          <text class="result-icon">⚠️</text>
          <text class="result-title">授权未完成</text>
        </view>
        <text class="result-desc">
          {{ errorMessage || "你可以在系统「设置 → 健康 → 数据访问权限」中开启，或稍后再试。" }}
        </text>
      </HaCard>

      <!-- 同步状态 -->
      <HaCard v-if="showSyncSection && pageStatus !== 'unavailable'" class="section-card">
        <view class="sync-header">
          <text class="section-title sync-title">同步状态</text>
          <button
            class="refresh-btn"
            :disabled="isRefreshing || pageStatus === 'authorizing'"
            @tap="handleRefresh"
          >
            {{ isRefreshing ? "同步中..." : "手动刷新" }}
          </button>
        </view>
        <text class="sync-time">最近同步：{{ lastSyncLabel }}</text>
        <text v-if="errorMessage && pageStatus === 'success'" class="sync-error">{{ errorMessage }}</text>
      </HaCard>

      <!-- 操作按钮 -->
      <view v-if="pageStatus === 'guide'" class="actions">
        <HaButton type="primary" size="large" @tap="handleAuthorize">
          授权健康数据
        </HaButton>
        <HaButton type="text" size="medium" @click="handleSkip">稍后授权</HaButton>
      </view>

      <view v-else-if="pageStatus === 'failed'" class="actions">
        <HaButton type="primary" size="large" @tap="handleAuthorize">
          重新授权
        </HaButton>
        <HaButton type="text" size="medium" @click="handleSkip">稍后授权</HaButton>
      </view>

      <view v-else-if="pageStatus === 'success'" class="actions">
        <HaButton type="primary" size="large" @click="handleContinue">
          {{ entryFrom === "profile" ? "返回" : "进入首页" }}
        </HaButton>
        <HaButton
          type="default"
          size="medium"
          :loading="isRefreshing"
          :disabled="isRefreshing"
          @click="handleRefresh"
        >
          再次同步
        </HaButton>
      </view>

      <view v-else-if="pageStatus === 'unavailable'" class="actions">
        <HaButton type="primary" size="large" @click="handleSkip">我知道了</HaButton>
      </view>

      <view class="bottom-spacer" />
    </view>
  </view>
</template>

<style scoped>
.page {
  height: 100vh;
  min-height: 100vh;
  background-color: #f8fafc;
  overflow: hidden;
}

.main-body {
  height: 100%;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding: 24rpx 32rpx 0;
  box-sizing: border-box;
}

.hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24rpx 16rpx;
  text-align: center;
  gap: 20rpx;
}

.hero-title {
  font-size: 40rpx;
  font-weight: 700;
  color: #0f172a;
}

.hero-desc {
  font-size: 28rpx;
  line-height: 1.6;
  color: #64748b;
}

.section-card {
  margin-bottom: 24rpx;
}

.section-title {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: #0f172a;
  margin-bottom: 20rpx;
}

.data-grid {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.data-item {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
}

.data-icon {
  width: 64rpx;
  font-size: 36rpx;
  line-height: 1.2;
  margin-right: 16rpx;
}

.data-meta {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.data-label {
  font-size: 28rpx;
  font-weight: 600;
  color: #334155;
}

.data-desc {
  margin-top: 4rpx;
  font-size: 24rpx;
  color: #94a3b8;
}

.privacy-card {
  background: linear-gradient(180deg, #ffffff 0%, #f0fdfa 100%);
}

.privacy-row {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
}

.privacy-icon {
  font-size: 36rpx;
  margin-right: 16rpx;
}

.privacy-title {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #0f766e;
  margin-bottom: 8rpx;
}

.privacy-desc {
  font-size: 26rpx;
  line-height: 1.6;
  color: #475569;
}

.loading-block {
  margin: 16rpx 0 32rpx;
}

.result-card--success {
  border: 2rpx solid #99f6e4;
}

.result-card--failed {
  border: 2rpx solid #fecaca;
}

.result-header {
  display: flex;
  flex-direction: row;
  align-items: center;
  margin-bottom: 12rpx;
}

.result-icon {
  font-size: 36rpx;
  margin-right: 12rpx;
}

.result-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #0f172a;
}

.result-desc {
  display: block;
  font-size: 26rpx;
  line-height: 1.6;
  color: #64748b;
  margin-bottom: 24rpx;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16rpx;
}

.metric-item {
  background-color: #f8fafc;
  border-radius: 16rpx;
  padding: 20rpx;
}

.metric-value {
  display: block;
  font-size: 34rpx;
  font-weight: 700;
  color: #0d9488;
}

.metric-unit {
  font-size: 22rpx;
  font-weight: 500;
  color: #64748b;
  margin-left: 4rpx;
}

.metric-label {
  display: block;
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #94a3b8;
}

.alert-card {
  margin-bottom: 24rpx;
}

.alert-card--warn {
  background-color: #fffbeb;
}

.alert-title {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: #b45309;
  margin-bottom: 12rpx;
}

.alert-desc,
.alert-meta {
  display: block;
  font-size: 26rpx;
  line-height: 1.6;
  color: #92400e;
}

.alert-meta {
  margin-top: 12rpx;
  font-size: 22rpx;
  color: #a16207;
}

.sync-header {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8rpx;
}

.sync-title {
  margin-bottom: 0;
}

.refresh-btn {
  height: 56rpx;
  line-height: 56rpx;
  padding: 0 24rpx;
  font-size: 24rpx;
  color: #0d9488;
  background-color: #f0fdfa;
  border-radius: 999rpx;
  border: none;
}

.refresh-btn::after {
  border: none;
}

.refresh-btn[disabled] {
  color: #94a3b8;
  background-color: #f1f5f9;
}

.sync-time {
  display: block;
  font-size: 26rpx;
  color: #64748b;
}

.sync-error {
  display: block;
  margin-top: 12rpx;
  font-size: 24rpx;
  color: #ef4444;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  margin-top: 8rpx;
  margin-bottom: 24rpx;
}

.bottom-spacer {
  height: 48rpx;
}
</style>
