<script setup lang="ts">
import type { CountryCodeOption } from "@/types/auth";

/** 常用国家/地区区号列表 */
const countryCodes: CountryCodeOption[] = [
  { dialCode: "+86", label: "中国 +86" },
  { dialCode: "+852", label: "中国香港 +852" },
  { dialCode: "+853", label: "中国澳门 +853" },
  { dialCode: "+886", label: "中国台湾 +886" },
  { dialCode: "+1", label: "美国/加拿大 +1" },
  { dialCode: "+44", label: "英国 +44" },
  { dialCode: "+81", label: "日本 +81" },
  { dialCode: "+82", label: "韩国 +82" },
  { dialCode: "+65", label: "新加坡 +65" },
];

/** 双向绑定：当前选中的国际区号 */
const model = defineModel<string>({ required: true });

/** 禁用状态（发送/登录进行中） */
defineProps<{
  disabled?: boolean;
}>();
</script>

<template>
  <select
    v-model="model"
    :disabled="disabled"
    class="h-12 shrink-0 rounded-l-xl border border-r-0 border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-teal-500 disabled:cursor-not-allowed disabled:opacity-60"
    aria-label="国家代码"
  >
    <option v-for="item in countryCodes" :key="item.dialCode" :value="item.dialCode">
      {{ item.label }}
    </option>
  </select>
</template>
