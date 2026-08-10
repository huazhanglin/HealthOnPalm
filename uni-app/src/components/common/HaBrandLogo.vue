<script setup lang="ts">
import { computed } from "vue";
import { brandIcons } from "@/assets/brand";
import type { HaBrandLogoSize } from "./types";

const props = withDefaults(
  defineProps<{
    /** 展示尺寸 */
    size?: HaBrandLogoSize;
    /** 是否显示光晕阴影 */
    glow?: boolean;
  }>(),
  {
    size: "large",
    glow: true,
  }
);

const logoClass = computed(() => [
  "ha-brand-logo",
  `ha-brand-logo--${props.size}`,
  { "ha-brand-logo--glow": props.glow },
]);

const iconSrc = computed(() => {
  switch (props.size) {
    case "xlarge":
      return brandIcons.xlarge;
    case "large":
      return brandIcons.large;
    case "medium":
      return brandIcons.medium;
    default:
      return brandIcons.small;
  }
});
</script>

<template>
  <view :class="logoClass">
    <image class="ha-brand-logo__image" :src="iconSrc" mode="aspectFill" />
  </view>
</template>

<style lang="scss" scoped>
.ha-brand-logo {
  border-radius: 28%;
  overflow: hidden;
  flex-shrink: 0;
}

.ha-brand-logo--glow {
  box-shadow:
    0 12rpx 32rpx rgba(13, 148, 136, 0.28),
    0 4rpx 12rpx rgba(15, 23, 42, 0.08);
}

.ha-brand-logo--xlarge {
  width: 128rpx;
  height: 128rpx;
}

.ha-brand-logo--large {
  width: 112rpx;
  height: 112rpx;
}

.ha-brand-logo--medium {
  width: 80rpx;
  height: 80rpx;
}

.ha-brand-logo--small {
  width: 56rpx;
  height: 56rpx;
}

.ha-brand-logo__image {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
