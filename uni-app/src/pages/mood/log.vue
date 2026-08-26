<script setup lang="ts">
import { onShow } from "@dcloudio/uni-app";
import { computed, reactive, ref } from "vue";
import { listMoodLogs, saveMoodLog } from "@/api/mood";
import { HaButton, HaCard } from "@/components/common";
import {
  MOOD_OPTIONS,
  createDefaultMoodLogForm,
  formatMoodDateLabel,
  getMoodEmoji,
  getMoodLabel,
  getRecentMoodDateOptions,
  summarizeMoodWeek,
  type MoodLogForm,
  type MoodValue,
} from "@/lib/health/mood";
import type { MoodLog } from "@/types/database";
import { ensureOnboarded } from "@/utils/onboarding";
import { invalidateFresh } from "@/utils/freshness";
import { hideLoading, showErrorToast, showLoading } from "@/utils/storage";
import { useUserStore } from "@/stores/user";

const userStore = useUserStore();
const form = reactive<MoodLogForm>(createDefaultMoodLogForm());
const isSaving = ref(false);
const isLoadingHistory = ref(false);
const history = ref<MoodLog[]>([]);
const dateOptions = getRecentMoodDateOptions(7);
const dateLabels = dateOptions.map((item) => item.label);
const dateIndex = ref(dateOptions.length - 1);

const canSave = computed(() => !!form.mood && !!form.date && !isSaving.value);
const weekSummary = computed(() => summarizeMoodWeek(history.value));

function onDateChange(event: { detail: { value: string | number } }): void {
  dateIndex.value = Number(event.detail.value);
  form.date = dateOptions[dateIndex.value]?.value ?? form.date;
  syncFormFromHistory();
}

function selectMood(mood: MoodValue): void {
  form.mood = mood;
}

function syncFormFromHistory(): void {
  const row = history.value.find((item) => item.date === form.date);
  if (row) {
    form.mood = row.mood;
    form.note = row.note ?? "";
  } else {
    form.mood = "";
    form.note = "";
  }
}

async function loadHistory(): Promise<void> {
  isLoadingHistory.value = true;
  try {
    const result = await listMoodLogs(7);
    if (!result.success) {
      showErrorToast(result.error ?? "加载失败");
      return;
    }
    history.value = result.data ?? [];
    syncFormFromHistory();
  } catch (error) {
    console.error("[mood/log] history failed:", error);
  } finally {
    isLoadingHistory.value = false;
  }
}

async function handleSave(): Promise<void> {
  if (!canSave.value) return;
  isSaving.value = true;
  showLoading("保存中...");
  try {
    const result = await saveMoodLog({ ...form });
    if (!result.success) {
      showErrorToast(result.error ?? "保存失败");
      return;
    }
    const uid = userStore.userId ?? "";
    invalidateFresh(`home:${uid}`);
    invalidateFresh(`mood-history:${uid}`);
    uni.showToast({ title: "已保存", icon: "success" });
    await loadHistory();
  } catch (error) {
    console.error("[mood/log] save failed:", error);
    showErrorToast("保存失败，请稍后重试");
  } finally {
    isSaving.value = false;
    hideLoading();
  }
}

function openHistory(): void {
  uni.navigateTo({ url: "/pages/mood/history" });
}

onShow(async () => {
  const onboarded = await ensureOnboarded();
  if (!onboarded) return;
  await loadHistory();
});
</script>

