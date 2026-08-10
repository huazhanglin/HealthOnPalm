<script setup lang="ts">
import { onShow } from "@dcloudio/uni-app";
import { nextTick, reactive, ref, watch } from "vue";
import { completeOnboarding } from "@/api/user";
import { HaBrandLogo } from "@/components/common";
import {
  AGE_OPTIONS,
  FITNESS_LEVEL_OPTIONS,
  WORKOUT_TIME_OPTIONS,
} from "@/types/profile";
import {
  ONBOARDING_STEPS,
  buildOnboardingPayload,
  createDefaultOnboardingForm,
  validateOnboardingStep,
  type OnboardingFormData,
} from "@/types/onboarding";
import { useUserStore } from "@/stores/user";
import { routeAfterOnboarding } from "@/utils/auth-routing";
import {
  redirectToHome,
  setLocalOnboardingDone,
} from "@/utils/onboarding";
import { hideLoading, showErrorToast, showLoading } from "@/utils/storage";

const userStore = useUserStore();

const currentStep = ref(0);
const isSubmitting = ref(false);
const isReadyAnimating = ref(false);
const ageIndex = ref(0);
const form = reactive<OnboardingFormData>(createDefaultOnboardingForm());

/** 年龄展示文案 */
function getAgeLabel(): string {
  return form.age != null ? `${form.age} 岁` : "请选择年龄";
}

/** 默认昵称（邮箱前缀 / 旧手机号末四位） */
function getDefaultNickname(): string {
  const mail = userStore.email ?? "";
  if (mail.includes("@")) {
    const local = mail.split("@")[0];
    if (local) return local.slice(0, 20);
  }
  const phone = userStore.phone ?? "";
  if (phone.length >= 4) return `用户${phone.slice(-4)}`;
  return "健康用户";
}

/** 切换到指定步骤 */
function goToStep(step: number): void {
  currentStep.value = Math.max(0, Math.min(step, ONBOARDING_STEPS.length - 1));
}

/** Swiper 滑动切换 */
function onSwiperChange(event: { detail: { current: number } }): void {
  const newIndex = event.detail.current;
  const oldIndex = currentStep.value;

  if (newIndex > oldIndex) {
    for (let step = oldIndex; step < newIndex; step += 1) {
      const error = validateOnboardingStep(step, form);
      if (error) {
        showErrorToast(error);
        nextTick(() => goToStep(oldIndex));
        return;
      }
    }
  }

  currentStep.value = newIndex;
}

/** 下一步（带校验） */
function handleNext(): void {
  const error = validateOnboardingStep(currentStep.value, form);
  if (error) {
    showErrorToast(error);
    return;
  }
  goToStep(currentStep.value + 1);
}

/** 上一步 */
function handleBack(): void {
  if (currentStep.value > 0) {
    goToStep(currentStep.value - 1);
  }
}

/** 年龄选择 */
function onAgeChange(event: { detail: { value: string | number } }): void {
  ageIndex.value = Number(event.detail.value);
  form.age = AGE_OPTIONS[ageIndex.value] ?? null;
}

/** 运动水平 */
function onFitnessChange(event: { detail: { value: string } }): void {
  form.fitness_level = event.detail.value as OnboardingFormData["fitness_level"];
}

/** 偏好训练时间 */
function onWorkoutTimeChange(event: { detail: { value: string } }): void {
  form.preferred_workout_time = event.detail.value as OnboardingFormData["preferred_workout_time"];
}

