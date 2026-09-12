<script setup lang="ts">
import { onLoad } from "@dcloudio/uni-app";
import { computed, ref } from "vue";
import { openLegalDocument } from "@/lib/legal/documents";
import {
  hasGrantedAiConsent,
  setAiProcessingConsent,
} from "@/lib/legal/ai-consent";
import { useUserStore } from "@/stores/user";
import { switchToTab } from "@/utils/tab";
import { showErrorToast } from "@/utils/storage";

const userStore = useUserStore();
userStore.hydrateFromStorageSync();

const fromProfile = ref(false);
const granted = computed(() => hasGrantedAiConsent(userStore.userId));

onLoad((query) => {
  fromProfile.value = query?.from === "profile";
});

function finish(): void {
  if (fromProfile.value) {
    uni.navigateBack();
    return;
  }
  switchToTab("/pages/index/index");
}

function handleAgree(): void {
  const uid = userStore.userId;
  if (!uid) {
    showErrorToast("请先登录");
    return;
  }
  setAiProcessingConsent(uid, true);
  uni.showToast({ title: "已同意", icon: "success" });
  setTimeout(() => finish(), 350);
}

function handleDecline(): void {
  const uid = userStore.userId;
  if (!uid) {
    showErrorToast("请先登录");
    return;
  }
  setAiProcessingConsent(uid, false);
  uni.showToast({ title: "已关闭 AI 生成", icon: "none" });
  setTimeout(() => finish(), 350);
}

function openPrivacy(): void {
  openLegalDocument("privacy");
}
</script>

<template>
  <scroll-view class="page" scroll-y>
    <view class="inner">
      <text class="title">第三方 AI 处理说明</text>
      <text class="lead">
        在把你的信息发送给第三方 AI 之前，我们需要你的明确同意。仅把本说明写在隐私政策里不够，因此会在 App 内单独询问。
      </text>
      <text class="lead-en">
        Before we send personal data to a third-party AI service, we ask for your permission in the app. This is in addition to the Privacy Policy.
      </text>

      <view class="card">
        <text class="heading">会发送什么 / What is sent</text>
        <text class="body">
          你在助手里输入的文字；若使用语音，录音会先转成文字再发送。生成晨间简报或训练计划时，会发送与当天相关的健康摘要（例如你已授权的活动、睡眠、心率类指标）以及档案中的运动偏好。我们不发送临床病历、处方或实验室结果，也不发送密码。
        </text>
        <text class="body-en">
          Chat text; transcribed voice if you use the microphone; when generating a morning briefing or workout plan, a same-day health summary from Apple Health metrics you authorized, plus workout preferences. We do not send clinical records, prescriptions, lab results, or passwords.
        </text>
      </view>

      <view class="card">
        <text class="heading">发送给谁、做什么 / Who receives it</text>
        <text class="body">
          数据先到我们的云函数（Supabase），再调用硅基流动（SiliconFlow）的大模型与语音接口，用于生成简报、训练计划、问答和语音识别/播报。提供方按我们的约定处理，不得将健康数据用于广告。提示词要求模型不提供诊断、处方或用药剂量。
        </text>
        <text class="body-en">
          Data first goes to our cloud functions (Supabase), then to SiliconFlow for large-language-model and speech APIs, only to generate briefings, workout plans, Q&A, and speech. The provider must not use health data for advertising. Prompts forbid diagnosis, prescriptions, or dosages.
        </text>
      </view>

      <view class="card">
        <text class="heading">你可以怎么选 / Your choice</text>
        <text class="body">
          点「同意」后才会发送上述数据。点「暂不使用 AI」仍可手动记录运动、睡眠、心情并查看已有数据；助手、AI 晨报和 AI 训练计划将不可用。之后可在「我的 → 账号与隐私」更改。详见
        </text>
        <text class="link" @tap="openPrivacy">《隐私政策》 / Privacy Policy</text>
      </view>

      <button class="btn-primary" @tap="handleAgree">同意并继续 · Agree</button>
      <button class="btn-secondary" @tap="handleDecline">暂不使用 AI · Not now</button>
      <text v-if="granted" class="status">当前：已同意第三方 AI 处理</text>
    </view>
  </scroll-view>
</template>

<style scoped>
.page {
  height: 100vh;
  background-color: #f8fafc;
}

.inner {
  padding: 32rpx 40rpx 80rpx;
}

.title {
  display: block;
  font-size: 40rpx;
  font-weight: 700;
  color: #0f172a;
}

.lead,
.lead-en,
.body,
.body-en,
.status {
  display: block;
  font-size: 28rpx;
  color: #334155;
  line-height: 1.7;
}

.lead {
  margin-top: 20rpx;
}

.lead-en,
.body-en {
  margin-top: 12rpx;
  font-size: 24rpx;
  color: #64748b;
}

.card {
  margin-top: 28rpx;
  padding: 28rpx;
  background: #ffffff;
  border-radius: 20rpx;
}

.heading {
  display: block;
  font-size: 30rpx;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 12rpx;
}

.link {
  display: block;
  margin-top: 8rpx;
  font-size: 28rpx;
  color: #0d9488;
}

.btn-primary,
.btn-secondary {
  margin-top: 24rpx;
  height: 88rpx;
  line-height: 88rpx;
  border-radius: 16rpx;
  font-size: 30rpx;
}

.btn-primary {
  background-color: #0d9488;
  color: #ffffff;
}

.btn-secondary {
  background-color: #ffffff;
  color: #334155;
  border: 2rpx solid #e2e8f0;
}

.btn-primary::after,
.btn-secondary::after {
  border: none;
}

.status {
  margin-top: 24rpx;
  font-size: 24rpx;
  color: #0d9488;
  text-align: center;
}
</style>
