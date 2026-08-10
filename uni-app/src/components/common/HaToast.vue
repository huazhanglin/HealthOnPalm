<script setup lang="ts">
import { computed } from "vue";
import { toastState } from "./useToast";

/** Toast 图标映射 */
const iconMap = {
  success: "✓",
  error: "✕",
  warning: "!",
};

const toastClass = computed(() => [
  "ha-toast",
  `ha-toast--${toastState.type}`,
  { "ha-toast--visible": toastState.visible },
]);

const icon = computed(() => iconMap[toastState.type]);
</script>

<template>
  <view v-if="toastState.visible" :class="toastClass">
    <view class="ha-toast__content">
      <text class="ha-toast__icon">{{ icon }}</text>
      <text class="ha-toast__text">{{ toastState.message }}</text>
    </view>
  </view>
</template>

<style lang="scss" scoped>

.ha-toast {
  position: fixed;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%) scale(0.92);
  z-index: 9999;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.ha-toast--visible {
  opacity: 1;
  transform: translate(-50%, -50%) scale(1);
  pointer-events: auto;
}

.ha-toast__content {
  display: flex;
  flex-direction: row;
  align-items: center;
  max-width: 560rpx;
  padding: 24rpx 32rpx;
  border-radius: $ha-radius-lg;
  background-color: rgba(15, 23, 42, 0.88);
  box-shadow: $ha-shadow;
}

.ha-toast__icon {
  width: 40rpx;
  height: 40rpx;
  line-height: 40rpx;
  text-align: center;
  border-radius: 20rpx;
  font-size: 24rpx;
  font-weight: 700;
  margin-right: 16rpx;
  color: #ffffff;
}

.ha-toast--success .ha-toast__icon {
  background-color: $ha-success;
}

.ha-toast--error .ha-toast__icon {
  background-color: $ha-error;
}

.ha-toast--warning .ha-toast__icon {
  background-color: $ha-warning;
}

.ha-toast__text {
  flex: 1;
  font-size: 28rpx;
  color: #ffffff;
  line-height: 1.5;
}
</style>
