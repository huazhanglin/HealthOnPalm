// supabase/functions/sync-healthkit/index.ts
// Deno Edge Function：将 iOS HealthKit 当日数据写入 Supabase

import { createClient } from 'npm:@supabase/supabase-js@2.49.8'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

interface WorkoutRecord {
  id: string
  workoutType: string
  workoutTypeId: number
  startDate: string
  endDate: string
  duration: number
  calories?: number
  distance?: number
  distanceKm?: number
}

/** 前端 toSyncPayload 输出的扁平结构 */
interface HealthKitSyncPayload {
  date?: string
  steps?: number
  activeCalories?: number
  basalCalories?: number
  standHours?: number
  exerciseMinutes?: number
  flightsClimbed?: number | null
  sleepHours?: number | null
  deepSleepHours?: number | null
  remSleepHours?: number | null
  lightSleepHours?: number | null
  wakeUps?: number | null
  restingHeartRate?: number | null
  avgHeartRate?: number | null
  maxHeartRate?: number | null
  walkingHeartRateAvg?: number | null
  hrvMs?: number | null
  spo2Percent?: number | null
  respiratoryRate?: number | null
  vo2Max?: number | null
  source?: string
  workouts?: WorkoutRecord[]
  totalDistance?: number
  // 兼容嵌套格式
  sleep?: {
    totalHours?: number
    deepSleepHours?: number
    remSleepHours?: number
    lightSleepHours?: number
    wakeUps?: number
  }
  heartRate?: {
    resting?: number | null
    avg?: number | null
    max?: number | null
    walkingAvg?: number | null
  }
}

