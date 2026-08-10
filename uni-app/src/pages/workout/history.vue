<script setup lang="ts">
import { onShow } from "@dcloudio/uni-app";
import { computed, ref } from "vue";
import { deleteWorkoutLog, listWorkoutLogs } from "@/api/workout";
import { HaButton, HaCard, HaLoading } from "@/components/common";
import {
  formatWorkoutSource,
  getExertionLabel,
  getWeekDateKeys,
  getWorkoutDisplayName,
  getWorkoutTypeIcon,
  getWorkoutTypeLabel,
  groupWorkoutsByDate,
  summarizeWorkouts,
} from "@/lib/health/workout";
import type { WorkoutLog } from "@/types/database";
import { ensureOnboarded } from "@/utils/onboarding";
import {
  HISTORY_DATA_TTL_MS,
  invalidateFresh,
  isFresh,
  markFresh,
} from "@/utils/freshness";
import { hideLoading, showErrorToast, showLoading } from "@/utils/storage";
import { useUserStore } from "@/stores/user";

const userStore = useUserStore();
const isLoading = ref(false);
const logs = ref<WorkoutLog[]>([]);
const selectedDate = ref("");
const weekDates = getWeekDateKeys();
const hasLoadedOnce = ref(false);

const summary = computed(() => summarizeWorkouts(logs.value));

const filteredLogs = computed(() => {
  if (!selectedDate.value) return logs.value;
  return logs.value.filter((item) => item.date === selectedDate.value);
});

const grouped = computed(() => groupWorkoutsByDate(filteredLogs.value));

function dayLabel(ymd: string): string {
  const [, m, d] = ymd.split("-");
  return `${Number(m)}/${Number(d)}`;
}

function isDayActive(ymd: string): boolean {
  return selectedDate.value === ymd;
}

function hasLogsOn(ymd: string): boolean {
  return logs.value.some((item) => item.date === ymd);
}

function selectDay(ymd: string): void {
  selectedDate.value = selectedDate.value === ymd ? "" : ymd;
}

async function loadLogs(options: { force?: boolean } = {}): Promise<void> {
  const uid = userStore.userId ?? "anon";
  const cacheKey = `workout-history:${uid}`;
  const force = options.force === true;

  if (!force && hasLoadedOnce.value && isFresh(cacheKey, HISTORY_DATA_TTL_MS)) {
    return;
  }

  isLoading.value = true;
  try {
    const result = await listWorkoutLogs(7);
    if (!result.success) {
      showErrorToast(result.error ?? "加载失败");
      logs.value = [];
      return;
    }
    logs.value = result.data ?? [];
    hasLoadedOnce.value = true;
    markFresh(cacheKey);
  } catch (error) {
    console.error("[workout/history] load failed:", error);
    showErrorToast("加载失败，请稍后重试");
  } finally {
    isLoading.value = false;
  }
}

function confirmDelete(item: WorkoutLog): void {
  uni.showModal({
    title: "删除记录",
    content: `确定删除「${getWorkoutDisplayName(item)}」吗？`,
    success: async (res) => {
      if (!res.confirm) return;
      showLoading("删除中...");
      try {
        const result = await deleteWorkoutLog(item.id);
        if (!result.success) {
          showErrorToast(result.error ?? "删除失败");
          return;
        }
        logs.value = logs.value.filter((row) => row.id !== item.id);
        invalidateFresh(`home:${userStore.userId ?? ""}`);
        uni.showToast({ title: "已删除", icon: "success" });
      } finally {
        hideLoading();
      }
    },
  });
}

function openLogPage(): void {
  uni.navigateTo({ url: "/pages/workout/log" });
}

onShow(async () => {
  const onboarded = await ensureOnboarded();
  if (!onboarded) return;
  await loadLogs({ force: false });
});
</script>

