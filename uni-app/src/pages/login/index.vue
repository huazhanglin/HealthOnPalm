<script setup lang="ts">
import { onReady, onShow } from "@dcloudio/uni-app";
import { computed, ref, watch } from "vue";
import { HaBrandLogo } from "@/components/common";
import { APP_NAME, APP_NAME_ZH } from "@/config/brand";
import { useUserStore } from "@/stores/user";
import { routeAuthedUserFromLogin } from "@/utils/auth-routing";
import { isValidEmail, isValidPassword } from "@/utils/email";
import { closeSplashscreen } from "@/utils/splash";
import { openLegalDocument } from "@/lib/legal/documents";
import { hideLoading, showErrorToast, showLoading } from "@/utils/storage";

type AuthMode = "login" | "register";

const userStore = useUserStore();
userStore.hydrateFromStorageSync();
const mode = ref<AuthMode>("login");
const email = ref("");
const password = ref("");
const confirmPassword = ref("");

const isRegister = computed(() => mode.value === "register");
const subtitle = computed(() =>
  isRegister.value ? "注册账号，开启 HOP" : "邮箱登录，开启 HOP"
);
const primaryButtonText = computed(() =>
  isRegister.value ? "注册并登录" : "登录"
);
const switchHint = computed(() =>
  isRegister.value ? "已有账号？" : "还没有账号？"
);
const switchActionText = computed(() =>
  isRegister.value ? "去登录" : "去注册"
);

const canSubmit = computed(() => {
  if (userStore.isLoading) return false;
  if (!isValidEmail(email.value) || !isValidPassword(password.value)) {
    return false;
  }
  if (isRegister.value && password.value !== confirmPassword.value) {
    return false;
  }
  return true;
});

function setMode(next: AuthMode): void {
  mode.value = next;
  if (next === "login") {
    confirmPassword.value = "";
  }
}

function switchMode(): void {
  setMode(isRegister.value ? "login" : "register");
}

function errorMessageOf(error: unknown): string {
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: string }).message);
  }
  return "操作失败，请重试";
}

async function handleSubmit(): Promise<void> {
  if (!canSubmit.value) {
    if (!isValidEmail(email.value)) {
      showErrorToast("请输入有效邮箱");
      return;
    }
    if (!isValidPassword(password.value)) {
      showErrorToast("密码至少 6 位");
      return;
    }
    if (isRegister.value && password.value !== confirmPassword.value) {
      showErrorToast("两次密码不一致");
      return;
    }
    return;
  }

  showLoading(isRegister.value ? "注册中..." : "登录中...");
  try {
    if (isRegister.value) {
      await userStore.register(email.value, password.value);
      uni.showToast({ title: "注册成功", icon: "success" });
    } else {
      await userStore.login(email.value, password.value);
      uni.showToast({ title: "登录成功", icon: "success" });
    }
    setTimeout(() => {
      void routeAuthedUserFromLogin();
    }, 400);
  } catch (error) {
    showErrorToast(errorMessageOf(error));
  } finally {
    hideLoading();
  }
}

function openTerms(): void {
  openLegalDocument("terms");
}

function openPrivacy(): void {
  openLegalDocument("privacy");
}

let routedFromLogin = false;

function tryRouteAuthedUser(): void {
  if (routedFromLogin || !userStore.isLoggedIn) return;
  routedFromLogin = true;
  void routeAuthedUserFromLogin().then(() => {
    if (!userStore.isLoggedIn) {
      routedFromLogin = false;
    }
  });
}

onReady(() => {
  closeSplashscreen();
  tryRouteAuthedUser();
});

onShow(() => {
  closeSplashscreen();
  tryRouteAuthedUser();
});

watch(
  () => [userStore.isLoggedIn, userStore.sessionRestored] as const,
  () => {
    tryRouteAuthedUser();
  }
);

if (userStore.isLoggedIn) {
  void routeAuthedUserFromLogin();
}
</script>

