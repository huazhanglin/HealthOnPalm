import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import router from "./router";
import { useUserStore } from "./stores/user";
import "./styles/main.css";

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);

/** 启动时从 localStorage 恢复登录态 */
useUserStore(pinia).restoreSession();

app.mount("#app");
