import { Card } from "@/components/ui/Card";

/**
 * 今日健康建议卡片
 * MVP 阶段展示 AI 分析中的占位状态，后续接入真实健康数据与建议 API
 */
export function TodayCard() {
  return (
    <Card title="今日健康建议">
      <div className="flex items-start gap-3">
        {/* 加载动画指示器 */}
        <span
          className="mt-1 inline-block h-2 w-2 animate-pulse rounded-full bg-primary"
          aria-hidden
        />
        <p className="text-sm leading-relaxed text-muted sm:text-base">
          AI 正在分析你的身体状态...
        </p>
      </div>
    </Card>
  );
}
