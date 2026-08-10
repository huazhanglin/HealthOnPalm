<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import { useUserStore } from "@/stores/user";

const router = useRouter();
const userStore = useUserStore();

/** 格式化展示手机号（简单空格分隔，便于阅读） */
const displayPhone = computed(() => {
  const value = userStore.phone ?? "";
  if (value.startsWith("+86") && value.length > 3) {
    return `+86 ${value.slice(3)}`;
  }
  return value;
});

/** 退出登录 */
async function handleLogout(): Promise<void> {
  await userStore.logout();
  await router.push({ name: "login" });
}
</script>

<template>
  <div class="min-h-screen bg-slate-50">
    <!-- 顶部导航 -->
    <header class="border-b border-slate-200 bg-white">
      <div class="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
        <div class="flex items-center gap-2">
          <span
            class="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600 text-sm font-bold text-white"
          >
            H
          </span>
          <span class="text-lg font-semibold text-slate-900">Health On Palm</span>
        </div>
        <button
          type="button"
          class="text-sm text-slate-500 hover:text-slate-700"
          @click="handleLogout"
        >
          退出
        </button>
      </div>
    </header>

    <!-- 主内容 -->
    <main class="mx-auto max-w-3xl px-4 py-8">
      <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 class="text-xl font-semibold text-slate-900">欢迎回来</h1>
        <p class="mt-2 text-sm text-slate-500">你已成功登录 Health On Palm</p>

        <div class="mt-6 rounded-xl bg-teal-50 px-4 py-3">
          <p class="text-xs text-teal-700">当前登录手机号</p>
          <p class="mt-1 text-lg font-medium tracking-wide text-teal-900">
            {{ displayPhone }}
          </p>
        </div>
      </section>

      <!-- 占位：后续健康建议卡片 -->
      <section class="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 class="text-base font-medium text-slate-900">今日健康建议</h2>
        <p class="mt-2 text-sm text-slate-500">AI 正在分析你的身体状态...</p>
      </section>
    </main>
  </div>
</template>
