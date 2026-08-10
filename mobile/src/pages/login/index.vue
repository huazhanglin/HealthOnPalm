<script setup lang="ts">
import { computed, onUnmounted, ref } from "vue";
import { useRouter } from "vue-router";
import CountryCodeSelect from "@/components/CountryCodeSelect.vue";
import { useUserStore } from "@/stores/user";

const router = useRouter();
const userStore = useUserStore();

/** 表单字段 */
const dialCode = ref("+86");
const phoneNumber = ref("");
const otp = ref("");

/** 验证码发送倒计时（秒） */
const countdown = ref(0);
let countdownTimer: ReturnType<typeof setInterval> | null = null;

/** 是否处于倒计时中 */
const isCountingDown = computed(() => countdown.value > 0);

/** 发送按钮文案 */
const sendButtonLabel = computed(() =>
  isCountingDown.value ? `${countdown.value}s 后重发` : "发送验证码"
);

/** 发送按钮是否可点击 */
const canSendOtp = computed(
  () => !userStore.isLoading && !isCountingDown.value && phoneNumber.value.trim().length > 0
);

/** 登录按钮是否可点击 */
const canLogin = computed(
  () =>
    !userStore.isLoading &&
    phoneNumber.value.trim().length > 0 &&
    otp.value.trim().length >= 4
);

/** 启动 60 秒倒计时 */
function startCountdown(seconds = 60): void {
  countdown.value = seconds;
  if (countdownTimer) clearInterval(countdownTimer);

  countdownTimer = setInterval(() => {
    countdown.value -= 1;
    if (countdown.value <= 0 && countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
  }, 1000);
}

/** 发送短信验证码 */
async function handleSendOtp(): Promise<void> {
  userStore.clearError();
  const success = await userStore.sendOtp(dialCode.value, phoneNumber.value);
  if (success) {
    startCountdown();
  }
}

/** 验证 OTP 并登录 */
async function handleLogin(): Promise<void> {
  userStore.clearError();
  const success = await userStore.verifyOtp(dialCode.value, phoneNumber.value, otp.value);
  if (success) {
    await router.push({ name: "home" });
  }
}

onUnmounted(() => {
  if (countdownTimer) clearInterval(countdownTimer);
});
</script>

<template>
  <div class="flex min-h-screen flex-col items-center justify-center px-4 py-8">
    <div class="w-full max-w-md">
      <!-- 品牌区 -->
      <div class="mb-8 text-center">
        <div
          class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-600 text-xl font-bold text-white"
        >
          H
        </div>
        <h1 class="text-2xl font-semibold text-slate-900">Health On Palm</h1>
        <p class="mt-2 text-sm text-slate-500">手机号登录，开启你的健康智能体</p>
      </div>

      <!-- 登录表单 -->
      <form class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" @submit.prevent="handleLogin">
        <!-- 手机号 -->
        <label class="mb-2 block text-sm font-medium text-slate-700">手机号</label>
        <div class="mb-4 flex">
          <CountryCodeSelect v-model="dialCode" :disabled="userStore.isLoading" />
          <input
            v-model="phoneNumber"
            type="tel"
            inputmode="tel"
            autocomplete="tel-national"
            placeholder="请输入手机号"
            :disabled="userStore.isLoading"
            class="h-12 w-full rounded-r-xl border border-slate-200 px-4 text-sm outline-none focus:border-teal-500 disabled:cursor-not-allowed disabled:bg-slate-50"
          />
        </div>

        <!-- 发送验证码 -->
        <button
          type="button"
          class="mb-4 h-11 w-full rounded-xl border border-teal-600 text-sm font-medium text-teal-700 transition hover:bg-teal-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400 disabled:hover:bg-transparent"
          :disabled="!canSendOtp"
          @click="handleSendOtp"
        >
          {{ userStore.isLoading && !otp ? "发送中..." : sendButtonLabel }}
        </button>

        <!-- 验证码 -->
        <label class="mb-2 block text-sm font-medium text-slate-700">验证码</label>
        <input
          v-model="otp"
          type="text"
          inputmode="numeric"
          autocomplete="one-time-code"
          maxlength="6"
          placeholder="请输入 6 位验证码"
          :disabled="userStore.isLoading"
          class="mb-4 h-12 w-full rounded-xl border border-slate-200 px-4 text-sm tracking-widest outline-none focus:border-teal-500 disabled:cursor-not-allowed disabled:bg-slate-50"
        />

        <!-- 错误提示 -->
        <p
          v-if="userStore.lastError"
          class="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600"
          role="alert"
        >
          {{ userStore.lastError.message }}
        </p>

        <!-- 登录 -->
        <button
          type="submit"
          class="h-12 w-full rounded-xl bg-teal-600 text-sm font-medium text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          :disabled="!canLogin"
        >
          {{ userStore.isLoading && otp ? "登录中..." : "登录" }}
        </button>
      </form>

      <p class="mt-6 text-center text-xs text-slate-400">
        登录即表示同意
        <a href="#" class="text-teal-600 underline">用户协议</a>
        与
        <a href="#" class="text-teal-600 underline">隐私政策</a>
      </p>
    </div>
  </div>
</template>
