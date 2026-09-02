<script setup lang="ts">
import { onLoad } from "@dcloudio/uni-app";
import { ref } from "vue";
import {
  getLegalDocument,
  type LegalDocument,
} from "@/lib/legal/documents";

const doc = ref<LegalDocument>(getLegalDocument("privacy"));

onLoad((query) => {
  const next = getLegalDocument(query?.doc);
  doc.value = next;
  uni.setNavigationBarTitle({ title: next.title });
});
</script>

<template>
  <scroll-view class="page" scroll-y>
    <view class="inner">
      <text class="title">{{ doc.title }}</text>
      <text class="meta">掌握健康（Health on Palm / HOP）</text>
      <text class="meta">{{ doc.meta }}</text>

      <view v-for="section in doc.sections" :key="section.title" class="section">
        <text class="heading">{{ section.title }}</text>
        <text
          v-for="(paragraph, index) in section.paragraphs"
          :key="index"
          class="paragraph"
        >
          {{ paragraph }}
        </text>
      </view>

      <text class="footer">联系邮箱：huazhang.lin@gmail.com</text>
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

.meta {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #64748b;
  line-height: 1.5;
}

.section {
  margin-top: 36rpx;
  padding-top: 24rpx;
  border-top: 1rpx solid #e2e8f0;
}

.heading {
  display: block;
  font-size: 30rpx;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 12rpx;
}

.paragraph {
  display: block;
  font-size: 28rpx;
  color: #334155;
  line-height: 1.7;
  margin-bottom: 16rpx;
}

.footer {
  display: block;
  margin-top: 48rpx;
  font-size: 24rpx;
  color: #94a3b8;
}
</style>
