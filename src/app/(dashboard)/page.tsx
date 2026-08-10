import { TodayCard } from "@/components/health/TodayCard";

/**
 * 今日建议首页
 * 展示 AI 生成的当日健康建议（MVP 阶段为占位内容）
 */
export default function DashboardPage() {
  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          今日建议
        </h1>
        <p className="mt-1 text-sm text-muted sm:text-base">
          根据你的健康数据，为你生成个性化建议
        </p>
      </header>

      <TodayCard />
    </section>
  );
}