<template>
  <view class="page">
    <scroll-view class="scroll" scroll-y>
      <view class="header">
        <text class="title">记录心情</text>
        <text class="desc">每天选一次即可；会进入恢复分的心情维度（占 10%）</text>
      </view>

      <HaCard class="section">
        <text class="label">日期</text>
        <picker mode="selector" :range="dateLabels" :value="dateIndex" @change="onDateChange">
          <view class="picker-row">
            <text class="picker-text">{{ dateLabels[dateIndex] }}</text>
            <text class="picker-arrow">▼</text>
          </view>
        </picker>
      </HaCard>

      <HaCard class="section">
        <text class="label required">今天感觉如何</text>
        <view class="mood-grid">
          <view
            v-for="item in MOOD_OPTIONS"
            :key="item.value"
            class="mood-item"
            :class="{ active: form.mood === item.value }"
            @tap="selectMood(item.value)"
          >
            <text class="mood-emoji">{{ item.emoji }}</text>
            <text class="mood-label">{{ item.label }}</text>
            <text class="mood-hint">{{ item.hint }}</text>
          </view>
        </view>
      </HaCard>

      <HaCard class="section">
        <text class="label">备注（可选）</text>
        <textarea
          v-model="form.note"
          class="notes-input"
          maxlength="200"
          placeholder="例如：开会太多，有点累"
        />
      </HaCard>

      <HaCard class="section">
        <view class="week-head">
          <text class="label">近 7 天</text>
          <text class="week-meta">
            {{ weekSummary.count }} 天 · 多见「{{ weekSummary.topLabel }}」
          </text>
        </view>
        <view v-if="isLoadingHistory" class="empty">加载中…</view>
        <view v-else-if="!history.length" class="empty">暂无记录</view>
        <view v-else class="history-list">
          <view v-for="item in history" :key="item.id" class="history-row">
            <text class="history-date">{{ formatMoodDateLabel(item.date) }}</text>
            <text class="history-mood">
              {{ getMoodEmoji(item.mood) }} {{ getMoodLabel(item.mood) }}
            </text>
          </view>
        </view>
      </HaCard>

      <view class="bottom-spacer" />
    </scroll-view>

    <view class="footer">
      <view class="footer-links">
        <text class="link" @tap="openHistory">查看历史</text>
      </view>
      <HaButton
        type="primary"
        size="large"
        :loading="isSaving"
        :disabled="!canSave"
        @click="handleSave"
      >
        保存心情
      </HaButton>
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

.label {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #334155;
  margin-bottom: 16rpx;
}

.label.required::before {
  content: "*";
  color: #ef4444;
  margin-right: 4rpx;
}

.picker-row {
  height: 88rpx;
  border: 2rpx solid #e2e8f0;
  border-radius: 16rpx;
  padding: 0 24rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: #ffffff;
}

.picker-text {
  font-size: 28rpx;
  color: #0f172a;
}

.picker-arrow {
  font-size: 20rpx;
  color: #94a3b8;
}

.mood-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16rpx;
}

.mood-item {
  border: 2rpx solid #e2e8f0;
  border-radius: 16rpx;
  padding: 24rpx 16rpx;
  background-color: #ffffff;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.mood-item.active {
  border-color: #0d9488;
  background-color: #f0fdfa;
}

.mood-emoji {
  font-size: 44rpx;
}

.mood-label {
  margin-top: 8rpx;
  font-size: 28rpx;
  font-weight: 600;
  color: #0f172a;
}

.mood-hint {
  margin-top: 4rpx;
  font-size: 22rpx;
  color: #94a3b8;
  text-align: center;
}

.notes-input {
  width: 100%;
  min-height: 140rpx;
  border: 2rpx solid #e2e8f0;
  border-radius: 16rpx;
  padding: 20rpx 24rpx;
  font-size: 28rpx;
  color: #0f172a;
  background-color: #ffffff;
  box-sizing: border-box;
}

.week-head {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8rpx;
}

.week-head .label {
  margin-bottom: 0;
}

.week-meta {
  font-size: 22rpx;
  color: #64748b;
}

.empty {
  padding: 24rpx 0;
  font-size: 26rpx;
  color: #94a3b8;
  text-align: center;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.history-row {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #f1f5f9;
}

.history-date {
  font-size: 26rpx;
  color: #64748b;
}

.history-mood {
  font-size: 26rpx;
  color: #0f172a;
  font-weight: 500;
}

.bottom-spacer {
  height: 200rpx;
}

.footer {
  padding: 16rpx 32rpx calc(16rpx + env(safe-area-inset-bottom));
  background-color: #ffffff;
  border-top: 1rpx solid #e2e8f0;
}

.footer-links {
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
  margin-bottom: 16rpx;
}

.link {
  font-size: 26rpx;
  color: #0d9488;
}
</style>
