/**
 * 今日训练计划：Pinia + 本地存储，供冷启动秒开。
 */
import { defineStore } from "pinia";
import { ref } from "vue";
import { agentApi } from "@/api/agent";
import {
  enrichWorkoutPlanMedia,
  ensureWorkoutPlanDoses,
  applyLocalExerciseDemos,
  fetchTodayCachedWorkoutPlan,
  type WorkoutPlan,
} from "@/lib/health/workout-plan";
import {
  clearPersistedWorkoutPlan,
  readPersistedWorkoutPlan,
  writePersistedWorkoutPlan,
} from "@/lib/health/workout-plan-cache";
import { useUserStore } from "@/stores/user";
import { markFresh } from "@/utils/freshness";

let loadInFlight: Promise<void> | null = null;

export const useWorkoutStore = defineStore("workout", () => {
  const plan = ref<WorkoutPlan | null>(null);
  const isLoading = ref(false);
  const errorMessage = ref("");

  function persist(userId: string, next: WorkoutPlan): void {
    const withDose = applyLocalExerciseDemos(ensureWorkoutPlanDoses(next));
    plan.value = withDose;
    writePersistedWorkoutPlan(userId, withDose);
    markFresh(`workout-plan:${userId}`);
  }

  function hydrateLocal(userId: string): void {
    const stored = readPersistedWorkoutPlan(userId);
    if (!stored) {
      plan.value = null;
      return;
    }
    plan.value = applyLocalExerciseDemos(ensureWorkoutPlanDoses(stored.plan));
    markFresh(`workout-plan:${userId}`);
  }

  async function loadPlan(forceRefresh = false): Promise<void> {
    const userStore = useUserStore();
    const userId = userStore.userId;
    if (!userId) return;

    hydrateLocal(userId);

    // 当天本地计划直接展示，避免每次进训练页都等 LLM
    if (!forceRefresh && plan.value) {
      if (
        [...plan.value.warmup, ...plan.value.main, ...plan.value.cooldown].some(
          (item) => !item.image_url
        )
      ) {
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
      if (!plan.value) isLoading.value = true;

      try {
        if (!forceRefresh) {
          const cached = await fetchTodayCachedWorkoutPlan(userId);
          if (cached) {
            persist(userId, cached);
            void enrichWorkoutPlanMedia(cached).then((withMedia) => {
              persist(userId, withMedia);
            });
            return;
          }
        }

        if (!plan.value) isLoading.value = true;
        const generated = await agentApi.getWorkoutPlan(userId, {
          forceRefresh,
        });
        persist(userId, generated);
        void enrichWorkoutPlanMedia(generated).then((withMedia) => {
          persist(userId, withMedia);
        });
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
