/**
 * 今日训练计划：Pinia + 本地存储，供冷启动秒开。
 */
import { defineStore } from "pinia";
import { ref } from "vue";
import { agentApi } from "@/api/agent";
import {
  enrichWorkoutPlanMedia,
  fetchTodayCachedWorkoutPlan,
  type WorkoutPlan,
} from "@/lib/health/workout-plan";
import {
  clearPersistedWorkoutPlan,
  readPersistedWorkoutPlan,
  writePersistedWorkoutPlan,
} from "@/lib/health/workout-plan-cache";
import { useUserStore } from "@/stores/user";
import {
  WORKOUT_PLAN_TTL_MS,
  isFresh as isStampFresh,
  markFresh,
} from "@/utils/freshness";

let loadInFlight: Promise<void> | null = null;

export const useWorkoutStore = defineStore("workout", () => {
  const plan = ref<WorkoutPlan | null>(null);
  const isLoading = ref(false);
  const errorMessage = ref("");

  function persist(userId: string, next: WorkoutPlan): void {
    plan.value = next;
    writePersistedWorkoutPlan(userId, next);
    markFresh(`workout-plan:${userId}`);
  }

  function hydrateLocal(userId: string): void {
    if (plan.value) return;
    const stored = readPersistedWorkoutPlan(userId);
    if (!stored) return;
    plan.value = stored.plan;
    if (
      stored.updatedAt > 0 &&
      Date.now() - stored.updatedAt < WORKOUT_PLAN_TTL_MS
    ) {
      markFresh(`workout-plan:${userId}`);
    }
  }

  async function applyPlan(userId: string, next: WorkoutPlan): Promise<void> {
    persist(userId, next);
    const withMedia = await enrichWorkoutPlanMedia(next);
    persist(userId, withMedia);
  }

  async function loadPlan(forceRefresh = false): Promise<void> {
    const userStore = useUserStore();
    const userId = userStore.userId;
    if (!userId) return;

    hydrateLocal(userId);

    if (
      !forceRefresh &&
      plan.value &&
      isStampFresh(`workout-plan:${userId}`, WORKOUT_PLAN_TTL_MS)
    ) {
      if ([...plan.value.warmup, ...plan.value.main, ...plan.value.cooldown].some((item) => !item.image_url)) {
        void enrichWorkoutPlanMedia(plan.value).then((withMedia) => {
          persist(userId, withMedia);
        });
      }
      return;
    }

    if (loadInFlight && !forceRefresh) {
      await loadInFlight;
      return;
    }

    const run = (async () => {
      errorMessage.value = "";
      const blocking = !plan.value;
      if (blocking) isLoading.value = true;

      try {
        if (!forceRefresh) {
          const cached = await fetchTodayCachedWorkoutPlan(userId);
          if (cached) {
            await applyPlan(userId, cached);
            return;
          }
        }

        if (!plan.value) isLoading.value = true;
        const generated = await agentApi.getWorkoutPlan(userId, {
          forceRefresh,
        });
        await applyPlan(userId, generated);
      } catch (error) {
        console.error("[workout] 加载计划失败:", error);
        const message = error instanceof Error ? error.message : "加载失败";
        if (!plan.value) errorMessage.value = message;
      } finally {
        isLoading.value = false;
      }
    })();

    loadInFlight = run.finally(() => {
      loadInFlight = null;
    });
    await loadInFlight;
  }

  function reset(): void {
    plan.value = null;
    isLoading.value = false;
    errorMessage.value = "";
    clearPersistedWorkoutPlan();
  }

  return {
    plan,
    isLoading,
    errorMessage,
    loadPlan,
    reset,
  };
});
