import { createRouter, createWebHistory } from "vue-router";
import { useUserStore } from "@/stores/user";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/login",
      name: "login",
      component: () => import("@/pages/login/index.vue"),
      meta: { guestOnly: true },
    },
    {
      path: "/",
      name: "home",
      component: () => import("@/pages/home/index.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/:pathMatch(.*)*",
      redirect: "/",
    },
  ],
});

/** 路由守卫：未登录跳转登录页，已登录禁止访问登录页 */
router.beforeEach((to) => {
  const userStore = useUserStore();

  if (to.meta.requiresAuth && !userStore.isLoggedIn) {
    return { name: "login" };
  }

  if (to.meta.guestOnly && userStore.isLoggedIn) {
    return { name: "home" };
  }

  return true;
});

export default router;