<template>
  <view>
    <view v-if="userStore.isLoggedIn" class="entering">
      <HaBrandLogo size="large" />
      <text class="entering-title">{{ APP_NAME }}</text>
      <text class="entering-zh">{{ APP_NAME_ZH }}</text>
      <text class="entering-text">正在进入…</text>
    </view>
    <scroll-view v-else class="page" scroll-y>
    <view class="container">
      <view class="brand">
        <HaBrandLogo size="large" />
        <text class="brand-title">{{ APP_NAME }}</text>
        <text class="brand-zh">{{ APP_NAME_ZH }}</text>
        <text class="brand-subtitle">{{ subtitle }}</text>
      </view>

      <view class="form-card">
        <view class="mode-tabs">
          <view
            class="mode-tab"
            :class="{ 'mode-tab--active': !isRegister }"
            @tap="setMode('login')"
          >
            <text class="mode-tab-text">登录</text>
          </view>
          <view
            class="mode-tab"
            :class="{ 'mode-tab--active': isRegister }"
            @tap="setMode('register')"
          >
            <text class="mode-tab-text">注册</text>
          </view>
        </view>

        <text class="field-label">邮箱</text>
        <input
          v-model="email"
          class="text-input"
          type="text"
          maxlength="254"
          placeholder="name@example.com"
          :disabled="userStore.isLoading"
        />

        <text class="field-label password-label">密码</text>
        <input
          v-model="password"
          class="text-input"
          password
          maxlength="72"
          placeholder="至少 6 位"
          :disabled="userStore.isLoading"
        />

        <template v-if="isRegister">
          <text class="field-label password-label">确认密码</text>
          <input
            v-model="confirmPassword"
            class="text-input"
            password
            maxlength="72"
            placeholder="再输入一次密码"
            :disabled="userStore.isLoading"
          />
        </template>

        <text class="form-hint">
          使用常用邮箱注册。密码至少 6 位。
        </text>

        <button
          class="btn btn-primary"
          :disabled="!canSubmit"
          @tap="handleSubmit"
        >
          {{ primaryButtonText }}
        </button>

        <view class="switch-row">
          <text class="switch-hint">{{ switchHint }}</text>
          <text class="switch-link" @tap="switchMode">{{ switchActionText }}</text>
        </view>
      </view>

      <view class="footer">
        <text class="footer-text">登录即表示同意</text>
        <text class="footer-link" @tap="openTerms">《用户协议》</text>
        <text class="footer-text">与</text>
        <text class="footer-link" @tap="openPrivacy">《隐私政策》</text>
      </view>
    </view>
  </scroll-view>
  </view>
</template>

<style scoped>
.entering {
  min-height: 100vh;
  background-color: #f8fafc;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24rpx;
}

.entering-title {
  font-size: 44rpx;
  font-weight: 600;
  color: #0f172a;
}

.entering-zh {
  font-size: 28rpx;
  color: #0d9488;
  font-weight: 600;
}

.entering-text {
  font-size: 26rpx;
  color: #64748b;
}

.page {
  height: 100vh;
  background-color: #f8fafc;
}

.container {
  padding: 48rpx 40rpx 64rpx;
  box-sizing: border-box;
}

.brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 48rpx;
  gap: 24rpx;
}

.brand-title {
  font-size: 44rpx;
  font-weight: 600;
  color: #0f172a;
}

.brand-zh {
  font-size: 28rpx;
  font-weight: 600;
  color: #0d9488;
}

.brand-subtitle {
  margin-top: 12rpx;
  font-size: 26rpx;
  color: #64748b;
  text-align: center;
}

.form-card {
  background-color: #ffffff;
  border-radius: 24rpx;
  padding: 40rpx;
  box-shadow: 0 8rpx 32rpx rgba(15, 23, 42, 0.06);
}

.mode-tabs {
  display: flex;
  flex-direction: row;
  margin-bottom: 32rpx;
  background-color: #f1f5f9;
  border-radius: 16rpx;
  padding: 6rpx;
}

.mode-tab {
  flex: 1;
  height: 72rpx;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mode-tab--active {
  background-color: #ffffff;
}

.mode-tab-text {
  font-size: 28rpx;
  color: #64748b;
}

.mode-tab--active .mode-tab-text {
  color: #0d9488;
  font-weight: 600;
}

.field-label {
  display: block;
  font-size: 28rpx;
  color: #334155;
  margin-bottom: 16rpx;
}

.password-label {
  margin-top: 28rpx;
}

.text-input {
  width: 100%;
  height: 88rpx;
  border: 2rpx solid #e2e8f0;
  border-radius: 16rpx;
  padding: 0 24rpx;
  font-size: 28rpx;
  color: #0f172a;
  background-color: #ffffff;
  box-sizing: border-box;
}

.form-hint {
  display: block;
  margin-top: 20rpx;
  margin-bottom: 32rpx;
  font-size: 22rpx;
  color: #94a3b8;
  line-height: 1.5;
}

.btn {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  border-radius: 16rpx;
  font-size: 30rpx;
  font-weight: 500;
}

.btn::after {
  border: none;
}

.btn-primary {
  background-color: #0d9488;
  color: #ffffff;
  border: none;
}

.btn-primary[disabled] {
  background-color: #cbd5e1;
  color: #ffffff;
}

.switch-row {
  margin-top: 28rpx;
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  gap: 8rpx;
}

.switch-hint {
  font-size: 24rpx;
  color: #94a3b8;
}

.switch-link {
  font-size: 24rpx;
  color: #0d9488;
}

.footer {
  margin-top: 48rpx;
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
}

.footer-text {
  font-size: 22rpx;
  color: #94a3b8;
}

.footer-link {
  font-size: 22rpx;
  color: #0d9488;
  margin: 0 4rpx;
}
</style>
