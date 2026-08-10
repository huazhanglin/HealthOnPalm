import { type ReactNode } from "react";

/** Card 组件的可选属性 */
interface CardProps {
  /** 卡片标题 */
  title?: string;
  /** 卡片内容 */
  children: ReactNode;
  /** 额外的 CSS 类名 */
  className?: string;
}

/**
 * 基础卡片 UI 组件
 * 用于包裹内容块，提供统一的圆角、边框与阴影样式
 */
export function Card({ title, children, className = "" }: CardProps) {
  return (
    <article
      className={`rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6 ${className}`}
    >
      {title && (
        <h2 className="mb-3 text-lg font-medium text-foreground">{title}</h2>
      )}
      {children}
    </article>
  );
}