<template>
  <view class="page">
    <scroll-view class="scroll" scroll-y>
      <view class="header">
        <text class="title">运动历史</text>
        <text class="desc">近 7 天训练记录与周汇总</text>
      </view>

      <HaCard class="section">
        <view class="week-row">
          <view
            v-for="ymd in weekDates"
            :key="ymd"
            class="week-day"
            :class="{ active: isDayActive(ymd), dotted: hasLogsOn(ymd) }"
            @tap="selectDay(ymd)"
          >
            <text class="week-day-text">{{ dayLabel(ymd) }}</text>
          </view>
        </view>
        <text class="week-hint">
          {{ selectedDate ? "已筛选当日，再点一次可查看全部" : "点击日期可筛选当天" }}
        </text>
      </HaCard>

      <HaCard class="section summary-card">
        <text class="section-title">本周汇总</text>
        <view class="summary-grid">
          <view class="summary-item">
            <text class="summary-value">{{ summary.count }}</text>
            <text class="summary-label">运动次数</text>
          </view>
          <view class="summary-item">
            <text class="summary-value">{{ summary.totalMinutes }}</text>
            <text class="summary-label">总时长(分)</text>
          </view>
          <view class="summary-item">
            <text class="summary-value">{{ summary.topTypeLabel }}</text>
            <text class="summary-label">最常类型</text>
          </view>
        </view>
      </HaCard>

      <view v-if="isLoading" class="loading-wrap">
        <HaLoading text="加载中..." />
      </view>

      <view v-else-if="grouped.length === 0" class="empty-card">
        <text class="empty-title">暂无运动记录</text>
        <text class="empty-desc">去记录一次训练，或等待 HealthKit 同步</text>
      </view>

      <view v-else>
        <view v-for="group in grouped" :key="group.date" class="day-group">
          <text class="day-title">{{ group.label }}</text>
          <HaCard v-for="item in group.items" :key="item.id" class="log-card">
            <view class="log-row">
              <text class="log-icon">{{ getWorkoutTypeIcon(item.workout_type) }}</text>
              <view class="log-meta">
                <text class="log-name">
                  {{ getWorkoutDisplayName(item) }}
                </text>
                <text class="log-sub">
                  {{ item.duration_minutes ?? 0 }} 分钟
                  <text v-if="item.perceived_exertion">
                    · 疲劳 {{ item.perceived_exertion }}（{{ getExertionLabel(item.perceived_exertion) }}）
                  </text>
                </text>
                <text class="log-source">来源：{{ formatWorkoutSource(item.source) }}</text>
                <text v-if="item.notes" class="log-notes">{{ item.notes }}</text>
              </view>
              <text class="delete-btn" @tap="confirmDelete(item)">删除</text>
            </view>
          </HaCard>
        </view>
      </view>

      <view class="bottom-spacer" />
    </scroll-view>

    <view class="footer">
      <HaButton type="primary" size="large" @click="openLogPage">添加记录</HaButton>
    </view>
  </view>
</template>

<style scoped>
.page {
  height: 100vh;
  background-color: #f8fafc;
  display: flex;
  flex-direction: column;
}

.scroll {
  flex: 1;
  height: 0;
  padding: 24rpx 32rpx;
  box-sizing: border-box;
}

.header {
  margin-bottom: 24rpx;
}

.title {
  font-size: 40rpx;
  font-weight: 700;
  color: #0f172a;
}

.desc {
  display: block;
  margin-top: 8rpx;
  font-size: 26rpx;
  color: #64748b;
}

.section {
  margin-bottom: 24rpx;
}

.section-title {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #0f172a;
  margin-bottom: 16rpx;
}

.week-row {
  display: flex;
  flex-direction: row;
  gap: 8rpx;
}

.week-day {
  flex: 1;
  height: 72rpx;
  border-radius: 12rpx;
  background-color: #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.week-day.active {
  background-color: #0d9488;
}

.week-day-text {
  font-size: 22rpx;
  color: #475569;
}

.week-day.active .week-day-text {
  color: #ffffff;
  font-weight: 600;
}

.week-day.dotted::after {
  content: "";
  position: absolute;
  bottom: 8rpx;
  width: 8rpx;
  height: 8rpx;
  border-radius: 4rpx;
  background-color: #0d9488;
}

.week-day.active.dotted::after {
  background-color: #ffffff;
}

.week-hint {
  display: block;
  margin-top: 12rpx;
  font-size: 22rpx;
  color: #94a3b8;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12rpx;
}

.summary-item {
  background-color: #f8fafc;
  border-radius: 16rpx;
  padding: 20rpx 8rpx;
  text-align: center;
}

.summary-value {
  display: block;
  font-size: 28rpx;
  font-weight: 700;
  color: #0d9488;
}

.summary-label {
  display: block;
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #94a3b8;
}

.loading-wrap,
.empty-card {
  margin-top: 48rpx;
  text-align: center;
}

.empty-title {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: #334155;
}

.empty-desc {
  display: block;
  margin-top: 12rpx;
  font-size: 26rpx;
  color: #94a3b8;
}

.day-group {
  margin-bottom: 24rpx;
}

.day-title {
  display: block;
  font-size: 26rpx;
  font-weight: 600;
  color: #64748b;
  margin-bottom: 12rpx;
}

.log-card {
  margin-bottom: 12rpx;
}

.log-row {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
}

.log-icon {
  font-size: 40rpx;
  margin-right: 16rpx;
  line-height: 1.2;
}

.log-meta {
  flex: 1;
}

.log-name {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: #0f172a;
}

.log-sub,
.log-source,
.log-notes {
  display: block;
  margin-top: 6rpx;
  font-size: 24rpx;
  color: #64748b;
}

.log-notes {
  color: #94a3b8;
}

.delete-btn {
  font-size: 24rpx;
  color: #ef4444;
  padding: 8rpx 0 8rpx 16rpx;
}

.bottom-spacer {
  height: 180rpx;
}

.footer {
  padding: 16rpx 32rpx calc(16rpx + env(safe-area-inset-bottom));
  background-color: #ffffff;
  border-top: 1rpx solid #e2e8f0;
}
</style>
