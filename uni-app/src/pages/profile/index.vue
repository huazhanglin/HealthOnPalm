<script setup lang="ts">
import { onShow } from "@dcloudio/uni-app";
import { computed, reactive, ref } from "vue";
import { updateUserProfile } from "@/api/user";
import HomeTabBar from "@/components/HomeTabBar.vue";
import { HaAvatar } from "@/components/common";
import { useUserStore } from "@/stores/user";
import {
  AGE_OPTIONS,
  FITNESS_LEVEL_OPTIONS,
  GENDER_OPTIONS,
  WORKOUT_TIME_OPTIONS,
  createDefaultProfileForm,
  mapProfileFormToPayload,
  mapUserToProfileForm,
  validateProfileForm,
  type ProfileFormData,
} from "@/types/profile";
import {
  formatLastSyncTime,
  getHasHealthKitAuth,
  getLastSyncTime,
  isIosAppPlatform,
  isPluginMissingFromBase,
} from "@/lib/healthkit";
import { ensureOnboarded } from "@/utils/onboarding";
import {
  PROFILE_DATA_TTL_MS,
  isFresh,
  markFresh,
} from "@/utils/freshness";
import { hideLoading, showErrorToast, showLoading } from "@/utils/storage";

const userStore = useUserStore();

const form = reactive<ProfileFormData>(createDefaultProfileForm());
const isSaving = ref(false);
const isLoading = ref(false);
const ageIndex = ref(0);

const avatarFallback = "brand" as const;

const healthKitLinked = ref(false);
const healthKitLastSync = ref("尚未同步");
const healthKitSupported = ref(false);

/** 刷新 HealthKit 同步状态展示 */
function refreshHealthKitStatus(): void {
  healthKitSupported.value = isIosAppPlatform();
  healthKitLinked.value = getHasHealthKitAuth();
  healthKitLastSync.value = formatLastSyncTime(getLastSyncTime());
}

/** 打开 HealthKit 授权 / 同步页 */
function openHealthKitSync(): void {
  if (!isIosAppPlatform()) {
    uni.showToast({ title: "仅 iOS App 支持 HealthKit", icon: "none" });
    return;
  }

  if (isPluginMissingFromBase()) {
    uni.showModal({
      title: "需要自定义调试基座",
      content:
        "Windows 调试 iOS 时，标准基座不支持 HealthKit 原生插件。请在 HBuilderX 制作「自定义调试基座」，运行时在「运行基座选择」里选「自定义调试基座」。",
      showCancel: false,
    });
    return;
  }

  uni.navigateTo({ url: "/pages/healthkit/authorize?from=profile" });
}

/** 年龄展示文案 */
const ageLabel = computed(() => (form.age != null ? `${form.age} 岁` : "请选择年龄"));

/** 同步年龄 picker 索引 */
function syncAgeIndex(): void {
  if (form.age == null) {
    ageIndex.value = 0;
    return;
  }
  const index = AGE_OPTIONS.indexOf(form.age);
  ageIndex.value = index >= 0 ? index : 0;
}

/** 加载用户档案到表单 */
async function loadProfile(options: { force?: boolean } = {}): Promise<void> {
  const uid = userStore.userId;
  const cacheKey = uid ? `profile:${uid}` : "profile";
  const force = options.force === true;

  if (
    !force &&
    isFresh(cacheKey, PROFILE_DATA_TTL_MS) &&
    (form.nickname || userStore.profile)
  ) {
    if (userStore.profile && !form.nickname) {
      Object.assign(form, mapUserToProfileForm(userStore.profile));
      syncAgeIndex();
    }
    return;
  }

  isLoading.value = true;
  const showBlock = !form.nickname && !userStore.profile;
  if (showBlock) {
    showLoading("加载档案...");
  }

  try {
    const profile = await userStore.fetchProfile();
    Object.assign(form, mapUserToProfileForm(profile));
    syncAgeIndex();
    markFresh(cacheKey);
  } catch (error) {
    console.error("[profile] 加载失败:", error);
    showErrorToast("档案加载失败");
  } finally {
    isLoading.value = false;
    if (showBlock) {
      hideLoading();
    }
  }
}

