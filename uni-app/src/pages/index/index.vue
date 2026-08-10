<script setup lang="ts">
import { onReady, onShow } from "@dcloudio/uni-app";
import { computed, ref } from "vue";
import { agentApi } from "@/api/agent";
import HomeTabBar from "@/components/HomeTabBar.vue";
import { HaAvatar, HaLoading } from "@/components/common";
import {
  createEmptyTodayHealthMetrics,
  fetchHomePageData,
  fetchTodayDailySummary,
  formatMetricsSourceLabel,
  getBriefFeedbackLabel,
  splitTodayMetricDisplayItems,
  submitBriefFeedback,
  toMorningBriefData,
} from "@/lib/health";
import type {
  BriefFeedback,
  MetricsDataSource,
  MorningBriefData,
  TodayHealthMetrics,
  WorkoutReadiness,
} from "@/lib/health/types";
import { useUserStore } from "@/stores/user";
import { closeSplashscreen } from "@/utils/splash";
import { ensureOnboarded } from "@/utils/onboarding";
import { HOME_DATA_TTL_MS, isFresh, markFresh } from "@/utils/freshness";
import { hideLoading, showErrorToast, showLoading } from "@/utils/storage";

const userStore = useUserStore();

const isPageLoading = ref(false);
const isBriefLoading = ref(false);
const isFeedbackSubmitting = ref(false);
const briefError = ref(false);
const briefErrorMessage = ref("");
const briefData = ref<MorningBriefData | null>(null);
const showModifyPanel = ref(false);
const modifyNote = ref("");
const metricsSource = ref<MetricsDataSource>("unknown");
const qualityScore = ref(0);
const metricsExpanded = ref(false);

const metrics = ref<TodayHealthMetrics>(createEmptyTodayHealthMetrics());

const metricsSourceLabel = computed(() =>
  formatMetricsSourceLabel(metricsSource.value)
);

const metricSections = computed(() =>
  splitTodayMetricDisplayItems(metrics.value)
);

const primaryMetricItems = computed(() => metricSections.value.primary);
const moreMetricItems = computed(() => metricSections.value.more);

function toggleMetricsExpanded(): void {
  metricsExpanded.value = !metricsExpanded.value;
}

/** 昵称：优先档案昵称，否则邮箱前缀 / 旧手机号末四位 */
const displayName = computed(() => {
  if (userStore.profile?.nickname) return userStore.profile.nickname;
  const mail = userStore.email ?? "";
  if (mail.includes("@")) return mail.split("@")[0] || "HOP 用户";
  const phone = userStore.phone ?? "";
  if (phone.length >= 4) return `用户${phone.slice(-4)}`;
  return "健康用户";
});

/** 头像 URL，无则使用品牌占位 */
const avatarUrl = computed(() => userStore.profile?.avatar_url ?? "");

/** 恢复分环形进度角度 */
const recoveryProgressDeg = computed(() => {
  const score = briefData.value?.recoveryScore ?? 0;
  return Math.min(Math.max(score, 0), 100) * 3.6;
});

/** 恢复分颜色：≥80 绿 / 50-79 橙 / <50 灰 */
const recoveryColor = computed(() => {
  const score = briefData.value?.recoveryScore ?? 0;
  if (score >= 80) return "#10b981";
  if (score >= 50) return "#f59e0b";
  return "#94a3b8";
});

/** 恢复分环形背景 */
const recoveryRingStyle = computed(() => ({
  background: `conic-gradient(${recoveryColor.value} 0deg, ${recoveryColor.value} ${recoveryProgressDeg.value}deg, #e2e8f0 ${recoveryProgressDeg.value}deg, #e2e8f0 360deg)`,
}));

/** 训练建议展示配置 */
const workoutMeta = computed(() => {
  const readiness = briefData.value?.workoutReadiness;
  return getWorkoutMeta(readiness);
});

