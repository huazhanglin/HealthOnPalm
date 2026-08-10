import { defineConfig } from "vite";
import uni from "@dcloudio/vite-plugin-uni";

/** uni-app Vite 配置（@/ 由 uni 插件解析到 src/，含 src/uni_modules） */
export default defineConfig({
  plugins: [uni()],
});