/** 完成引导：保存 Supabase 并跳转首页 */
async function finishOnboarding(): Promise<void> {
  if (isSubmitting.value) return;

  const step2Error = validateOnboardingStep(1, form);
  const step3Error = validateOnboardingStep(2, form);
  if (step2Error || step3Error) {
    showErrorToast(step2Error ?? step3Error ?? "请完善引导信息");
    goToStep(step2Error ? 1 : 2);
    return;
  }

  isSubmitting.value = true;
  isReadyAnimating.value = true;
  showLoading("正在准备...");

  try {
    const payload = buildOnboardingPayload(form, getDefaultNickname());
    const result = await completeOnboarding(payload);

    if (!result.success || !result.data) {
      showErrorToast(result.error ?? "保存失败，请重试");
      isReadyAnimating.value = false;
      return;
    }

    userStore.profile = result.data;
    if (userStore.userId) {
      setLocalOnboardingDone(userStore.userId, true);
    }

    hideLoading();
    uni.showToast({ title: "准备就绪", icon: "success" });
    setTimeout(() => {
      routeAfterOnboarding();
    }, 500);
  } catch (error) {
    console.error("[onboarding] 完成引导失败:", error);
    showErrorToast("保存失败，请稍后重试");
    isReadyAnimating.value = false;
  } finally {
    isSubmitting.value = false;
    hideLoading();
  }
}

/** 进入最后一步时自动触发完成流程（仅触发一次） */
let autoFinishTriggered = false;
watch(currentStep, (step) => {
  if (step === ONBOARDING_STEPS.length - 1 && !autoFinishTriggered) {
    autoFinishTriggered = true;
    void finishOnboarding();
  }
});

onShow(async () => {
  if (!userStore.isLoggedIn) {
    uni.reLaunch({ url: "/pages/login/index" });
    return;
  }

  if (userStore.profile?.onboarding_completed) {
    redirectToHome();
    return;
  }

  const profile = await userStore.fetchProfile().catch(() => null);
  if (profile?.onboarding_completed) {
    if (userStore.userId) {
      setLocalOnboardingDone(userStore.userId, true);
    }
    redirectToHome();
  }
});
</script>