/** 点击头像（暂用默认，上传功能 W2 开放） */
function onAvatarTap(): void {
  uni.chooseImage({
    count: 1,
    sizeType: ["compressed"],
    sourceType: ["album", "camera"],
    success: () => {
      uni.showToast({ title: "头像上传功能即将开放", icon: "none" });
    },
  });
}

/** 年龄选择 */
function onAgeChange(event: { detail: { value: string | number } }): void {
  ageIndex.value = Number(event.detail.value);
  form.age = AGE_OPTIONS[ageIndex.value] ?? null;
}

/** 性别单选 */
function onGenderChange(event: { detail: { value: string } }): void {
  form.gender = event.detail.value as ProfileFormData["gender"];
}

/** 运动水平单选 */
function onFitnessChange(event: { detail: { value: string } }): void {
  form.fitness_level = event.detail.value as ProfileFormData["fitness_level"];
}

/** 偏好训练时间单选 */
function onWorkoutTimeChange(event: { detail: { value: string } }): void {
  form.preferred_workout_time = event.detail.value as ProfileFormData["preferred_workout_time"];
}

/** 睡眠目标滑块 */
function onSleepGoalChange(event: { detail: { value: number } }): void {
  form.sleep_goal_hours = Number(event.detail.value);
}

/** 训练时长滑块 */
function onWorkoutDurationChange(event: { detail: { value: number } }): void {
  form.workout_duration_preference = Number(event.detail.value);
}

/** 保存档案 */
async function handleSave(): Promise<void> {
  const validationError = validateProfileForm(form);
  if (validationError) {
    showErrorToast(validationError.message);
    return;
  }

  isSaving.value = true;
  showLoading("保存中...");

  try {
    const payload = mapProfileFormToPayload(form);
    const result = await updateUserProfile(payload);

    if (!result.success || !result.data) {
      showErrorToast(result.error ?? "保存失败，请稍后重试");
      return;
    }

    userStore.$patch({ profile: result.data });
    if (userStore.userId) {
      markFresh(`profile:${userStore.userId}`);
    }

    uni.showToast({ title: "保存成功", icon: "success" });
    setTimeout(() => {
      uni.redirectTo({ url: "/pages/index/index" });
    }, 800);
  } catch (error) {
    console.error("[profile] 保存失败:", error);
    showErrorToast("保存失败，请稍后重试");
  } finally {
    isSaving.value = false;
    hideLoading();
  }
}

/** 退出登录 */
async function handleLogout(): Promise<void> {
  await userStore.logout();
  uni.reLaunch({ url: "/pages/login/index" });
}

onShow(async () => {
  const onboarded = await ensureOnboarded();
  if (!onboarded) return;
  refreshHealthKitStatus();
  await loadProfile({ force: false });
});
</script>

