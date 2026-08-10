<script setup lang="ts">
import { computed } from "vue";
import { brandIcons } from "@/assets/brand";
import type { HaAvatarFallback, HaAvatarSize } from "./types";

/** HaAvatar 属性 */
const props = withDefaults(
  defineProps<{
    /** 头像图片地址 */
    src?: string;
    /** 尺寸 */
    size?: HaAvatarSize;
    /** 用户名（initial 模式用于生成首字母） */
    name?: string;
    /** 无图片时的占位样式 */
    fallback?: HaAvatarFallback;
  }>(),
  {
    src: "",
    size: "medium",
    name: "",
    fallback: "brand",
  }
);

/** 默认首字母 */
const initial = computed(() => {
  const value = props.name.trim();
  return value ? value.slice(0, 1).toUpperCase() : "H";
});

const avatarClass = computed(() => [
  "ha-avatar",
  `ha-avatar--${props.size}`,
  `ha-avatar--${props.fallback}`,
]);

const brandIconSrc = computed(() => {
  switch (props.size) {
    case "large":
      return brandIcons.medium;
    case "small":
      return brandIcons.tiny;
    default:
      return brandIcons.small;
  }
});
</script>

<template>
  <view :class="avatarClass">
    <image v-if="src" class="ha-avatar__image" :src="src" mode="aspectFill" />
    <image
      v-else-if="fallback === 'brand'"
      class="ha-avatar__image"
      :src="brandIconSrc"
      mode="aspectFill"
    />
    <view v-else class="ha-avatar__fallback ha-avatar__fallback--initial">
      <text class="ha-avatar__text">{{ initial }}</text>
    </view>
  </view>
</template>

<style lang="scss" scoped>

.ha-avatar {
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  box-shadow: 0 4rpx 16rpx rgba(13, 148, 136, 0.18);
}

.ha-avatar--large {
  width: 120rpx;
  height: 120rpx;
}

.ha-avatar--medium {
  width: 80rpx;
  height: 80rpx;
}

.ha-avatar--small {
  width: 56rpx;
  height: 56rpx;
}

.ha-avatar__image {
  width: 100%;
  height: 100%;
  display: block;
}

.ha-avatar__fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ha-avatar__fallback--initial {
  background: linear-gradient(145deg, #2dd4bf 0%, $ha-primary 100%);
}

.ha-avatar__text {
  color: #ffffff;
  font-weight: 600;
}

.ha-avatar--large .ha-avatar__text {
  font-size: 48rpx;
}

.ha-avatar--medium .ha-avatar__text {
  font-size: 32rpx;
}

.ha-avatar--small .ha-avatar__text {
  font-size: 24rpx;
}
</style>