<template>
  <view class="page">
    <!-- 进度指示器 -->
    <view class="progress-bar">
      <view
        v-for="(_, index) in ONBOARDING_STEPS"
        :key="index"
        class="dot"
        :class="{ active: index === currentStep, done: index < currentStep }"
      />
    </view>

    <!-- 顶部返回 -->
    <view v-if="currentStep > 0 && currentStep < ONBOARDING_STEPS.length - 1" class="back-row">
      <text class="back-btn" @tap="handleBack">‹ 上一步</text>
    </view>

    <swiper
      class="swiper"
      :current="currentStep"
      :duration="300"
      @change="onSwiperChange"
    >
      <!-- Step 1: 欢迎页 -->
      <swiper-item class="swiper-slide">
        <view class="step-content center">
          <HaBrandLogo size="xlarge" />
          <text class="welcome-title">欢迎使用 Health On Palm</text>
          <text class="welcome-desc">每天根据你的身体状态，自动规划下一步行动</text>
          <button class="primary-btn" @tap="handleNext">开始</button>
        </view>
      </swiper-item>

      <!-- Step 2: 健康档案 -->
      <swiper-item class="swiper-slide">
        <view class="step-content">
          <text class="step-title">填写健康档案</text>
          <text class="step-subtitle">帮助我们了解你的基本情况</text>

          <view class="form-card">
            <view class="field">
              <text class="label required">年龄</text>
              <picker mode="selector" :range="AGE_OPTIONS" :value="ageIndex" @change="onAgeChange">
                <view class="input-like">{{ getAgeLabel() }}</view>
              </picker>
            </view>

            <view class="field-row">
              <view class="field half">
                <text class="label required">身高 (cm)</text>
                <input
                  v-model="form.height_cm"
                  class="input-like"
                  type="digit"
                  placeholder="170"
                />
              </view>
              <view class="field half">
                <text class="label required">体重 (kg)</text>
                <input
                  v-model="form.weight_kg"
                  class="input-like"
                  type="digit"
                  placeholder="65"
                />
              </view>
            </view>
          </view>

          <button class="primary-btn" @tap="handleNext">下一步</button>
        </view>
      </swiper-item>

      <!-- Step 3: 运动偏好 -->
      <swiper-item class="swiper-slide">
        <view class="step-content">
          <text class="step-title">运动偏好</text>
          <text class="step-subtitle">为你定制更合适的训练建议</text>

          <view class="form-card">
            <view class="field">
              <text class="label required">运动水平</text>
              <radio-group class="radio-group wrap" @change="onFitnessChange">
                <label
                  v-for="item in FITNESS_LEVEL_OPTIONS"
                  :key="item.value"
                  class="radio-item"
                >
                  <radio
                    :value="item.value"
                    :checked="form.fitness_level === item.value"
                    color="#0d9488"
                  />
                  <text class="radio-label">{{ item.label }}</text>
                </label>
              </radio-group>
            </view>

            <view class="field">
              <text class="label required">偏好训练时间</text>
              <radio-group class="radio-group wrap" @change="onWorkoutTimeChange">
                <label
                  v-for="item in WORKOUT_TIME_OPTIONS"
                  :key="item.value"
                  class="radio-item"
                >
                  <radio
                    :value="item.value"
                    :checked="form.preferred_workout_time === item.value"
                    color="#0d9488"
                  />
                  <text class="radio-label">{{ item.label }}</text>
                </label>
              </radio-group>
            </view>
          </view>

          <button class="primary-btn" @tap="handleNext">下一步</button>
        </view>
      </swiper-item>

      <!-- Step 4: 授权引导 -->
      <swiper-item class="swiper-slide">
        <view class="step-content center">
          <text class="step-icon">🔐</text>
          <text class="step-title">健康数据授权</text>
          <text class="step-subtitle block">
            Health On Palm 需要读取步数、睡眠等健康数据，才能提供个性化建议。你的数据仅用于个人健康分析，不会分享给第三方。
          </text>

          <view class="auth-card">
            <text class="auth-item">✓ 步数与活动数据</text>
            <text class="auth-item">✓ 睡眠时长与质量</text>
            <text class="auth-item">✓ 训练记录同步</text>
          </view>

          <button class="outline-btn" @tap="handleNext">稍后授权</button>
          <button class="primary-btn secondary" @tap="handleNext">继续</button>
        </view>
      </swiper-item>

      <!-- Step 5: 完成 -->
      <swiper-item class="swiper-slide">
        <view class="step-content center">
          <view class="ready-circle" :class="{ animate: isReadyAnimating || isSubmitting }">
            <text class="ready-icon">✓</text>
          </view>
          <text class="step-title">准备就绪</text>
          <text class="step-subtitle block">
            {{
              isSubmitting
                ? "正在保存你的档案..."
                : "一切准备完毕，点击下方按钮进入首页"
            }}
          </text>
          <button
            class="primary-btn"
            :disabled="isSubmitting"
            @tap="finishOnboarding"
          >
            {{ isSubmitting ? "保存中..." : "进入首页" }}
          </button>
        </view>
      </swiper-item>
    </swiper>
  </view>
</template>

<style scoped>
.page {
  height: 100vh;
  min-height: 100vh;
  background-color: #f8fafc;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  padding-top: var(--status-bar-height);
}

.progress-bar {
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  padding: 32rpx 32rpx 16rpx;
}

.dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 8rpx;
  background-color: #cbd5e1;
  margin: 0 8rpx;
  transition: all 0.3s ease;
}

.dot.active {
  width: 32rpx;
  background-color: #0d9488;
}

.dot.done {
  background-color: #5eead4;
}

.back-row {
  padding: 0 32rpx 8rpx;
}

.back-btn {
  font-size: 28rpx;
  color: #64748b;
}

.swiper {
  flex: 1;
  width: 100%;
  height: calc(100vh - var(--status-bar-height) - 120rpx);
  min-height: 600rpx;
}

.swiper-slide {
  height: 100%;
}

.step-content {
  height: 100%;
  min-height: 600rpx;
  padding: 24rpx 40rpx 64rpx;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.step-content.center {
  align-items: center;
  justify-content: center;
  gap: 24rpx;
}

.welcome-title {
  font-size: 40rpx;
  font-weight: 600;
  color: #0f172a;
  text-align: center;
}

.welcome-desc {
  margin-top: 20rpx;
  font-size: 28rpx;
  line-height: 1.7;
  color: #64748b;
  text-align: center;
  padding: 0 16rpx;
}

.step-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #0f172a;
}

