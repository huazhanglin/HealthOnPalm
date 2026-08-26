<script setup lang="ts">
import { onShow } from "@dcloudio/uni-app";
import { computed, ref } from "vue";
import { deleteMoodLog, listMoodLogs } from "@/api/mood";
import { HaButton, HaCard, HaLoading } from "@/components/common";
import {
  formatMoodDateLabel,
  getMoodEmoji,
  getMoodLabel,
  getMoodWeekDateKeys,
  summarizeMoodWeek,
} from "@/lib/health/mood";
import type { MoodLog } from "@/types/database";
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
const logs = ref<MoodLog[]>([]);
const selectedDate = ref("");
const weekDates = getMoodWeekDateKeys();
const hasLoadedOnce = ref(false);

const summary = computed(() => summarizeMoodWeek(logs.value));

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

async function loadLogs(options: { force?: boolean } = {}): Promise<void> {
  const uid = userStore.userId ?? "anon";
  const cacheKey = `mood-history:${uid}`;
  const force = options.force === true;

  if (!force && hasLoadedOnce.value && isFresh(cacheKey, HISTORY_DATA_TTL_MS)) {
    return;
  }

  isLoading.value = true;
  try {
    const result = await listMoodLogs(7);
    if (!result.success) {
      showErrorToast(result.error ?? "加载失败");
      logs.value = [];
      return;
    }
    logs.value = result.data ?? [];
    hasLoadedOnce.value = true;
    markFresh(cacheKey);
  } catch (error) {
    console.error("[mood/history] load failed:", error);
    showErrorToast("加载失败，请稍后重试");
  } finally {
    isLoading.value = false;
  }
}

function confirmDelete(item: MoodLog): void {
  uni.showModal({
    title: "删除记录",
    content: `确定删除 ${formatMoodDateLabel(item.date)} 的心情记录吗？`,
    success: async (res) => {
      if (!res.confirm) return;
      showLoading("删除中...");
      try {
        const result = await deleteMoodLog(item.id);
        if (!result.success) {
          showErrorToast(result.error ?? "删除失败");
          return;
        }
        logs.value = logs.value.filter((row) => row.id !== item.id);
        invalidateFresh(`home:${userStore.userId ?? ""}`);
        invalidateFresh(`mood-history:${userStore.userId ?? ""}`);
        uni.showToast({ title: "已删除", icon: "success" });
      } finally {
        hideLoading();
      }
    },
  });
}

function openLogPage(): void {
  uni.navigateTo({ url: "/pages/mood/log" });
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
        <text class="title">心情历史</text>
        <text class="desc">近 7 天心情记录与周汇总</text>
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
            <text class="summary-value">{{ summary.count || "--" }}</text>
            <text class="summary-label">记录天数</text>
          </view>
          <view class="summary-item">
            <text class="summary-value">{{ summary.topLabel }}</text>
            <text class="summary-label">多见心情</text>
          </view>
        </view>
      </HaCard>

      <view v-if="isLoading" class="loading-wrap">
        <HaLoading text="加载中..." />
      </view>

      <view v-else-if="displayList.length === 0" class="empty-card">
        <text class="empty-title">暂无心情记录</text>
        <text class="empty-desc">每天选一次心情，有助于更准确的恢复分</text>
      </view>

      <view v-else>
        <HaCard v-for="item in displayList" :key="item.id" class="log-card">
          <view class="log-top">
            <text class="log-date">{{ formatMoodDateLabel(item.date) }}</text>
            <text class="delete-btn" @tap="confirmDelete(item)">删除</text>
          </view>
          <view class="log-mood-row">
            <text class="log-emoji">{{ getMoodEmoji(item.mood) }}</text>
            <text class="log-mood">{{ getMoodLabel(item.mood) }}</text>
          </view>
          <text v-if="item.note" class="log-note">{{ item.note }}</text>
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
  line-height: 1.5;
}

.section {
  margin-bottom: 24rpx;
}

.week-row {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  gap: 8rpx;
}

.week-day {
  flex: 1;
  height: 72rpx;
  border-radius: 12rpx;
  border: 2rpx solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #ffffff;
  position: relative;
}

.week-day.active {
  border-color: #0d9488;
  background-color: #f0fdfa;
}

.week-day.dotted::after {
  content: "";
  position: absolute;
  bottom: 8rpx;
  width: 8rpx;
  height: 8rpx;
  border-radius: 50%;
  background-color: #0d9488;
}

.week-day-text {
  font-size: 22rpx;
  color: #334155;
}

.week-hint {
  display: block;
  margin-top: 12rpx;
  font-size: 22rpx;
  color: #94a3b8;
}

.section-title {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #0f172a;
  margin-bottom: 16rpx;
}

.summary-grid {
  display: flex;
  flex-direction: row;
  gap: 16rpx;
}

.summary-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16rpx 8rpx;
  background-color: #f8fafc;
  border-radius: 12rpx;
}

.summary-value {
  font-size: 30rpx;
  font-weight: 700;
  color: #0d9488;
}

.summary-label {
  margin-top: 8rpx;
  font-size: 22rpx;
  color: #64748b;
}

.loading-wrap {
  padding: 48rpx 0;
}

.empty-card {
  padding: 64rpx 24rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.empty-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #334155;
}

.empty-desc {
  margin-top: 12rpx;
  font-size: 24rpx;
  color: #94a3b8;
  text-align: center;
}

.log-card {
  margin-bottom: 16rpx;
}

.log-top {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
}

.log-date {
  font-size: 26rpx;
  color: #64748b;
}

.delete-btn {
  font-size: 24rpx;
  color: #ef4444;
}

.log-mood-row {
  margin-top: 12rpx;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 12rpx;
}

.log-emoji {
  font-size: 40rpx;
}

.log-mood {
  font-size: 32rpx;
  font-weight: 600;
  color: #0f172a;
}

.log-note {
  display: block;
  margin-top: 12rpx;
  font-size: 24rpx;
  color: #64748b;
  line-height: 1.5;
}

.bottom-spacer {
  height: 200rpx;
}

.footer {
  padding: 16rpx 32rpx calc(16rpx + env(safe-area-inset-bottom));
  background-color: #ffffff;
  border-top: 1rpx solid #e2e8f0;
}
</style>
