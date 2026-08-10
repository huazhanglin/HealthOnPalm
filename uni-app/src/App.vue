<script setup lang="ts">
import { onLaunch, onShow } from "@dcloudio/uni-app";
import { bootstrapApp } from "@/utils/bootstrap";
import { ensureAccessToken } from "@/utils/auth-session";
import { closeSplashscreen } from "@/utils/splash";

onLaunch(() => {
  closeSplashscreen();
  setTimeout(closeSplashscreen, 500);
  setTimeout(closeSplashscreen, 1500);

  // 延迟执行，避免阻塞 WebView 首屏（须静态 import，否则 App 打包 IIFE 与 code-split 冲突）
  setTimeout(() => {
    void bootstrapApp();
  }, 800);
});

/** 回到前台时静默续期，减少反复登录 */
onShow(() => {
  void ensureAccessToken();
});
</script>

<template>
  <view />
</template>

<style>
page {
  background-color: #f8fafc;
  color: #0f172a;
}
</style>
