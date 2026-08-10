<script setup lang="ts">
import { onShow } from "@dcloudio/uni-app";
import { computed, reactive, ref } from "vue";
import { saveSleepLog } from "@/api/sleep";
import { HaButton, HaCard } from "@/components/common";
import {
  calcSleepHours,
  createDefaultSleepLogForm,
  formatStars,
  getRecentSleepDateOptions,
  type SleepLogForm,
} from "@/lib/health/sleep";
import { ensureOnboarded } from "@/utils/onboarding";
import { invalidateFresh } from "@/utils/freshness";
import { hideLoading, showErrorToast, showLoading } from "@/utils/storage";
import { useUserStore } from "@/stores/user";

const userStore = useUserStore();
const form = reactive<SleepLogForm>(createDefaultSleepLogForm());
const isSaving = ref(false);
const dateOptions = getRecentSleepDateOptions(7);
const dateLabels = dateOptions.map((item) => item.label);
const dateIndex = ref(dateOptions.length - 1);

const sleepHours = computed(() => calcSleepHours(form.bedtime, form.wakeTime));
const sleepHoursText = computed(() => {
  if (sleepHours.value == null) return "--";
  return `${sleepHours.value} 小时`;
});

const canSave = computed(
  () =>
    !!form.date &&
    sleepHours.value != null &&
    form.qualityStars >= 1 &&
    !isSaving.value
);

function onDateChange(event: { detail: { value: string | number } }): void {
  dateIndex.value = Number(event.detail.value);
  form.date = dateOptions[dateIndex.value]?.value ?? form.date;
}

function onBedtimeChange(event: { detail: { value: string } }): void {
  form.bedtime = event.detail.value;
}

function onWakeTimeChange(event: { detail: { value: string } }): void {
  form.wakeTime = event.detail.value;
}

function setQuality(stars: number): void {
  form.qualityStars = stars;
}

function setWakeUps(n: number): void {
  form.wakeUps = n;
}

function onWakeUpsInput(event: { detail: { value: string } }): void {
  const digits = String(event.detail.value).replace(/\D/g, "");
  const n = digits ? Number(digits) : 0;
  form.wakeUps = Math.min(20, Math.max(0, n));
}

function resetForm(): void {
  const next = createDefaultSleepLogForm();
  form.date = next.date;
  form.bedtime = next.bedtime;
  form.wakeTime = next.wakeTime;
  form.qualityStars = next.qualityStars;
  form.wakeUps = next.wakeUps;
  const idx = dateOptions.findIndex((item) => item.value === form.date);
  dateIndex.value = idx >= 0 ? idx : dateOptions.length - 1;
}

async function handleSave(): Promise<void> {
  if (!canSave.value) return;
  isSaving.value = true;
  showLoading("保存中...");
  try {
    const result = await saveSleepLog({ ...form });
    if (!result.success) {
      showErrorToast(result.error ?? "保存失败");
      return;
    }
    const uid = userStore.userId ?? "";
    invalidateFresh(`sleep-history:${uid}`);
    invalidateFresh(`home:${uid}`);
    uni.showToast({ title: "已保存", icon: "success" });
    resetForm();
    setTimeout(() => {
      uni.navigateBack({
        fail: () => {
          uni.redirectTo({ url: "/pages/sleep/history" });
        },
      });
    }, 400);
  } catch (error) {
    console.error("[sleep/log] save failed:", error);
    showErrorToast("保存失败，请稍后重试");
  } finally {
    isSaving.value = false;
    hideLoading();
  }
}

function openHistory(): void {
  uni.navigateTo({ url: "/pages/sleep/history" });
}

onShow(async () => {
  const onboarded = await ensureOnboarded();
  if (!onboarded) return;
});
</script>

