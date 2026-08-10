<script setup lang="ts">
import { computed } from "vue";

/** HaCard 属性 */
const props = withDefaults(
  defineProps<{
    /** 卡片标题 */
    title?: string;
    /** 是否显示阴影 */
    shadow?: boolean;
    /** 内边距尺寸：normal / none / large */
    padding?: "normal" | "none" | "large";
  }>(),
  {
    title: "",
    shadow: true,
    padding: "normal",
  }
);

const cardClass = computed(() => [
  "ha-card",
  {
    "ha-card--shadow": props.shadow,
    "ha-card--padding-none": props.padding === "none",
    "ha-card--padding-large": props.padding === "large",
  },
]);
</script>

<template>
  <view :class="cardClass">
    <view v-if="$slots.header || title" class="ha-card__header">
      <slot name="header">
        <text class="ha-card__title">{{ title }}</text>
      </slot>
    </view>

    <view class="ha-card__body">
      <slot />
    </view>

    <view v-if="$slots.footer" class="ha-card__footer">
      <slot name="footer" />
    </view>
  </view>
</template>

<style lang="scss" scoped>

.ha-card {
  background-color: $ha-bg;
  border-radius: 24rpx;
  overflow: hidden;
  padding: 32rpx;
}

.ha-card--shadow {
  box-shadow: $ha-shadow;
}

.ha-card--padding-none {
  padding: 0;
}

.ha-card--padding-large {
  padding: 40rpx;
}

.ha-card__header {
  margin-bottom: 24rpx;
}

.ha-card__title {
  font-size: 30rpx;
  font-weight: 600;
  color: $ha-text;
}

.ha-card__footer {
  margin-top: 24rpx;
  padding-top: 24rpx;
  border-top: 2rpx solid #f1f5f9;
}
</style>
