import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Next.js Middleware
 * 在每个匹配请求上刷新 Supabase 用户会话
 */
export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

/** 仅对页面路由生效，排除静态资源与 API 路由 */
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
