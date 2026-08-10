<script setup lang="ts">
import { computed } from "vue";
import type { HaButtonSize, HaButtonType } from "./types";

/** HaButton 属性 */
const props = withDefaults(
  defineProps<{
    /** 按钮类型 */
    type?: HaButtonType;
    /** 按钮尺寸 */
    size?: HaButtonSize;
    /** 加载中 */
    loading?: boolean;
    /** 禁用 */
    disabled?: boolean;
  }>(),
  {
    type: "primary",
    size: "medium",
    loading: false,
    disabled: false,
  }
);

const emit = defineEmits<{
  click: [];
}>();

/** 组合样式类名 */
const buttonClass = computed(() => [
  "ha-button",
  `ha-button--${props.type}`,
  `ha-button--${props.size}`,
  { "ha-button--loading": props.loading, "ha-button--disabled": props.disabled },
]);

/** 点击处理 */
function handleClick(): void {
  if (props.disabled || props.loading) return;
  emit("click");
}
</script>

<template>
  <button
    :class="buttonClass"
    :disabled="disabled || loading"
    :loading="loading"
    @tap="handleClick"
  >
    <slot />
  </button>
</template>

<style lang="scss" scoped>

.ha-button {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: $ha-radius-md;
  font-weight: 600;
  border: none;
  box-sizing: border-box;
  transition: opacity 0.2s ease;

  &::after {
    border: none;
  }
}

.ha-button--primary {
  background-color: $ha-primary;
  color: #ffffff;
}

.ha-button--default {
  background-color: $ha-bg;
  color: $ha-primary;
  border: 2rpx solid $ha-primary;
}

.ha-button--text {
  background-color: transparent;
  color: $ha-primary;
}

.ha-button--large {
  height: 96rpx;
  padding: 0 48rpx;
  font-size: 30rpx;
}

.ha-button--medium {
  height: 88rpx;
  padding: 0 40rpx;
  font-size: 28rpx;
}

.ha-button--small {
  height: 72rpx;
  padding: 0 32rpx;
  font-size: 26rpx;
}

.ha-button--loading,
.ha-button--disabled {
  opacity: 0.6;
}
</style>