/** 是否显示空状态 */
const showBriefEmpty = computed(
  () => !isBriefLoading.value && !briefError.value && !briefData.value
);

const hasFeedback = computed(() => !!briefData.value?.feedback);

const feedbackDoneLabel = computed(() => {
  const feedback = briefData.value?.feedback;
  if (!feedback) return "已反馈";
  return getBriefFeedbackLabel(feedback);
});

/** 训练建议文案与样式 */
function getWorkoutMeta(readiness?: WorkoutReadiness | null) {
  switch (readiness) {
    case "train":
      return { emoji: "💪", label: "训练", color: "#10b981", bg: "#ecfdf5" };
    case "light":
      return { emoji: "☀️", label: "轻度", color: "#f59e0b", bg: "#fffbeb" };
    case "rest":
      return { emoji: "😴", label: "休息", color: "#94a3b8", bg: "#f1f5f9" };
    default:
      return { emoji: "—", label: "暂无", color: "#94a3b8", bg: "#f1f5f9" };
  }
}

/** 加载晨间简报：优先读缓存，必要时调用 Edge Function */
async function loadMorningBrief(forceRefresh = false): Promise<void> {
  const uid = userStore.userId;
  if (!uid) return;

  isBriefLoading.value = true;
  briefError.value = false;
  briefErrorMessage.value = "";
  showModifyPanel.value = false;
  modifyNote.value = "";

  try {
    if (!forceRefresh) {
      const cached = await fetchTodayDailySummary(uid);
      const fromCache = cached ? toMorningBriefData(cached) : null;
      if (fromCache) {
        briefData.value = fromCache;
        return;
      }
    }

    const result = await agentApi.getMorningBrief(uid);
    // 刷新后重新读一次，保留已有反馈（若 upsert 未覆盖）
    const cached = await fetchTodayDailySummary(uid);
    const fromCache = cached ? toMorningBriefData(cached) : null;
    briefData.value = fromCache
      ? { ...result, feedback: fromCache.feedback, feedbackNote: fromCache.feedbackNote }
      : result;
  } catch (error) {
    console.error("[index] 加载晨间简报失败:", error);
    const message = error instanceof Error ? error.message : "加载失败，请重试";
    briefError.value = true;
    briefErrorMessage.value = message;
    showErrorToast(message);
  } finally {
    isBriefLoading.value = false;
  }
}

/** 刷新晨间简报（并连带刷新首页指标） */
function refreshMorningBrief(): void {
  void ensureAuthAndLoad({ force: true });
}

/** 错误态点击重试 */
function retryMorningBrief(): void {
  void loadMorningBrief(false);
}

async function handleFeedback(feedback: BriefFeedback, note?: string): Promise<void> {
  const uid = userStore.userId;
  if (!uid || !briefData.value || hasFeedback.value || isFeedbackSubmitting.value) {
    return;
  }

  isFeedbackSubmitting.value = true;
  showLoading("提交中...");
  try {
    const result = await submitBriefFeedback(uid, feedback, note);
    if (!result.success) {
      showErrorToast(result.error ?? "提交失败");
      return;
    }
    briefData.value = {
      ...briefData.value,
      feedback,
      feedbackNote: note?.trim() || null,
    };
    showModifyPanel.value = false;
    modifyNote.value = "";
    uni.showToast({ title: "感谢反馈", icon: "success" });
  } catch (error) {
    console.error("[index] brief feedback failed:", error);
    showErrorToast("提交失败，请稍后重试");
  } finally {
    isFeedbackSubmitting.value = false;
    hideLoading();
  }
}

function onAdopt(): void {
  void handleFeedback("adopted");
}

function onIgnore(): void {
  void handleFeedback("ignored");
}

function onModifyTap(): void {
  if (hasFeedback.value || isFeedbackSubmitting.value) return;
  showModifyPanel.value = !showModifyPanel.value;
}

