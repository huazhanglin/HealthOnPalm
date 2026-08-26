<script setup lang="ts">
import { onShow } from "@dcloudio/uni-app";
import { computed, reactive, ref } from "vue";
import { createWorkoutLog } from "@/api/workout";
import { HaButton, HaCard, HaSlider } from "@/components/common";
import {
  DURATION_PRESETS,
  getExertionLabel,
  getRecentDateOptions,
  getWorkoutTypesByCategory,
  createDefaultWorkoutLogForm,
  type ManualWorkoutType,
  type WorkoutLogForm,
} from "@/lib/health/workout";
import { ensureOnboarded } from "@/utils/onboarding";
import { invalidateFresh } from "@/utils/freshness";
import { hideLoading, showErrorToast, showLoading } from "@/utils/storage";
import { useUserStore } from "@/stores/user";

const userStore = useUserStore();
const form = reactive<WorkoutLogForm>(createDefaultWorkoutLogForm());
const isSaving = ref(false);
const dateOptions = getRecentDateOptions(7);
const dateLabels = dateOptions.map((item) => item.label);
const dateIndex = ref(dateOptions.length - 1);
const typeGroups = getWorkoutTypesByCategory();

const canSave = computed(
  () => !!form.workoutType && form.durationMinutes > 0 && !isSaving.value
);

const exertionHint = computed(() => getExertionLabel(form.perceivedExertion));

function onDateChange(event: { detail: { value: string | number } }): void {
  dateIndex.value = Number(event.detail.value);
  form.date = dateOptions[dateIndex.value]?.value ?? form.date;
}

function selectType(type: ManualWorkoutType): void {
  form.workoutType = type;
}

function setDuration(minutes: number): void {
  form.durationMinutes = minutes;
}

function onDurationInput(event: { detail: { value: string } }): void {
  const digits = String(event.detail.value).replace(/\D/g, "");
  form.durationMinutes = digits ? Number(digits) : 0;
}

function resetForm(): void {
  const next = createDefaultWorkoutLogForm(form.date);
  form.workoutType = next.workoutType;
  form.durationMinutes = next.durationMinutes;
  form.perceivedExertion = next.perceivedExertion;
  form.notes = next.notes;
}

async function handleSave(): Promise<void> {
  if (!canSave.value) return;
  isSaving.value = true;
  showLoading("保存中...");
  try {
    const result = await createWorkoutLog({ ...form });
    if (!result.success) {
      showErrorToast(result.error ?? "保存失败");
      return;
    }
    const uid = userStore.userId ?? "";
    invalidateFresh(`workout-history:${uid}`);
    invalidateFresh(`home:${uid}`);
    uni.showToast({ title: "已保存", icon: "success" });
    resetForm();
    setTimeout(() => {
      uni.navigateBack({
        fail: () => {
          uni.redirectTo({ url: "/pages/workout/history" });
        },
      });
    }, 400);
  } catch (error) {
    console.error("[workout/log] save failed:", error);
    showErrorToast("保存失败，请稍后重试");
  } finally {
    isSaving.value = false;
    hideLoading();
  }
}

function openHistory(): void {
  uni.navigateTo({ url: "/pages/workout/history" });
}

function openAiSuggestion(): void {
  uni.redirectTo({ url: "/pages/workout/plan" });
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
        <text class="title">记录运动</text>
        <text class="desc">补充 HealthKit 可能遗漏的训练，帮助 HOP 更准确建议</text>
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
        <text class="label required">运动类型</text>
        <view v-for="group in typeGroups" :key="group.category" class="type-group">
          <text class="type-group-title">{{ group.label }}</text>
          <view class="type-grid">
            <view
              v-for="item in group.items"
              :key="item.value"
              class="type-item"
              :class="{ active: form.workoutType === item.value }"
              @tap="selectType(item.value)"
            >
              <text class="type-icon">{{ item.icon }}</text>
              <text class="type-label">{{ item.label }}</text>
            </view>
          </view>
        </view>
      </HaCard>

      <HaCard class="section">
        <text class="label required">时长（分钟）</text>
        <input
          class="duration-input"
          type="number"
          :value="String(form.durationMinutes || '')"
          placeholder="30"
          @input="onDurationInput"
        />
        <view class="preset-row">
          <view
            v-for="minutes in DURATION_PRESETS"
            :key="minutes"
            class="preset-chip"
            :class="{ active: form.durationMinutes === minutes }"
            @tap="setDuration(minutes)"
          >
            <text>{{ minutes }} 分</text>
          </view>
        </view>
      </HaCard>

      <HaCard class="section">
        <view class="exertion-header">
          <text class="label required">主观疲劳度</text>
          <text class="exertion-value">{{ form.perceivedExertion }} · {{ exertionHint }}</text>
        </view>
        <HaSlider v-model="form.perceivedExertion" :min="1" :max="10" :step="1" :show-value="false" />
        <view class="exertion-ends">
          <text>1 很轻松</text>
          <text>10 精疲力竭</text>
        </view>
      </HaCard>

      <HaCard class="section">
        <text class="label">备注（可选）</text>
        <textarea
          v-model="form.notes"
          class="notes-input"
          maxlength="200"
          placeholder="例如：户外跑步，膝盖略酸"
        />
      </HaCard>

      <view class="bottom-spacer" />
    </scroll-view>

    <view class="footer">
      <view class="footer-links">
        <text class="link" @tap="openHistory">查看历史</text>
        <text class="link" @tap="openAiSuggestion">AI 训练建议</text>
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

.type-group {
  margin-bottom: 20rpx;
}

.type-group:last-child {
  margin-bottom: 0;
}

.type-group-title {
  display: block;
  margin-bottom: 12rpx;
  font-size: 24rpx;
  color: #94a3b8;
  font-weight: 500;
}

.type-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16rpx;
}

.type-item {
  border: 2rpx solid #e2e8f0;
  border-radius: 16rpx;
  padding: 20rpx 8rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  background-color: #ffffff;
}

.type-item.active {
  border-color: #0d9488;
  background-color: #f0fdfa;
}

.type-icon {
  font-size: 40rpx;
}

.type-label {
  margin-top: 8rpx;
  font-size: 22rpx;
  color: #334155;
  text-align: center;
}

.duration-input {
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

.exertion-header {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8rpx;
}

.exertion-header .label {
  margin-bottom: 0;
}

.exertion-value {
  font-size: 26rpx;
  color: #0d9488;
  font-weight: 600;
}

.exertion-ends {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  margin-top: 8rpx;
  font-size: 22rpx;
  color: #94a3b8;
}

.notes-input {
  width: 100%;
  min-height: 160rpx;
  border: 2rpx solid #e2e8f0;
  border-radius: 16rpx;
  padding: 20rpx 24rpx;
  font-size: 28rpx;
  color: #0f172a;
  background-color: #ffffff;
  box-sizing: border-box;
}

.bottom-spacer {
  height: 280rpx;
}

.footer {
  padding: 16rpx 32rpx calc(16rpx + env(safe-area-inset-bottom));
  background-color: #ffffff;
  border-top: 1rpx solid #e2e8f0;
}

.footer-links {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  margin-bottom: 16rpx;
}

.link {
  font-size: 26rpx;
  color: #0d9488;
}
</style>