.step-subtitle {
  margin-top: 12rpx;
  font-size: 26rpx;
  color: #64748b;
  line-height: 1.6;
}

.step-subtitle.block {
  display: block;
  text-align: center;
  padding: 0 8rpx;
}

.step-icon {
  font-size: 80rpx;
  margin-bottom: 24rpx;
}

.form-card {
  margin-top: 32rpx;
  margin-bottom: 40rpx;
  background-color: #ffffff;
  border-radius: 24rpx;
  padding: 32rpx;
  box-shadow: 0 8rpx 32rpx rgba(15, 23, 42, 0.06);
}

.field {
  margin-bottom: 24rpx;
}

.field:last-child {
  margin-bottom: 0;
}

.field-row {
  display: flex;
  flex-direction: row;
}

.half {
  flex: 1;
}

.half + .half {
  margin-left: 20rpx;
}

.label {
  display: block;
  font-size: 26rpx;
  color: #475569;
  margin-bottom: 12rpx;
}

.label.required::before {
  content: "*";
  color: #ef4444;
  margin-right: 4rpx;
}

.input-like {
  height: 88rpx;
  line-height: 88rpx;
  padding: 0 24rpx;
  border: 2rpx solid #e2e8f0;
  border-radius: 16rpx;
  font-size: 28rpx;
  color: #0f172a;
  background-color: #ffffff;
  box-sizing: border-box;
}

.radio-group {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
}

.radio-item {
  display: flex;
  flex-direction: row;
  align-items: center;
  margin-right: 32rpx;
  margin-bottom: 16rpx;
}

.radio-label {
  margin-left: 8rpx;
  font-size: 28rpx;
  color: #334155;
}

.auth-card {
  width: 100%;
  margin: 32rpx 0 40rpx;
  background-color: #ffffff;
  border-radius: 24rpx;
  padding: 32rpx;
  box-shadow: 0 8rpx 32rpx rgba(15, 23, 42, 0.06);
}

.auth-item {
  display: block;
  font-size: 28rpx;
  color: #334155;
  line-height: 2;
}

.primary-btn {
  width: 100%;
  height: 96rpx;
  line-height: 96rpx;
  background-color: #0d9488;
  color: #ffffff;
  font-size: 30rpx;
  font-weight: 600;
  border-radius: 20rpx;
  border: none;
  margin-top: auto;
}

.primary-btn.secondary {
  margin-top: 16rpx;
}

.primary-btn::after {
  border: none;
}

.outline-btn {
  width: 100%;
  height: 96rpx;
  line-height: 96rpx;
  background-color: #ffffff;
  color: #0d9488;
  font-size: 30rpx;
  font-weight: 500;
  border-radius: 20rpx;
  border: 2rpx solid #0d9488;
  margin-top: auto;
}

.outline-btn::after {
  border: none;
}

.ready-circle {
  width: 160rpx;
  height: 160rpx;
  border-radius: 80rpx;
  background-color: #f0fdfa;
  border: 6rpx solid #0d9488;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 32rpx;
}

.ready-circle.animate {
  animation: pulse-ready 1.2s ease-in-out infinite;
}

.ready-icon {
  font-size: 72rpx;
  color: #0d9488;
  font-weight: 700;
}

@keyframes pulse-ready {
  0% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(13, 148, 136, 0.4);
  }
  50% {
    transform: scale(1.06);
    box-shadow: 0 0 0 20rpx rgba(13, 148, 136, 0);
  }
  100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(13, 148, 136, 0);
  }
}
</style>

<!-- H5 下 swiper 内部容器也需要明确高度 -->
<style>
uni-swiper,
.uni-swiper,
.uni-swiper-wrapper,
.uni-swiper-slides,
.uni-swiper-slide-frame,
uni-swiper-item,
.uni-swiper-item {
  height: 100% !important;
}
</style>