function onModifyConfirm(): void {
  const note = modifyNote.value.trim();
  if (!note) {
    showErrorToast("请填写想怎么改");
    return;
  }
  void handleFeedback("modified", note);
}

/** 校验登录并加载首页数据（有短时缓存，避免每次 onShow 全量刷新） */
async function ensureAuthAndLoad(options: { force?: boolean } = {}): Promise<void> {
  if (!userStore.isLoggedIn) {
    uni.reLaunch({ url: "/pages/login/index" });
    return;
  }

  const onboarded = await ensureOnboarded();
  if (!onboarded) return;

  const uid = userStore.userId;
  if (!uid) {
    uni.reLaunch({ url: "/pages/login/index" });
    return;
  }

  const cacheKey = `home:${uid}`;
  const force = options.force === true;
  const hasCachedView = !!briefData.value;

  if (!force && hasCachedView && isFresh(cacheKey, HOME_DATA_TTL_MS)) {
    return;
  }

  const blocking = !hasCachedView;
  isPageLoading.value = true;
  if (blocking) {
    showLoading("加载中...");
  }

  try {
    // 先跑晨报（可能写库），再读指标，避免读到被 Mock 覆盖前的瞬时值或竞态
    await loadMorningBrief(force);
    const pageData = await fetchHomePageData(uid);
    metrics.value = pageData.metrics;
    metricsSource.value = pageData.metricsSource;
    qualityScore.value = pageData.qualityScore;
    markFresh(cacheKey);
  } catch (error) {
    console.error("[index] 加载首页数据失败:", error);
    if (blocking || force) {
      showErrorToast("数据加载失败，请下拉刷新重试");
    }
  } finally {
    isPageLoading.value = false;
    if (blocking) {
      hideLoading();
    }
  }
}

/** 进入 AI 对话 */
function openChat(): void {
  uni.navigateTo({ url: "/pages/chat/index" });
}

onReady(() => {
  closeSplashscreen();
});

onShow(() => {
  void ensureAuthAndLoad({ force: false });
});
</script>

