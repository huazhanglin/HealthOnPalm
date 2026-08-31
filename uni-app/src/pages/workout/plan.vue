<script setup lang="ts">
import { onShow } from "@dcloudio/uni-app";
import { storeToRefs } from "pinia";
import { computed, ref } from "vue";
import { createWorkoutLog } from "@/api/workout";
import { HaButton, HaCard } from "@/components/common";
import {
  flattenPlanExerciseIds,
  formatPlanItemTitle,
  readinessLabel,
  type WorkoutPlan,
  type WorkoutPlanItem,
} from "@/lib/health/workout-plan";
import type { ManualWorkoutType } from "@/lib/health/workout";
import { useUserStore } from "@/stores/user";
import { useWorkoutStore } from "@/stores/workout";
import { ensureOnboarded } from "@/utils/onboarding";
import { invalidateFresh } from "@/utils/freshness";
import { hideLoading, showErrorToast, showLoading } from "@/utils/storage";

const userStore = useUserStore();
userStore.hydrateFromStorageSync();
const workoutStore = useWorkoutStore();
const { plan, isLoading, errorMessage } = storeToRefs(workoutStore);

const isSaving = ref(false);
const expandedId = ref<string | null>(null);
const failedImageIds = ref<Record<string, boolean>>({});

const allItems = computed(() => {
  if (!plan.value) return [] as Array<WorkoutPlanItem & { phaseLabel: string }>;
  return [
    ...plan.value.warmup.map((item) => ({ ...item, phaseLabel: "热身" })),
    ...plan.value.main.map((item) => ({ ...item, phaseLabel: "正式" })),
    ...plan.value.cooldown.map((item) => ({ ...item, phaseLabel: "拉伸" })),
  ];
});

function inferWorkoutType(p: WorkoutPlan): ManualWorkoutType {
  if (p.workout_readiness === "rest") return "yoga";
  const text = [...p.warmup, ...p.main, ...p.cooldown]
    .map((i) => `${i.category_zh}${i.name_en}${i.name_zh}`)
    .join(" ")
    .toLowerCase();
  if (/cardio|有氧|run|jog|bike|骑/.test(text)) return "hiit";
  if (/yoga|stretch|拉伸|yoga/.test(text)) return "yoga";
  return "strength";
}

function toggleExpand(id: string): void {
  expandedId.value = expandedId.value === id ? null : id;
}

function hasDemoImage(item: WorkoutPlanItem): boolean {
  return Boolean(item.image_url) && !failedImageIds.value[item.id];
}

function onImageError(id: string): void {
  failedImageIds.value = { ...failedImageIds.value, [id]: true };
}

async function loadPlan(forceRefresh = false): Promise<void> {
  await workoutStore.loadPlan(forceRefresh);
  if (workoutStore.errorMessage && !workoutStore.plan) {
    showErrorToast(workoutStore.errorMessage);
  }
}

async function refreshPlan(): Promise<void> {
  showLoading("重新生成…");
  try {
    await loadPlan(true);
  } finally {
    hideLoading();
  }
}

async function completePlan(): Promise<void> {
  if (!plan.value || isSaving.value) return;
  const uid = userStore.userId;
  if (!uid) {
    showErrorToast("未登录");
    return;
  }

  isSaving.value = true;
  showLoading("打卡中…");
  try {
    const exerciseIds = flattenPlanExerciseIds(plan.value);
    const names = [...plan.value.main]
      .slice(0, 3)
      .map((i) => i.name_zh || i.name_en)
      .join("、");
    const result = await createWorkoutLog({
      date: new Date().toISOString().slice(0, 10),
      workoutType: inferWorkoutType(plan.value),
      durationMinutes: plan.value.duration_minutes,
      perceivedExertion: plan.value.workout_readiness === "rest" ? 3 : 5,
      notes: `完成今日计划：${plan.value.title}`,
      exerciseIds,
      workoutName: names ? `今日计划 · ${names}` : plan.value.title,
      source: "ai_suggested",
    });
    if (!result.success) {
      showErrorToast(result.error ?? "打卡失败");
      return;
    }
    invalidateFresh(`workout-history:${uid}`);
    invalidateFresh(`home:${uid}`);
    uni.showToast({ title: "已打卡", icon: "success" });
    setTimeout(() => {
      uni.navigateTo({ url: "/pages/workout/history" });
    }, 400);
  } catch (error) {
    console.error("[workout/plan] complete failed:", error);
    showErrorToast("打卡失败，请稍后重试");
  } finally {
    isSaving.value = false;
    hideLoading();
  }
}

function openManualLog(): void {
  uni.navigateTo({ url: "/pages/workout/log" });
}

onShow(() => {
  void (async () => {
    if (!userStore.isLoggedIn) {
      userStore.hydrateFromStorageSync();
    }
    void workoutStore.loadPlan(false);
    const onboarded = await ensureOnboarded();
    if (!onboarded) return;
  })();
});
</script>

