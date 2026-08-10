<script setup lang="ts">
import { onShow } from "@dcloudio/uni-app";
import { computed, ref } from "vue";
import { deleteSleepLog, listSleepLogs } from "@/api/sleep";
import { HaButton, HaCard, HaLoading } from "@/components/common";
import {
  formatSleepDateLabel,
  formatSleepSource,
  formatSleepSourceIcon,
  formatStars,
  getWeekDateKeys,
  qualityScoreToStars,
  sleepBarWidthClass,
  summarizeSleepLogs,
} from "@/lib/health/sleep";
import type { SleepLog } from "@/types/database";
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
const logs = ref<SleepLog[]>([]);
const selectedDate = ref("");
const weekDates = getWeekDateKeys();
const hasLoadedOnce = ref(false);

const summary = computed(() => summarizeSleepLogs(logs.value));

const filteredLogs = computed(() => {
  if (!selectedDate.value) return logs.value;
  return logs.value.filter((item) => item.date === selectedDate.value);
});

const displayList = computed(() =>
  [...filteredLogs.value].sort((a, b) => (a.date < b.date ? 1 : -1))
);

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

function hoursText(item: SleepLog): string {
  const h = item.total_sleep_hours;
  if (h == null) return "--";
  return `${h} 小时`;
}

function starsText(item: SleepLog): string {
  const stars = qualityScoreToStars(item.sleep_quality_score);
  if (!stars) return "暂无评分";
  return formatStars(stars);
}

async function loadLogs(options: { force?: boolean } = {}): Promise<void> {
  const uid = userStore.userId ?? "anon";
  const cacheKey = `sleep-history:${uid}`;
  const force = options.force === true;

  if (!force && hasLoadedOnce.value && isFresh(cacheKey, HISTORY_DATA_TTL_MS)) {
    return;
  }

  isLoading.value = true;
  try {
    const result = await listSleepLogs(7);
    if (!result.success) {
      showErrorToast(result.error ?? "加载失败");
      logs.value = [];
      return;
    }
    logs.value = result.data ?? [];
    hasLoadedOnce.value = true;
    markFresh(cacheKey);
  } catch (error) {
    console.error("[sleep/history] load failed:", error);
    showErrorToast("加载失败，请稍后重试");
  } finally {
    isLoading.value = false;
  }
}

function confirmDelete(item: SleepLog): void {
  uni.showModal({
    title: "删除记录",
    content: `确定删除 ${formatSleepDateLabel(item.date)} 的睡眠记录吗？`,
    success: async (res) => {
      if (!res.confirm) return;
      showLoading("删除中...");
      try {
        const result = await deleteSleepLog(item.id);
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
  uni.navigateTo({ url: "/pages/sleep/log" });
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
        <text class="title">睡眠历史</text>
        <text class="desc">近 7 天睡眠记录与周汇总</text>
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
            <text class="summary-value">{{ summary.avgHours || "--" }}</text>
            <text class="summary-label">平均时长(时)</text>
          </view>
          <view class="summary-item">
            <text class="summary-value">
              {{ summary.avgQualityStars ? formatStars(summary.avgQualityStars) : "--" }}
            </text>
            <text class="summary-label">平均质量</text>
          </view>
          <view class="summary-item">
            <text class="summary-value trend">{{ summary.trendLabel }}</text>
            <text class="summary-label">趋势</text>
          </view>
        </view>
      </HaCard>

      <view v-if="isLoading" class="loading-wrap">
        <HaLoading text="加载中..." />
      </view>

      <view v-else-if="displayList.length === 0" class="empty-card">
        <text class="empty-title">暂无睡眠记录</text>
        <text class="empty-desc">去手动补充一晚，或等待 HealthKit 同步</text>
      </view>

      <view v-else>
        <HaCard v-for="item in displayList" :key="item.id" class="log-card">
          <view class="log-top">
            <text class="log-date">{{ formatSleepDateLabel(item.date) }}</text>
            <text class="log-source">
              {{ formatSleepSourceIcon(item.source) }} {{ formatSleepSource(item.source) }}
            </text>
          </view>
          <view class="log-hours-row">
            <text class="log-hours">{{ hoursText(item) }}</text>
            <text class="log-stars">{{ starsText(item) }}</text>
          </view>
          <view class="bar-track">
            <view
              class="bar-fill"
              :class="[
                sleepBarWidthClass(item.total_sleep_hours),
                { short: (item.total_sleep_hours ?? 0) < 6 },
              ]"
            />
          </view>
          <view class="log-bottom">
            <text class="log-meta">
              醒来 {{ item.wake_ups ?? 0 }} 次
            </text>
            <text
              v-if="item.source !== 'healthkit_sync'"
              class="delete-btn"
              @tap="confirmDelete(item)"
            >
              删除
            </text>
          </view>
        </HaCard>
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

.summary-value.trend {
  font-size: 24rpx;
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

.log-card {
  margin-bottom: 16rpx;
}

.log-top {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12rpx;
}

.log-date {
  font-size: 28rpx;
  font-weight: 600;
  color: #0f172a;
}

.log-source {
  font-size: 22rpx;
  color: #64748b;
}

.log-hours-row {
  display: flex;
  flex-direction: row;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 12rpx;
}

.log-hours {
  font-size: 34rpx;
  font-weight: 700;
  color: #0d9488;
}

.log-stars {
  font-size: 24rpx;
  color: #0d9488;
  letter-spacing: 2rpx;
}

.bar-track {
  height: 16rpx;
  border-radius: 8rpx;
  background-color: #e2e8f0;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: 8rpx;
  background-color: #0d9488;
}

.bar-fill.short {
  background-color: #f59e0b;
}

.bar-w-0 {
  width: 0%;
}

.bar-w-10 {
  width: 10%;
}

.bar-w-20 {
  width: 20%;
}

.bar-w-30 {
  width: 30%;
}

.bar-w-40 {
  width: 40%;
}

.bar-w-50 {
  width: 50%;
}

.bar-w-60 {
  width: 60%;
}

.bar-w-70 {
  width: 70%;
}

.bar-w-80 {
  width: 80%;
}

.bar-w-90 {
  width: 90%;
}

.bar-w-100 {
  width: 100%;
}

.log-bottom {
  margin-top: 12rpx;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}

.log-meta {
  font-size: 24rpx;
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