<template>
  <view class="page">
    <!-- 顶部导航栏 -->
    <view class="nav-bar">
      <view class="status-bar" />
      <view class="nav-content">
        <view class="user-info">
          <HaAvatar :src="avatarUrl" size="medium" fallback="brand" />
          <view class="user-text">
            <text class="greeting">你好，</text>
            <text class="nickname">{{ displayName }}</text>
          </view>
        </view>
        <text class="nav-date">{{ isPageLoading ? "同步中..." : "今日" }}</text>
      </view>
    </view>

    <view class="main-body">
      <!-- 晨间简报卡片 -->
      <view class="card brief-card">
        <view class="card-header">
          <text class="card-title">☀️ 今日晨报</text>
          <view
            class="refresh-btn"
            :class="{ 'refresh-btn--loading': isBriefLoading }"
            @tap="refreshMorningBrief"
          >
            <text class="refresh-icon">↻</text>
            <text class="refresh-text">{{ isBriefLoading ? "刷新中" : "刷新" }}</text>
          </view>
        </view>

        <view v-if="isBriefLoading && !briefData" class="brief-loading">
          <HaLoading text="生成晨报中..." />
        </view>

        <view v-else-if="briefError" class="brief-state" @tap="retryMorningBrief">
          <text class="brief-state-text">{{ briefErrorMessage || "加载失败，点击重试" }}</text>
        </view>

        <view v-else-if="showBriefEmpty" class="brief-state">
          <text class="brief-state-text">暂无简报，稍后再来看看</text>
        </view>

        <view v-else-if="briefData" class="brief-content">
          <view class="brief-top">
            <view class="recovery-wrap">
              <view class="recovery-ring" :style="recoveryRingStyle">
                <view class="recovery-inner">
                  <text class="recovery-score" :style="{ color: recoveryColor }">
                    {{ Math.round(briefData.recoveryScore) }}
                  </text>
                  <text class="recovery-unit">/100</text>
                </view>
              </view>
              <text class="recovery-label">恢复分</text>
            </view>

            <view
              class="workout-badge"
              :style="{ backgroundColor: workoutMeta.bg, borderColor: workoutMeta.color }"
            >
              <text class="workout-emoji">{{ workoutMeta.emoji }}</text>
              <view class="workout-text">
                <text class="workout-title" :style="{ color: workoutMeta.color }">
                  训练建议
                </text>
                <text class="workout-value" :style="{ color: workoutMeta.color }">
                  {{ workoutMeta.label }}
                </text>
              </view>
            </view>
          </view>

          <text class="brief-text">{{ briefData.brief }}</text>

          <view class="feedback-block">
            <view class="feedback-divider" />
            <text v-if="hasFeedback" class="feedback-done">{{ feedbackDoneLabel }}</text>
            <template v-else>
              <text class="feedback-prompt">这条建议对你有帮助吗？</text>
              <view class="feedback-row">
                <view
                  class="feedback-btn feedback-btn--adopt"
                  :class="{ disabled: isFeedbackSubmitting }"
                  @tap="onAdopt"
                >
                  <text>👍 采纳</text>
                </view>
                <view
                  class="feedback-btn feedback-btn--ignore"
                  :class="{ disabled: isFeedbackSubmitting }"
                  @tap="onIgnore"
                >
                  <text>👎 忽略</text>
                </view>
                <view
                  class="feedback-btn feedback-btn--modify"
                  :class="{ disabled: isFeedbackSubmitting, active: showModifyPanel }"
                  @tap="onModifyTap"
                >
                  <text>✏️ 修改</text>
                </view>
              </view>
              <view v-if="showModifyPanel" class="modify-panel">
                <textarea
                  v-model="modifyNote"
                  class="modify-input"
                  maxlength="200"
                  placeholder="例如：今天想做瑜伽而不是跑步"
                />
                <view class="modify-actions">
                  <text class="modify-cancel" @tap="showModifyPanel = false">取消</text>
                  <view
                    class="modify-confirm"
                    :class="{ disabled: isFeedbackSubmitting }"
                    @tap="onModifyConfirm"
                  >
                    <text>提交修改</text>
                  </view>
                </view>
              </view>
            </template>
          </view>
        </view>
      </view>

      <!-- 今日数据卡片 -->
      <view class="card metrics-card">
        <view class="metrics-header">
          <text class="card-title">今日数据</text>
          <text
            class="source-badge"
            :class="{
              'source-badge--real': metricsSource === 'healthkit',
              'source-badge--hybrid': metricsSource === 'hybrid',
              'source-badge--mock': metricsSource === 'mock' || metricsSource === 'unknown',
            }"
          >
            {{ metricsSourceLabel }}
            <text v-if="qualityScore > 0" class="source-score">{{ qualityScore }}%</text>
          </text>
        </view>
        <view class="metrics-grid">
          <view
            v-for="item in primaryMetricItems"
            :key="item.key"
            class="metric-cell"
          >
            <text class="metric-value">{{ item.value }}</text>
            <text class="metric-unit">{{ item.unit }}</text>
            <text class="metric-label">{{ item.label }}</text>
          </view>
        </view>

        <view v-if="metricsExpanded" class="metrics-grid metrics-grid--more">
          <view
            v-for="item in moreMetricItems"
            :key="item.key"
            class="metric-cell"
          >
            <text class="metric-value">{{ item.value }}</text>
            <text class="metric-unit">{{ item.unit }}</text>
            <text class="metric-label">{{ item.label }}</text>
          </view>
        </view>

        <view class="metrics-more-btn" @tap="toggleMetricsExpanded">
          <text class="metrics-more-text">
            {{ metricsExpanded ? "收起" : "更多" }}
          </text>
          <text class="metrics-more-arrow">{{ metricsExpanded ? "▲" : "▼" }}</text>
        </view>
      </view>

      <!-- AI 对话入口 -->
      <button class="chat-btn" @tap="openChat">
        <text class="chat-btn-icon">💬</text>
        <view class="chat-btn-text">
          <text class="chat-btn-title">与 HOP 对话</text>
          <text class="chat-btn-desc">获取今日健康建议与训练指导</text>
        </view>
        <text class="chat-btn-arrow">›</text>
      </button>

      <!-- 底部 Tab 占位 -->
      <view class="tab-placeholder" />
    </view>

    <HomeTabBar active="home" />
  </view>
