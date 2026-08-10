import { createSSRApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";

/** uni-app 入口：挂载 Vue 3 + Pinia */
export function createApp() {
  const app = createSSRApp(App);
  const pinia = createPinia();
  app.use(pinia);
  return { app };
}
