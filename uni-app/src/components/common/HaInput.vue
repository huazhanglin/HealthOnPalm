<script setup lang="ts">
import { computed } from "vue";

/** HaInput 属性，支持 v-model */
const props = withDefaults(
  defineProps<{
    /** 输入类型 */
    type?: "text" | "number" | "digit" | "password";
    /** 占位符 */
    placeholder?: string;
    /** 绑定值 */
    modelValue?: string | number;
    /** 禁用 */
    disabled?: boolean;
    /** 错误信息 */
    error?: string;
  }>(),
  {
    type: "text",
    placeholder: "",
    modelValue: "",
    disabled: false,
    error: "",
  }
);

const emit = defineEmits<{
  "update:modelValue": [value: string];
  input: [value: string];
  blur: [value: string];
  focus: [value: string];
}>();

const inputClass = computed(() => [
  "ha-input",
  { "ha-input--error": !!props.error, "ha-input--disabled": props.disabled },
]);

function onInput(event: { detail?: { value?: string } }): void {
  const value = event.detail?.value ?? "";
  emit("update:modelValue", value);
  emit("input", value);
}

function onBlur(event: { detail?: { value?: string } }): void {
  emit("blur", event.detail?.value ?? "");
}

function onFocus(event: { detail?: { value?: string } }): void {
  emit("focus", event.detail?.value ?? "");
}

/** 模板事件包装，兼容 uni-app 与 H5 类型差异 */
function handleInput(payload: unknown): void {
  onInput(payload as { detail?: { value?: string } });
}

function handleBlur(payload: unknown): void {
  onBlur(payload as { detail?: { value?: string } });
}

function handleFocus(payload: unknown): void {
  onFocus(payload as { detail?: { value?: string } });
}
</script>

<template>
  <view class="ha-input-wrap">
    <input
      :class="inputClass"
      :type="type"
      :value="String(modelValue)"
      :placeholder="placeholder"
      :disabled="disabled"
      @input="handleInput"
      @blur="handleBlur"
      @focus="handleFocus"
    />
    <text v-if="error" class="ha-input__error">{{ error }}</text>
  </view>
</template>

<style lang="scss" scoped>

.ha-input-wrap {
  width: 100%;
}

.ha-input {
  width: 100%;
  height: 88rpx;
  padding: 0 24rpx;
  border: 2rpx solid $ha-border;
  border-radius: $ha-radius-md;
  font-size: 28rpx;
  color: $ha-text;
  background-color: $ha-bg;
  box-sizing: border-box;
  transition: border-color 0.2s ease;
}

.ha-input:focus {
  border-color: $ha-primary;
}

.ha-input--error {
  border-color: $ha-error;
}

.ha-input--disabled {
  background-color: #f1f5f9;
  color: $ha-text-secondary;
}

.ha-input__error {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  color: $ha-error;
}
</style>