</template>

<style scoped>
.page {
  height: 100vh;
  min-height: 100vh;
  background-color: #f8fafc;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.nav-bar {
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
  justify-content: space-between;
  padding: 20rpx 32rpx 24rpx;
}

.user-info {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 20rpx;
}

.user-text {
  display: flex;
  flex-direction: column;
}

.greeting {
  font-size: 24rpx;
  color: #64748b;
}

.nickname {
  font-size: 34rpx;
  font-weight: 600;
  color: #0f172a;
}

.nav-date {
  font-size: 26rpx;
  color: #0d9488;
  font-weight: 500;
}

.main-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding: 24rpx 32rpx 0;
  box-sizing: border-box;
}

.card {
  background-color: #ffffff;
  border-radius: 24rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 8rpx 32rpx rgba(15, 23, 42, 0.06);
}

.card-header {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}

.card-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #0f172a;
}

.refresh-btn {
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 8rpx 20rpx;
  border-radius: 20rpx;
  background-color: #f8fafc;
}

.refresh-btn--loading {
  opacity: 0.6;
}

.refresh-icon {
  font-size: 28rpx;
  color: #0d9488;
  margin-right: 6rpx;
}

.refresh-text {
  font-size: 24rpx;
  color: #0d9488;
}

.brief-loading {
  padding: 24rpx 0 8rpx;
}

