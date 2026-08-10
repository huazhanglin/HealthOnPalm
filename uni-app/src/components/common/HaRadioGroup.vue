<script setup lang="ts">
import type { HaRadioOption } from "./types";

/** HaRadioGroup 属性，支持 v-model */
const props = withDefaults(
  defineProps<{
    /** 选项列表 */
    options: HaRadioOption[];
    /** 当前选中值 */
    modelValue?: string | number;
    /** 禁用 */
    disabled?: boolean;
  }>(),
  {
    modelValue: "",
    disabled: false,
  }
);

const emit = defineEmits<{
  "update:modelValue": [value: string | number];
  change: [value: string | number];
}>();

function onChange(event: { detail: { value: string } }): void {
  const raw = event.detail.value;
  const matched = props.options.find((item) => String(item.value) === raw);
  const value = matched?.value ?? raw;
  emit("update:modelValue", value);
  emit("change", value);
}

function isChecked(value: string | number): boolean {
  return String(props.modelValue) === String(value);
}
</script>

<template>
  <radio-group class="ha-radio-group" @change="onChange">
    <label
      v-for="item in options"
      :key="String(item.value)"
      class="ha-radio-group__item"
      :class="{ 'ha-radio-group__item--active': isChecked(item.value) }"
    >
      <radio
        :value="String(item.value)"
        :checked="isChecked(item.value)"
        :disabled="disabled"
        color="#0d9488"
        class="ha-radio-group__radio"
      />
      <text class="ha-radio-group__label">{{ item.label }}</text>
    </label>
  </radio-group>
</template>

<style lang="scss" scoped>

.ha-radio-group {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
}

.ha-radio-group__item {
  display: flex;
  flex-direction: row;
  align-items: center;
  margin-right: 16rpx;
  margin-bottom: 16rpx;
  padding: 16rpx 24rpx;
  border: 2rpx solid $ha-border;
  border-radius: $ha-radius-md;
  background-color: $ha-bg;
  transition: all 0.2s ease;
}

.ha-radio-group__item--active {
  border-color: $ha-primary;
  background-color: $ha-primary-light;
}

.ha-radio-group__radio {
  transform: scale(0.85);
}

.ha-radio-group__label {
  margin-left: 4rpx;
  font-size: 26rpx;
  color: $ha-text;
}
</style>
