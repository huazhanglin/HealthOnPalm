// __tests__/recovery-score.test.ts

Deno.test('recovery score - 睡眠充足时应该得高分', () => {
    const result = calculateRecoveryScore({
      sleep_hours: 8.0,
      sleep_quality_score: 90,
      rest_days_consecutive: 0,
      steps: 8000,
      mood: 'good',
    })
    console.assert(result.score >= 70, `期望 ≥70，实际 ${result.score}`)
  })
  
  Deno.test('recovery score - 睡眠不足4小时应该得低分', () => {
    const result = calculateRecoveryScore({
      sleep_hours: 3.5,
      sleep_quality_score: 30,
      rest_days_consecutive: 0,
      steps: 3000,
      mood: 'tired',
    })
    console.assert(result.score <= 35, `期望 ≤35，实际 ${result.score}`)
  })
  
  Deno.test('recovery score - 连续休息日应该提示训练', () => {
    const result = calculateRecoveryScore({
      sleep_hours: 7.5,
      sleep_quality_score: 80,
      rest_days_consecutive: 2,  // 连续休息2天
      steps: 5000,
      mood: 'great',
    })
    console.assert(result.recommendation === 'train', `期望 train，实际 ${result.recommendation}`)
  })
  
  Deno.test('recovery score - 极度疲劳应该提示休息', () => {
    const result = calculateRecoveryScore({
      sleep_hours: 4.0,
      sleep_quality_score: 40,
      rest_days_consecutive: 0,
      steps: 2000,
      mood: 'tired',
    })
    console.assert(result.recommendation === 'rest', `期望 rest，实际 ${result.recommendation}`)
  })
  