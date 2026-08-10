<script setup lang="ts">
/** 底部 Tab 项配置 */
interface TabItem {
  key: string;
  label: string;
  icon: string;
  path: string;
}

const props = defineProps<{
  /** 当前激活的 Tab key */
  active: string;
}>();

const tabs: TabItem[] = [
  { key: "home", label: "首页", icon: "🏠", path: "/pages/index/index" },
  { key: "records", label: "记录", icon: "📊", path: "/pages/records/index" },
  { key: "profile", label: "我的", icon: "👤", path: "/pages/profile/index" },
];

/** 切换 Tab 页面 */
function switchTab(tab: TabItem): void {
  if (tab.key === props.active) return;
  uni.redirectTo({ url: tab.path });
}
</script>

<template>
  <view class="tab-bar">
    <view
      v-for="tab in tabs"
      :key="tab.key"
      class="tab-item"
      @tap="switchTab(tab)"
    >
      <text class="tab-icon" :class="{ active: tab.key === active }">{{ tab.icon }}</text>
      <text class="tab-label" :class="{ active: tab.key === active }">{{ tab.label }}</text>
    </view>
  </view>
</template>

<style scoped>
.tab-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-around;
  height: 110rpx;
  padding-bottom: env(safe-area-inset-bottom);
  background-color: #ffffff;
  border-top: 2rpx solid #e2e8f0;
  box-shadow: 0 -4rpx 24rpx rgba(15, 23, 42, 0.04);
  z-index: 100;
}

.tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.tab-icon {
  font-size: 36rpx;
  opacity: 0.5;
}

.tab-icon.active {
  opacity: 1;
}

.tab-label {
  margin-top: 4rpx;
  font-size: 22rpx;
  color: #64748b;
}

.tab-label.active {
  color: #0d9488;
  font-weight: 600;
}
</style>
