<script setup lang="ts">
/** HaLoading 属性 */
withDefaults(
  defineProps<{
    /** 加载文案 */
    text?: string;
    /** 是否全屏遮罩 */
    fullscreen?: boolean;
  }>(),
  {
    text: "加载中...",
    fullscreen: false,
  }
);
</script>

<template>
  <view class="ha-loading" :class="{ 'ha-loading--fullscreen': fullscreen }">
    <view class="ha-loading__box">
      <view class="ha-loading__spinner" />
      <text v-if="text" class="ha-loading__text">{{ text }}</text>
    </view>
  </view>
</template>

<style lang="scss" scoped>

.ha-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32rpx;
}

.ha-loading--fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9998;
  background-color: rgba(255, 255, 255, 0.72);
}

.ha-loading__box {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32rpx 48rpx;
  border-radius: $ha-radius-lg;
  background-color: $ha-bg;
  box-shadow: $ha-shadow;
}

.ha-loading__spinner {
  width: 56rpx;
  height: 56rpx;
  border: 6rpx solid #e2e8f0;
  border-top-color: $ha-primary;
  border-radius: 50%;
  animation: ha-spin 0.8s linear infinite;
}

.ha-loading__text {
  margin-top: 16rpx;
  font-size: 26rpx;
  color: $ha-text-secondary;
}

@keyframes ha-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