.brief-state {
  padding: 48rpx 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.brief-state-text {
  font-size: 28rpx;
  color: #64748b;
}

.brief-content {
  display: flex;
  flex-direction: column;
}

.brief-top {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 28rpx;
}

.recovery-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.recovery-ring {
  width: 160rpx;
  height: 160rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.recovery-inner {
  width: 128rpx;
  height: 128rpx;
  border-radius: 50%;
  background-color: #ffffff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.recovery-score {
  font-size: 40rpx;
  font-weight: 700;
  line-height: 1.1;
}

.recovery-unit {
  font-size: 20rpx;
  color: #94a3b8;
  margin-top: 2rpx;
}

.recovery-label {
  margin-top: 12rpx;
  font-size: 24rpx;
  color: #64748b;
}

.workout-badge {
  flex: 1;
  margin-left: 32rpx;
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 24rpx 28rpx;
  border-radius: 20rpx;
  border: 2rpx solid;
}

.workout-emoji {
  font-size: 48rpx;
  margin-right: 20rpx;
}

.workout-text {
  display: flex;
  flex-direction: column;
}

.workout-title {
  font-size: 24rpx;
  opacity: 0.85;
}

.workout-value {
  margin-top: 4rpx;
  font-size: 34rpx;
  font-weight: 700;
}

.brief-text {
  font-size: 28rpx;
  line-height: 1.7;
  color: #475569;
}

.feedback-block {
  margin-top: 28rpx;
}

.feedback-divider {
  height: 1rpx;
  background-color: #e2e8f0;
  margin-bottom: 20rpx;
}

.feedback-prompt {
  display: block;
  font-size: 24rpx;
  color: #64748b;
  margin-bottom: 16rpx;
}

.feedback-done {
  display: block;
  font-size: 26rpx;
  color: #94a3b8;
  text-align: center;
  padding: 8rpx 0;
}

.feedback-row {
  display: flex;
  flex-direction: row;
  gap: 12rpx;
}

.feedback-btn {
  flex: 1;
  height: 72rpx;
  border-radius: 16rpx;
  border: 2rpx solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  color: #475569;
  background-color: #ffffff;
}

.feedback-btn--adopt {
  border-color: #a7f3d0;
  color: #059669;
  background-color: #ecfdf5;
}

.feedback-btn--ignore {
  border-color: #e2e8f0;
  color: #64748b;
  background-color: #f8fafc;
}

.feedback-btn--modify {
  border-color: #bae6fd;
  color: #0284c7;
  background-color: #f0f9ff;
}

.feedback-btn--modify.active {
  border-color: #0284c7;
}

.feedback-btn.disabled,
.modify-confirm.disabled {
  opacity: 0.55;
}

.modify-panel {
  margin-top: 16rpx;
}

.modify-input {
  width: 100%;
  min-height: 140rpx;
  border: 2rpx solid #e2e8f0;
  border-radius: 16rpx;
  padding: 16rpx 20rpx;
  font-size: 26rpx;
  color: #0f172a;
  background-color: #ffffff;
  box-sizing: border-box;
}

.modify-actions {
  margin-top: 12rpx;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-end;
  gap: 24rpx;
}

.modify-cancel {
  font-size: 26rpx;
  color: #94a3b8;
  padding: 8rpx 0;
}

.modify-confirm {
  height: 64rpx;
  padding: 0 28rpx;
  border-radius: 12rpx;
  background-color: #0d9488;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26rpx;
  color: #ffffff;
}

.metrics-header {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8rpx;
}

.metrics-header .card-title {
  margin-bottom: 0;
}

.source-badge {
  font-size: 22rpx;
  padding: 6rpx 14rpx;
  border-radius: 999rpx;
  color: #64748b;
  background-color: #f1f5f9;
}

.source-badge--real {
  color: #0f766e;
  background-color: #ccfbf1;
}

.source-badge--hybrid {
  color: #b45309;
  background-color: #fef3c7;
}

.source-badge--mock {
  color: #64748b;
  background-color: #f1f5f9;
}

.source-score {
  margin-left: 6rpx;
  opacity: 0.85;
}

.metrics-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  margin-top: 24rpx;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16rpx 8rpx;
  margin-top: 20rpx;
}

.metrics-grid--more {
  margin-top: 12rpx;
}

.metrics-more-btn {
  margin-top: 16rpx;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  padding: 8rpx 0;
}

.metrics-more-text {
  font-size: 24rpx;
  color: #0d9488;
}

.metrics-more-arrow {
  font-size: 18rpx;
  color: #0d9488;
}

.metric-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16rpx 8rpx;
  border-radius: 16rpx;
  background-color: #f8fafc;
}

.metric-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.metric-value {
  font-size: 32rpx;
  font-weight: 700;
  color: #0d9488;
  line-height: 1.2;
}

.metric-unit {
  margin-top: 2rpx;
  font-size: 20rpx;
  color: #94a3b8;
}

.metric-label {
  margin-top: 8rpx;
  font-size: 22rpx;
  color: #64748b;
}

.metric-divider {
  width: 2rpx;
  height: 64rpx;
  background-color: #e2e8f0;
}

.chat-btn {
  display: flex;
  flex-direction: row;
  align-items: center;
  background-color: #0d9488;
  border-radius: 24rpx;
  padding: 28rpx 32rpx;
  margin-bottom: 24rpx;
  border: none;
  box-shadow: 0 8rpx 24rpx rgba(13, 148, 136, 0.25);
}

.chat-btn::after {
  border: none;
}

.chat-btn-icon {
  font-size: 40rpx;
  margin-right: 20rpx;
}

.chat-btn-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.chat-btn-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #ffffff;
}

.chat-btn-desc {
  margin-top: 4rpx;
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.85);
}

.chat-btn-arrow {
  font-size: 40rpx;
  color: #ffffff;
  font-weight: 300;
}

.tab-placeholder {
  height: 130rpx;
}
</style>
