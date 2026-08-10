import type {
  FitnessLevel,
  FitnessProfile,
  MockHealthDataRequest,
  MockHealthDataResponse,
} from "../_shared/types.ts";

const VALID_FITNESS_LEVELS: FitnessLevel[] = [
  "beginner",
  "intermediate",
  "advanced",
];

/** 随机整数 [min, max] */
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** 随机浮点数，保留 1 位小数 */
function randomFloat(min: number, max: number): number {
  return Number((Math.random() * (max - min) + min).toFixed(1));
}

/** 各运动水平的模拟数据区间 */
const FITNESS_PROFILES: Record<FitnessLevel, FitnessProfile> = {
  beginner: {
    steps: () => randomInt(3000, 7000),
    activeCalories: () => randomInt(150, 350),
    standHours: () => randomFloat(4, 8),
    activityMinutes: () => randomInt(15, 45),
    restingHeartRate: () => randomInt(65, 80),
    workoutDoneProbability: 0.25,
  },
  intermediate: {
    steps: () => randomInt(5000, 11000),
    activeCalories: () => randomInt(280, 550),
    standHours: () => randomFloat(6, 10),
    activityMinutes: () => randomInt(35, 75),
    restingHeartRate: () => randomInt(58, 68),
    workoutDoneProbability: 0.45,
  },
  advanced: {
    steps: () => randomInt(8000, 16000),
    activeCalories: () => randomInt(450, 850),
    standHours: () => randomFloat(8, 12),
    activityMinutes: () => randomInt(60, 120),
    restingHeartRate: () => randomInt(52, 62),
    workoutDoneProbability: 0.65,
  },
};

const MOODS = ["great", "good", "normal", "tired"] as const;
const MOOD_WEIGHTS = [0.1, 0.35, 0.35, 0.2];

/** 按权重随机心情 */
function randomMood(): MockHealthDataResponse["mood"] {
  const r = Math.random();
  let cumulative = 0;
  for (let i = 0; i < MOODS.length; i += 1) {
    cumulative += MOOD_WEIGHTS[i];
    if (r <= cumulative) return MOODS[i];
  }
  return "normal";
}

/** 校验并规范化请求参数 */
export function parseMockHealthDataRequest(
  body: Partial<MockHealthDataRequest>
): { ok: true; value: Required<MockHealthDataRequest> } | { ok: false; error: string } {
  const userId = body.user_id?.trim();
  if (!userId) {
    return { ok: false, error: "user_id is required" };
  }

  const fitnessLevel = (body.fitness_level ?? "beginner") as FitnessLevel;
  if (!VALID_FITNESS_LEVELS.includes(fitnessLevel)) {
    return {
      ok: false,
      error: "fitness_level must be beginner, intermediate, or advanced",
    };
  }

  const sleepGoalHours = Number(body.sleep_goal_hours ?? 7.5);
  if (Number.isNaN(sleepGoalHours) || sleepGoalHours < 4 || sleepGoalHours > 12) {
    return {
      ok: false,
      error: "sleep_goal_hours must be between 4 and 12",
    };
  }

  return {
    ok: true,
    value: {
      user_id: userId,
      fitness_level: fitnessLevel,
      sleep_goal_hours: sleepGoalHours,
    },
  };
}

/**
 * 生成模拟健康数据
 * 步数、卡路里、心率等根据 fitness_level 自动调整
 */
export function generateMockHealthData(
  options: Required<MockHealthDataRequest>
): MockHealthDataResponse {
  const { user_id, fitness_level, sleep_goal_hours } = options;
  const profile = FITNESS_PROFILES[fitness_level];

  const actualSleep = sleep_goal_hours + (Math.random() * 3 - 1.5);
  const deepSleepRatio = 0.15 + Math.random() * 0.1;
  const remSleepRatio = 0.2 + Math.random() * 0.1;
  const lightSleepRatio = Math.max(0, 1 - deepSleepRatio - remSleepRatio);

  const sleepQualityScore = Math.min(
    100,
    Math.max(0, (actualSleep / sleep_goal_hours) * 70 + Math.random() * 30)
  );

  const resting = profile.restingHeartRate();
  const now = Date.now();
  const sleepEnd = new Date(now - randomInt(0, 3600) * 1000);
  const sleepStart = new Date(
    sleepEnd.getTime() - actualSleep * 3600000 - randomInt(0, 3600) * 1000
  );

  return {
    user_id,
    date: new Date().toISOString().split("T")[0],
    steps: profile.steps(),
    active_calories: profile.activeCalories(),
    stand_hours: profile.standHours(),
    activity_minutes: profile.activityMinutes(),
    sleep: {
      total_hours: Number(actualSleep.toFixed(1)),
      deep_sleep_hours: Number((actualSleep * deepSleepRatio).toFixed(1)),
      light_sleep_hours: Number((actualSleep * lightSleepRatio).toFixed(1)),
      rem_sleep_hours: Number((actualSleep * remSleepRatio).toFixed(1)),
      wake_ups: randomInt(0, 3),
      sleep_quality_score: Number(sleepQualityScore.toFixed(1)),
      sleep_start: sleepStart.toISOString(),
      sleep_end: sleepEnd.toISOString(),
    },
    heart_rate: {
      resting,
      avg: resting + randomInt(5, 25),
      max: randomInt(140, 180),
    },
    mood: randomMood(),
    workout_done: Math.random() < profile.workoutDoneProbability,
  };
}
