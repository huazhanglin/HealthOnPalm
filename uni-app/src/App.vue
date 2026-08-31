<script setup lang="ts">
import { onLaunch, onShow } from "@dcloudio/uni-app";
import { useUserStore } from "@/stores/user";
import { bootstrapApp } from "@/utils/bootstrap";
import { ensureAccessToken } from "@/utils/auth-session";
import { closeSplashscreen } from "@/utils/splash";

onLaunch(() => {
  closeSplashscreen();
  setTimeout(closeSplashscreen, 500);
  setTimeout(closeSplashscreen, 1500);

  const userStore = useUserStore();
  userStore.hydrateFromStorageSync();
  void bootstrapApp();
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