<template>
  <view class="page">
    <scroll-view class="scroll" scroll-y>
      <view class="header">
        <text class="title">记录睡眠</text>
        <text class="desc">HealthKit 缺失时手动补充，帮助 HOP 了解你的恢复状态</text>
      </view>

      <HaCard class="section">
        <text class="label">日期（起床日）</text>
        <picker mode="selector" :range="dateLabels" :value="dateIndex" @change="onDateChange">
          <view class="picker-row">
            <text class="picker-text">{{ dateLabels[dateIndex] }}</text>
            <text class="picker-arrow">▼</text>
          </view>
        </picker>
      </HaCard>

      <HaCard class="section">
        <text class="label required">就寝时间</text>
        <picker mode="time" :value="form.bedtime" @change="onBedtimeChange">
          <view class="picker-row">
            <text class="picker-text">{{ form.bedtime }}</text>
            <text class="picker-arrow">▼</text>
          </view>
        </picker>
      </HaCard>

      <HaCard class="section">
        <text class="label required">起床时间</text>
        <picker mode="time" :value="form.wakeTime" @change="onWakeTimeChange">
          <view class="picker-row">
            <text class="picker-text">{{ form.wakeTime }}</text>
            <text class="picker-arrow">▼</text>
          </view>
        </picker>
        <view class="duration-box">
          <text class="duration-label">睡眠时长</text>
          <text class="duration-value">{{ sleepHoursText }}</text>
        </view>
      </HaCard>

      <HaCard class="section">
        <view class="quality-header">
          <text class="label required">睡眠质量</text>
          <text class="quality-hint">{{ formatStars(form.qualityStars) }}</text>
        </view>
        <view class="star-row">
          <view
            v-for="n in 5"
            :key="n"
            class="star-item"
            :class="{ active: form.qualityStars >= n }"
            @tap="setQuality(n)"
          >
            <text class="star-text">{{ form.qualityStars >= n ? "★" : "☆" }}</text>
          </view>
        </view>
      </HaCard>

      <HaCard class="section">
        <text class="label">夜间醒来次数</text>
        <input
          class="wake-input"
          type="number"
          :value="String(form.wakeUps)"
          placeholder="0"
          @input="onWakeUpsInput"
        />
        <view class="preset-row">
          <view
            v-for="n in [0, 1, 2, 3, 5]"
            :key="n"
            class="preset-chip"
            :class="{ active: form.wakeUps === n }"
            @tap="setWakeUps(n)"
          >
            <text>{{ n }} 次</text>
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
        保存记录
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

.duration-box {
  margin-top: 20rpx;
  padding: 20rpx 24rpx;
  border-radius: 16rpx;
  background-color: #f0fdfa;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}

.duration-label {
  font-size: 26rpx;
  color: #64748b;
}

.duration-value {
  font-size: 32rpx;
  font-weight: 700;
  color: #0d9488;
}

.quality-header {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8rpx;
}

.quality-header .label {
  margin-bottom: 0;
}

.quality-hint {
  font-size: 28rpx;
  color: #0d9488;
  letter-spacing: 4rpx;
}

.star-row {
  display: flex;
  flex-direction: row;
  gap: 12rpx;
  margin-top: 8rpx;
}

.star-item {
  flex: 1;
  height: 88rpx;
  border-radius: 16rpx;
  border: 2rpx solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #ffffff;
}

.star-item.active {
  border-color: #0d9488;
  background-color: #f0fdfa;
}

.star-text {
  font-size: 40rpx;
  color: #cbd5e1;
}

.star-item.active .star-text {
  color: #0d9488;
}

.wake-input {
  height: 88rpx;
  border: 2rpx solid #e2e8f0;
  border-radius: 16rpx;
  padding: 0 24rpx;
  font-size: 30rpx;
  color: #0f172a;
  background-color: #ffffff;
  box-sizing: border-box;
  margin-bottom: 16rpx;
}

.preset-row {
  display: flex;
  flex-direction: row;
  gap: 12rpx;
}

.preset-chip {
  flex: 1;
  height: 64rpx;
  border-radius: 12rpx;
  border: 2rpx solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  color: #475569;
  background-color: #ffffff;
}

.preset-chip.active {
  border-color: #0d9488;
  color: #0d9488;
  background-color: #f0fdfa;
}

.bottom-spacer {
  height: 240rpx;
}

.footer {
  padding: 16rpx 32rpx calc(16rpx + env(safe-area-inset-bottom));
  background-color: #ffffff;
  border-top: 1rpx solid #e2e8f0;
}

.footer-links {
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  margin-bottom: 16rpx;
}

.link {
  font-size: 26rpx;
  color: #0d9488;
}
</style>