<template>
  <view class="page">
    <view class="main-body">
      <!-- 基本信息 -->
      <view class="section-card">
        <text class="section-title">基本信息</text>

        <view class="avatar-row" @tap="onAvatarTap">
          <HaAvatar
            :src="form.avatar_url"
            :name="form.nickname"
            :fallback="avatarFallback"
            size="large"
          />
          <view class="avatar-meta">
            <text class="avatar-tip">点击上传头像</text>
            <text class="avatar-sub">暂用默认头像</text>
          </view>
        </view>

        <view class="field">
          <text class="label required">昵称</text>
          <input
            v-model="form.nickname"
            class="input"
            maxlength="20"
            placeholder="请输入昵称"
            :disabled="isSaving || isLoading"
          />
        </view>

        <view class="field">
          <text class="label required">年龄</text>
          <picker
            mode="selector"
            :range="AGE_OPTIONS"
            :value="ageIndex"
            :disabled="isSaving || isLoading"
            @change="onAgeChange"
          >
            <view class="picker-value">{{ ageLabel }}</view>
          </picker>
        </view>

        <view class="field">
          <text class="label required">性别</text>
          <radio-group class="radio-group" @change="onGenderChange">
            <label
              v-for="item in GENDER_OPTIONS"
              :key="item.value"
              class="radio-item"
            >
              <radio
                :value="item.value"
                :checked="form.gender === item.value"
                color="#0d9488"
                :disabled="isSaving || isLoading"
              />
              <text class="radio-label">{{ item.label }}</text>
            </label>
          </radio-group>
        </view>
      </view>

      <!-- 健康档案 -->
      <view class="section-card">
        <text class="section-title">健康档案</text>

        <view class="field-row">
          <view class="field half">
            <text class="label required">身高 (cm)</text>
            <input
              v-model="form.height_cm"
              class="input"
              type="digit"
              placeholder="170"
              :disabled="isSaving || isLoading"
            />
          </view>
          <view class="field half">
            <text class="label required">体重 (kg)</text>
            <input
              v-model="form.weight_kg"
              class="input"
              type="digit"
              placeholder="65"
              :disabled="isSaving || isLoading"
            />
          </view>
        </view>

        <view class="field">
          <text class="label">职业（可选）</text>
          <input
            v-model="form.occupation"
            class="input"
            maxlength="30"
            placeholder="如：软件工程师"
            :disabled="isSaving || isLoading"
          />
        </view>

        <view class="field">
          <view class="slider-header">
            <text class="label required">睡眠目标</text>
            <text class="slider-value">{{ form.sleep_goal_hours.toFixed(1) }} 小时</text>
          </view>
          <slider
            :min="6"
            :max="9"
            :step="0.5"
            :value="form.sleep_goal_hours"
            active-color="#0d9488"
            background-color="#e2e8f0"
            block-size="20"
            :disabled="isSaving || isLoading"
            @change="onSleepGoalChange"
          />
          <view class="slider-range">
            <text class="range-text">6h</text>
            <text class="range-text">9h</text>
          </view>
        </view>
      </view>

      <!-- 运动偏好 -->
      <view class="section-card">
        <text class="section-title">运动偏好</text>

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
                :disabled="isSaving || isLoading"
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
                :disabled="isSaving || isLoading"
              />
              <text class="radio-label">{{ item.label }}</text>
            </label>
          </radio-group>
        </view>

        <view class="field">
          <view class="slider-header">
            <text class="label required">偏好训练时长</text>
            <text class="slider-value">{{ form.workout_duration_preference }} 分钟</text>
          </view>
          <slider
            :min="15"
            :max="60"
            :step="5"
            :value="form.workout_duration_preference"
            active-color="#0d9488"
            background-color="#e2e8f0"
            block-size="20"
            :disabled="isSaving || isLoading"
            @change="onWorkoutDurationChange"
          />
          <view class="slider-range">
            <text class="range-text">15min</text>
            <text class="range-text">60min</text>
          </view>
        </view>
      </view>

      <!-- 数据同步 -->
      <view class="section-card sync-entry" @tap="openHealthKitSync">
        <view class="sync-entry-header">
          <text class="section-title sync-entry-title">数据同步</text>
          <text class="sync-entry-arrow">›</text>
        </view>
        <text class="sync-entry-desc">
          {{ healthKitSupported ? "连接 Apple 健康，提升 HOP 建议准确性" : "当前环境不支持 HealthKit" }}
        </text>
        <view class="sync-entry-meta">
          <text class="sync-entry-status">
            {{ healthKitLinked ? "已授权" : "未授权" }}
          </text>
          <text class="sync-entry-time">最近同步：{{ healthKitLastSync }}</text>
        </view>
      </view>

      <!-- 保存按钮 -->
      <button
        class="save-btn"
        :disabled="isSaving || isLoading"
        :loading="isSaving"
        @tap="handleSave"
      >
        保存档案
      </button>

      <button class="logout-btn" :disabled="isSaving" @tap="handleLogout">
        退出登录
      </button>

      <view class="tab-placeholder" />
    </view>

    <HomeTabBar active="profile" />
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

