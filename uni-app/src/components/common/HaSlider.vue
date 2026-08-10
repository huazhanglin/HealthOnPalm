<script setup lang="ts">
import { computed } from "vue";

/** HaSlider 属性，支持 v-model */
const props = withDefaults(
  defineProps<{
    min?: number;
    max?: number;
    step?: number;
    modelValue?: number;
    showValue?: boolean;
    disabled?: boolean;
  }>(),
  {
    min: 0,
    max: 100,
    step: 1,
    modelValue: 0,
    showValue: true,
    disabled: false,
  }
);

const emit = defineEmits<{
  "update:modelValue": [value: number];
  change: [value: number];
}>();

const displayValue = computed(() => props.modelValue);

function onChange(event: { detail: { value: number } }): void {
  const value = Number(event.detail.value);
  emit("update:modelValue", value);
  emit("change", value);
}
</script>

<template>
  <view class="ha-slider">
    <view v-if="showValue" class="ha-slider__value">
      <slot name="value" :value="displayValue">
        <text class="ha-slider__value-text">{{ displayValue }}</text>
      </slot>
    </view>
    <slider
      class="ha-slider__control"
      :min="min"
      :max="max"
      :step="step"
      :value="modelValue"
      :disabled="disabled"
      active-color="#0d9488"
      background-color="#e2e8f0"
      block-size="20"
      @change="onChange"
    />
  </view>
</template>

<style lang="scss" scoped>

.ha-slider {
  width: 100%;
}

.ha-slider__value {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 8rpx;
}

.ha-slider__value-text {
  font-size: 28rpx;
  font-weight: 600;
  color: $ha-primary;
}

.ha-slider__control {
  width: 100%;
}
</style>
