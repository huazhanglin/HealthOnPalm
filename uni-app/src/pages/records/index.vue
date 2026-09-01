<script setup lang="ts">
import { onShow } from "@dcloudio/uni-app";
import { HaCard } from "@/components/common";
import { ensureOnboarded } from "@/utils/onboarding";

function openWorkoutLog(): void {
  uni.navigateTo({ url: "/pages/workout/log" });
}

function openWorkoutHistory(): void {
  uni.navigateTo({ url: "/pages/workout/history" });
}

function openSleepLog(): void {
  uni.navigateTo({ url: "/pages/sleep/log" });
}

function openSleepHistory(): void {
  uni.navigateTo({ url: "/pages/sleep/history" });
}

function openMoodLog(): void {
  uni.navigateTo({ url: "/pages/mood/log" });
}

function openMoodHistory(): void {
  uni.navigateTo({ url: "/pages/mood/history" });
}

onShow(async () => {
  const onboarded = await ensureOnboarded();
  if (!onboarded) return;
});
</script>

<template>
  <view class="page">
    <view class="header">
      <text class="title">健康记录</text>
      <text class="desc">记录运动、心情与睡眠，让 HOP 建议更贴合你的状态</text>
    </view>

    <view class="entry-wrap" @tap="openWorkoutLog">
      <HaCard class="entry-card">
        <view class="entry-row">
          <text class="entry-icon">🏃</text>
          <view class="entry-meta">
            <text class="entry-title">记录运动</text>
            <text class="entry-desc">手动补充跑步、力量、瑜伽等训练</text>
          </view>
          <text class="entry-arrow">›</text>
        </view>
      </HaCard>
    </view>

    <view class="entry-wrap" @tap="openWorkoutHistory">
      <HaCard class="entry-card">
        <view class="entry-row">
          <text class="entry-icon">📅</text>
          <view class="entry-meta">
            <text class="entry-title">运动历史</text>
            <text class="entry-desc">近 7 天记录、周汇总与删除管理</text>
          </view>
          <text class="entry-arrow">›</text>
        </view>
      </HaCard>
    </view>

    <view class="entry-wrap" @tap="openMoodLog">
      <HaCard class="entry-card">
        <view class="entry-row">
          <text class="entry-icon">😊</text>
          <view class="entry-meta">
            <text class="entry-title">记录心情</text>
            <text class="entry-desc">每日一记，参与恢复分计算</text>
          </view>
          <text class="entry-arrow">›</text>
        </view>
      </HaCard>
    </view>

    <view class="entry-wrap" @tap="openMoodHistory">
      <HaCard class="entry-card">
        <view class="entry-row">
          <text class="entry-icon">🗒️</text>
          <view class="entry-meta">
            <text class="entry-title">心情历史</text>
            <text class="entry-desc">近 7 天心情、周汇总与删除管理</text>
          </view>
          <text class="entry-arrow">›</text>
        </view>
      </HaCard>
    </view>

    <view class="entry-wrap" @tap="openSleepLog">
      <HaCard class="entry-card">
        <view class="entry-row">
          <text class="entry-icon">😴</text>
          <view class="entry-meta">
            <text class="entry-title">记录睡眠</text>
            <text class="entry-desc">手动补充就寝/起床与睡眠质量</text>
          </view>
          <text class="entry-arrow">›</text>
        </view>
      </HaCard>
    </view>

    <view class="entry-wrap" @tap="openSleepHistory">
      <HaCard class="entry-card">
        <view class="entry-row">
          <text class="entry-icon">🌙</text>
          <view class="entry-meta">
            <text class="entry-title">睡眠历史</text>
            <text class="entry-desc">近 7 天时长、质量与数据来源</text>
          </view>
          <text class="entry-arrow">›</text>
        </view>
      </HaCard>
    </view>
  </view>
</template>

<style scoped>
.page {
  min-height: 100vh;
  background-color: #f8fafc;
  padding: 32rpx;
  box-sizing: border-box;
}

.header {
  margin-bottom: 32rpx;
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

.entry-wrap {
  margin-bottom: 20rpx;
}

.entry-row {
  display: flex;
  flex-direction: row;
  align-items: center;
}

.entry-icon {
  font-size: 40rpx;
  margin-right: 20rpx;
}

.entry-meta {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.entry-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #0f172a;
}

.entry-desc {
  margin-top: 6rpx;
  font-size: 24rpx;
  color: #64748b;
}

.entry-arrow {
  font-size: 36rpx;
  color: #94a3b8;
}
</style>
