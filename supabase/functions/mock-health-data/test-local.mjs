/**
 * 本地测试 mock-health-data 生成逻辑
 * 运行：node supabase/functions/mock-health-data/test-local.mjs
 */

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const PROFILES = {
  beginner: { steps: [3000, 7000], calories: [150, 350] },
  intermediate: { steps: [5000, 11000], calories: [280, 550] },
  advanced: { steps: [8000, 16000], calories: [450, 850] },
};

function generate(level, sleepGoal) {
  const p = PROFILES[level];
  return {
    user_id: "test-user-id",
    fitness_level: level,
    sleep_goal_hours: sleepGoal,
    steps: randomInt(p.steps[0], p.steps[1]),
    active_calories: randomInt(p.calories[0], p.calories[1]),
  };
}

console.log("=== mock-health-data 本地逻辑测试 ===\n");

for (const level of ["beginner", "intermediate", "advanced"]) {
  const sample = generate(level, 7.5);
  console.log(`${level}:`, JSON.stringify(sample, null, 2));
}

console.log("\n本地逻辑测试完成");
console.log("\n远程测试命令（部署后）：");
console.log(
  'curl -X POST "https://zewznptbyhurxaqirzmb.supabase.co/functions/v1/mock-health-data" \\'
);
console.log('  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \\');
console.log('  -H "Content-Type: application/json" \\');
console.log(
  '  -d "{\\"user_id\\":\\"your-user-uuid\\",\\"fitness_level\\":\\"intermediate\\",\\"sleep_goal_hours\\":7.5}"'
);