<template>
  <view class="page">
    <scroll-view class="scroll" scroll-y>
      <view class="header">
        <text class="title">今日训练计划</text>
        <text class="desc">根据恢复分从精选动作库生成，点开可看动作图示与要点</text>
      </view>

      <view v-if="isLoading && !plan" class="state">
        <text class="state-text">正在生成计划…</text>
      </view>

      <view v-else-if="errorMessage && !plan" class="state" @tap="loadPlan(false)">
        <text class="state-text">{{ errorMessage }}</text>
        <text class="state-hint">点击重试</text>
      </view>

      <template v-else-if="plan">
        <HaCard class="summary">
          <view class="summary-top">
            <text class="summary-title">{{ plan.title }}</text>
            <text class="summary-badge">{{ readinessLabel(plan.workout_readiness) }}</text>
          </view>
          <text class="summary-reason">{{ plan.reason }}</text>
          <view class="meta-row">
            <text class="meta">恢复分 {{ Math.round(plan.recovery_score) }}</text>
            <text class="meta">约 {{ plan.duration_minutes }} 分钟</text>
            <text class="meta">约 {{ plan.estimated_calories }} kcal</text>
          </view>
        </HaCard>

        <view
          v-for="item in allItems"
          :key="item.id + item.phaseLabel"
          class="exercise-card"
          @tap="toggleExpand(item.id)"
        >
          <view class="exercise-main">
            <image
              v-if="hasDemoImage(item)"
              class="exercise-thumb"
              :src="item.image_url"
              mode="aspectFill"
              @error="onImageError(item.id)"
            />
            <view v-else class="exercise-thumb exercise-thumb--empty">
              <text class="thumb-fallback">{{ item.phaseLabel }}</text>
            </view>
            <view class="exercise-left">
              <text class="phase">{{ item.phaseLabel }}</text>
              <text class="exercise-name">{{ formatPlanItemTitle(item) }}</text>
              <text class="exercise-tips">{{ item.tips }}</text>
            </view>
            <text class="chevron">{{ expandedId === item.id ? "收起" : "详情" }}</text>
          </view>
          <view v-if="expandedId === item.id" class="exercise-detail">
            <image
              v-if="hasDemoImage(item)"
              class="exercise-demo"
              :src="item.image_url"
              mode="aspectFit"
              @error="onImageError(item.id)"
            />
            <text v-if="item.muscles_primary_zh?.length" class="detail-line">
              肌群：{{ item.muscles_primary_zh.join("、") }}
            </text>
            <text v-if="item.equipment_zh?.length" class="detail-line">
              器械：{{ item.equipment_zh.join("、") }}
            </text>
            <text v-if="item.description" class="detail-desc">{{ item.description }}</text>
            <text class="attribution">{{ item.attribution }}</text>
          </view>
        </view>

        <text class="license-note">{{ plan.attribution_note }}</text>
        <view class="bottom-spacer" />
      </template>
    </scroll-view>

    <view class="footer">
      <view class="footer-links">
        <text class="link" @tap="refreshPlan">重新生成</text>
        <text class="link" @tap="openManualLog">手动记录</text>
      </view>
      <HaButton
        type="primary"
        size="large"
        :loading="isSaving"
        :disabled="!plan || isSaving"
        @click="completePlan"
      >
        完成并打卡
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

.state {
  padding: 80rpx 24rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.state-text {
  font-size: 28rpx;
  color: #64748b;
  text-align: center;
}

.state-hint {
  margin-top: 12rpx;
  font-size: 24rpx;
  color: #0d9488;
}

.summary {
  margin-bottom: 24rpx;
}

.summary-top {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16rpx;
}

.summary-title {
  flex: 1;
  font-size: 32rpx;
  font-weight: 700;
  color: #0f172a;
}

.summary-badge {
  font-size: 22rpx;
  color: #0d9488;
  background-color: #f0fdfa;
  border: 2rpx solid #99f6e4;
  border-radius: 999rpx;
  padding: 6rpx 16rpx;
}

.summary-reason {
  display: block;
  margin-top: 16rpx;
  font-size: 26rpx;
  color: #475569;
  line-height: 1.6;
}

.meta-row {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 16rpx;
  margin-top: 20rpx;
}

.meta {
  font-size: 22rpx;
  color: #64748b;
  background-color: #f1f5f9;
  border-radius: 12rpx;
  padding: 8rpx 14rpx;
}

.exercise-card {
  background-color: #ffffff;
  border: 2rpx solid #e2e8f0;
  border-radius: 20rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
}

.exercise-main {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  gap: 16rpx;
}

.exercise-thumb {
  width: 144rpx;
  height: 144rpx;
  border-radius: 16rpx;
  background-color: #f1f5f9;
  flex-shrink: 0;
}

.exercise-thumb--empty {
  display: flex;
  align-items: center;
  justify-content: center;
}

.thumb-fallback {
  font-size: 22rpx;
  color: #94a3b8;
}

.exercise-left {
  flex: 1;
}

.phase {
  font-size: 22rpx;
  color: #0d9488;
  font-weight: 600;
}

.exercise-name {
  display: block;
  margin-top: 8rpx;
  font-size: 28rpx;
  font-weight: 600;
  color: #0f172a;
}

.exercise-tips {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #64748b;
  line-height: 1.5;
}

.chevron {
  font-size: 22rpx;
  color: #94a3b8;
  padding-top: 8rpx;
}

.exercise-detail {
  margin-top: 16rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid #e2e8f0;
}

.exercise-demo {
  width: 100%;
  height: 360rpx;
  border-radius: 16rpx;
  background-color: #f8fafc;
  margin-bottom: 16rpx;
}

.detail-line {
  display: block;
  font-size: 24rpx;
  color: #475569;
  margin-bottom: 8rpx;
}

.detail-desc {
  display: block;
  font-size: 24rpx;
  color: #334155;
  line-height: 1.55;
  margin-top: 8rpx;
}

.attribution {
  display: block;
  margin-top: 12rpx;
  font-size: 20rpx;
  color: #94a3b8;
  line-height: 1.4;
}

.license-note {
  display: block;
  margin: 12rpx 0 24rpx;
  font-size: 20rpx;
  color: #94a3b8;
  line-height: 1.4;
}

.bottom-spacer {
  height: 320rpx;
}

.footer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 16rpx 32rpx;
  background-color: #ffffff;
  border-top: 1rpx solid #e2e8f0;
  z-index: 90;
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