function toIsoDateTime(value: string): string {
  if (!value) return new Date().toISOString()
  if (value.includes('T')) {
    return value.endsWith('Z') ? value : `${value}Z`
  }
  return value.replace(' ', 'T') + 'Z'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return json({ error: 'Unauthorized' }, 401)
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return json({ error: 'Unauthorized' }, 401)
    }

    const payload = (await req.json()) as HealthKitSyncPayload
    const shanghaiToday = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date())
    const today = payload.date || shanghaiToday
    const workouts = Array.isArray(payload.workouts) ? payload.workouts : []
    const totalDistance = Math.round(payload.totalDistance ?? 0)

    const sleepHours =
      payload.sleepHours ?? payload.sleep?.totalHours ?? null
    const deepSleepHours =
      payload.deepSleepHours ?? payload.sleep?.deepSleepHours ?? null
    const remSleepHours =
      payload.remSleepHours ?? payload.sleep?.remSleepHours ?? null
    const lightSleepHours =
      payload.lightSleepHours ?? payload.sleep?.lightSleepHours ?? null
    const wakeUps = payload.wakeUps ?? payload.sleep?.wakeUps ?? null
    const restingHeartRate =
      payload.restingHeartRate ?? payload.heartRate?.resting ?? null
    const avgHeartRate =
      payload.avgHeartRate ?? payload.heartRate?.avg ?? null
    const maxHeartRate =
      payload.maxHeartRate ?? payload.heartRate?.max ?? null
    const walkingHeartRateAvg =
      payload.walkingHeartRateAvg ?? payload.heartRate?.walkingAvg ?? null

    const syncedTypes: string[] = []

    // 1. daily_summaries
    const { error: summaryErr } = await supabase.from('daily_summaries').upsert(
      {
        user_id: user.id,
        date: today,
        steps: payload.steps ?? 0,
        active_calories: payload.activeCalories ?? 0,
        basal_calories: payload.basalCalories ?? null,
        stand_hours: payload.standHours ?? 0,
        exercise_minutes: payload.exerciseMinutes ?? 0,
        resting_heart_rate: restingHeartRate,
        avg_heart_rate: avgHeartRate,
        max_heart_rate: maxHeartRate,
        walking_hr_avg: walkingHeartRateAvg,
        hrv_ms: payload.hrvMs ?? null,
        spo2_percent: payload.spo2Percent ?? null,
        respiratory_rate: payload.respiratoryRate ?? null,
        flights_climbed: payload.flightsClimbed ?? null,
        vo2_max: payload.vo2Max ?? null,
        total_workouts: workouts.length,
        total_distance_meters: totalDistance,
        has_workout: workouts.length > 0,
        source: 'healthkit',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,date' },
    )

    if (summaryErr) {
      console.error('[sync-healthkit] daily_summaries upsert error:', summaryErr)
      return json({ error: summaryErr.message }, 500)
    }
    syncedTypes.push('daily_summaries')

    // 2. sleep_logs
    if (sleepHours != null && Number(sleepHours) > 0) {
      const { error: sleepErr } = await supabase.from('sleep_logs').upsert(
        {
          user_id: user.id,
          date: today,
          total_sleep_hours: sleepHours,
          deep_sleep_hours: deepSleepHours,
          rem_sleep_hours: remSleepHours,
          light_sleep_hours: lightSleepHours,
          wake_ups: wakeUps ?? 0,
          source: 'healthkit_sync',
        },
        { onConflict: 'user_id,date' },
      )

      if (sleepErr) {
        // 若无 unique 约束，降级为先查再插/更
        console.warn('[sync-healthkit] sleep upsert failed, fallback:', sleepErr.message)
        const { data: existing } = await supabase
          .from('sleep_logs')
          .select('id')
          .eq('user_id', user.id)
          .eq('date', today)
          .is('deleted_at', null)
          .maybeSingle()

        if (existing?.id) {
          await supabase
            .from('sleep_logs')
            .update({
              total_sleep_hours: sleepHours,
              deep_sleep_hours: deepSleepHours,
              rem_sleep_hours: remSleepHours,
              light_sleep_hours: lightSleepHours,
              wake_ups: wakeUps ?? 0,
              source: 'healthkit_sync',
            })
            .eq('id', existing.id)
        } else {
          await supabase.from('sleep_logs').insert({
            user_id: user.id,
            date: today,
            total_sleep_hours: sleepHours,
            deep_sleep_hours: deepSleepHours,
            rem_sleep_hours: remSleepHours,
            light_sleep_hours: lightSleepHours,
            wake_ups: wakeUps ?? 0,
            source: 'healthkit_sync',
          })
        }
      }
      syncedTypes.push('sleep_logs')
    }

    // 3. workout_logs
    if (workouts.length > 0) {
      const workoutRows = workouts.map((w) => ({
        user_id: user.id,
        date: today,
        workout_id: w.id,
        workout_type: w.workoutType,
        workout_name: w.workoutType,
        workout_type_id: w.workoutTypeId,
        started_at: toIsoDateTime(w.startDate),
        ended_at: toIsoDateTime(w.endDate),
        duration_minutes: Math.round(w.duration),
        calories_burned: w.calories ?? null,
        distance_meters: w.distance != null ? Math.round(w.distance) : null,
        distance_km: w.distanceKm ?? null,
        source: 'healthkit_sync',
      }))

      const { error: workoutErr } = await supabase
        .from('workout_logs')
        .upsert(workoutRows, { onConflict: 'user_id,workout_id' })

      if (workoutErr) {
        console.warn('[sync-healthkit] workout upsert failed, insert one-by-one:', workoutErr.message)
        for (const row of workoutRows) {
          const { data: existing } = await supabase
            .from('workout_logs')
            .select('id')
            .eq('user_id', user.id)
            .eq('workout_id', row.workout_id)
            .is('deleted_at', null)
            .maybeSingle()

          if (existing?.id) {
            await supabase.from('workout_logs').update(row).eq('id', existing.id)
          } else {
            await supabase.from('workout_logs').insert(row)
          }
        }
      }
      syncedTypes.push('workout_logs')
    }

    // 4. sync_logs
    const recordCount =
      1 + (syncedTypes.includes('sleep_logs') ? 1 : 0) + workouts.length

    const { error: syncLogErr } = await supabase.from('sync_logs').insert({
      user_id: user.id,
      sync_date: today,
      source: 'healthkit',
      status: 'success',
      record_count: recordCount,
      synced_types: syncedTypes,
      synced_at: new Date().toISOString(),
    })

    if (syncLogErr) {
      console.warn('[sync-healthkit] sync_logs insert skipped:', syncLogErr.message)
    }

    return json({
      success: true,
      date: today,
      workouts_count: workouts.length,
      total_distance_m: totalDistance,
      synced_types: syncedTypes,
    })
  } catch (error) {
    console.error('[sync-healthkit] unexpected error:', error)
    const message = error instanceof Error ? error.message : 'Internal error'
    return json({ error: message }, 500)
  }
})

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