.main-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding: 24rpx 32rpx 0;
  box-sizing: border-box;
}

.section-card {
  background-color: #ffffff;
  border-radius: 24rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 8rpx 32rpx rgba(15, 23, 42, 0.06);
}

.section-title {
  display: block;
  font-size: 32rpx;
  font-weight: 600;
  color: #0f172a;
  margin-bottom: 24rpx;
}

.avatar-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  margin-bottom: 32rpx;
  gap: 24rpx;
}

.avatar-meta {
  display: flex;
  flex-direction: column;
}

.avatar-tip {
  font-size: 28rpx;
  color: #0d9488;
}

.avatar-sub {
  margin-top: 4rpx;
  font-size: 22rpx;
  color: #94a3b8;
}

.field {
  margin-bottom: 28rpx;
}

.field:last-child {
  margin-bottom: 0;
}

.field-row {
  display: flex;
  flex-direction: row;
  margin-bottom: 28rpx;
}

.half {
  flex: 1;
  margin-bottom: 0;
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

.input,
.picker-value {
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

.picker-value {
  color: #0f172a;
}

.radio-group {
  display: flex;
  flex-direction: row;
  align-items: center;
}

.radio-group.wrap {
  flex-wrap: wrap;
}

.radio-item {
  display: flex;
  flex-direction: row;
  align-items: center;
  margin-right: 32rpx;
  margin-bottom: 12rpx;
}

.radio-label {
  margin-left: 8rpx;
  font-size: 28rpx;
  color: #334155;
}

.slider-header {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8rpx;
}

.slider-value {
  font-size: 28rpx;
  font-weight: 600;
  color: #0d9488;
}

.slider-range {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  margin-top: 4rpx;
}

.range-text {
  font-size: 22rpx;
  color: #94a3b8;
}

.save-btn {
  height: 96rpx;
  line-height: 96rpx;
  background-color: #0d9488;
  color: #ffffff;
  font-size: 30rpx;
  font-weight: 600;
  border-radius: 20rpx;
  border: none;
  margin-bottom: 20rpx;
  box-shadow: 0 8rpx 24rpx rgba(13, 148, 136, 0.25);
}

.save-btn::after {
  border: none;
}

.save-btn[disabled] {
  background-color: #94a3b8;
  box-shadow: none;
}

.logout-btn {
  height: 88rpx;
  line-height: 88rpx;
  background-color: #ffffff;
  color: #ef4444;
  font-size: 28rpx;
  border-radius: 16rpx;
  border: 2rpx solid #fecaca;
  margin-bottom: 24rpx;
}

.logout-btn::after {
  border: none;
}

.tab-placeholder {
  height: 130rpx;
}

.sync-entry {
  border: 2rpx solid #ccfbf1;
  background: linear-gradient(180deg, #ffffff 0%, #f0fdfa 100%);
}

.sync-entry-header {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8rpx;
}

.sync-entry-title {
  margin-bottom: 0;
}

.sync-entry-arrow {
  font-size: 36rpx;
  color: #0d9488;
  font-weight: 300;
}

.sync-entry-desc {
  display: block;
  font-size: 26rpx;
  color: #64748b;
  line-height: 1.5;
  margin-bottom: 16rpx;
}

.sync-entry-meta {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}

.sync-entry-status {
  font-size: 24rpx;
  font-weight: 600;
  color: #0d9488;
}

.sync-entry-time {
  font-size: 22rpx;
  color: #94a3b8;
}
</style>
